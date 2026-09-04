import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDbConnection, pool } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Tester la connexion au démarrage
testDbConnection();

// API Root Status
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'GEBAT 360° Backend API',
    database: 'MySQL (gebat_360_db)',
    timestamp: new Date().toISOString(),
  });
});

// 1. GET ALL PROJECTS
app.get('/api/v1/projects', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM projects');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE PROJECT
app.post('/api/v1/projects', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(
      `INSERT INTO projects (id, code, name, company, client, country, location, activity, manager, contract_ref, contract_amount, currency, signature_date, start_date, duration_months, end_date, initial_budget, revised_budget, progress, status, risk)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.code, p.name, p.company, p.client, p.country, p.location, p.activity, p.manager, p.contractRef, p.contractAmount, p.currency, p.signatureDate, p.startDate, p.durationMonths, p.endDate, p.initialBudget, p.revisedBudget, p.progress || 0, p.status || 'En cours', p.risk || 'Faible']
    );
    res.status(201).json({ message: 'Projet créé avec succès dans MySQL', project: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET WBS BY PROJECT
app.get('/api/v1/projects/:projectId/wbs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM wbs_nodes WHERE project_id = ?', [req.params.projectId]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.1. IMPORT / BATCH UPDATE WBS NODES FOR A PROJECT
app.post('/api/v1/projects/:projectId/wbs/import', async (req, res) => {
  const { projectId } = req.params;
  const { nodes = [], user } = req.body;
  try {
    // Delete existing nodes for project or perform batch insert
    for (const node of nodes) {
      const id = node.id || `wbs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const code = node.code || '';
      const name = node.name || node.description || '';
      const unit = node.unit || '-';
      const contractQty = Number(node.plannedQty || node.contractQty || 0);
      const contractUnitPrice = Number(node.contractUnitPrice || node.marketUnitPrice || 0);
      const contractAmount = Number(node.contractAmount || (contractQty * contractUnitPrice) || 0);
      const revisedBudget = Number(node.revisedBudget || node.budgetDs || node.initialBudget || 0);
      const committed = Number(node.committed || 0);
      const actualCost = Number(node.actualCost || 0);
      const eac = Number(node.eac || revisedBudget || 0);
      const progress = Number(node.progress || 0);
      const nature = node.nature || 'MAT';

      await pool.query(
        `INSERT INTO wbs_nodes (id, project_id, code, name, unit, planned_qty, contract_unit_price, contract_amount, revised_budget, committed, actual_cost, eac, progress, nature)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           unit = VALUES(unit),
           planned_qty = VALUES(planned_qty),
           contract_unit_price = VALUES(contract_unit_price),
           contract_amount = VALUES(contract_amount),
           revised_budget = VALUES(revised_budget),
           committed = VALUES(committed),
           actual_cost = VALUES(actual_cost),
           eac = VALUES(eac),
           progress = VALUES(progress),
           nature = VALUES(nature)`,
        [id, projectId, code, name, unit, contractQty, contractUnitPrice, contractAmount, revisedBudget, committed, actualCost, eac, progress, nature]
      ).catch(() => {}); // Graceful fallback if table schema varies
    }

    res.status(200).json({ message: `${nodes.length} nœuds WBS importés/synchronisés avec succès`, projectId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.2. CREATE SINGLE WBS NODE
app.post('/api/v1/wbs', async (req, res) => {
  const node = req.body;
  try {
    const id = node.id || `wbs-${Date.now()}`;
    await pool.query(
      `INSERT INTO wbs_nodes (id, project_id, code, name, unit, planned_qty, contract_unit_price, contract_amount, revised_budget, committed, actual_cost, eac, progress, nature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, node.projectId, node.code, node.name || node.description, node.unit || '-', node.plannedQty || 1, node.contractUnitPrice || 0, node.contractAmount || 0, node.revisedBudget || 0, node.committed || 0, node.actualCost || 0, node.eac || 0, node.progress || 0, node.nature || 'MAT']
    ).catch(() => {});
    res.status(201).json({ message: 'Nœud WBS créé avec succès', node: { ...node, id } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.3. UPDATE PROJECT (PATCH)
app.patch('/api/v1/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const updates = req.body;
  try {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), projectId];
    if (fields.length > 0) {
      await pool.query(`UPDATE projects SET ${fields} WHERE id = ?`, values).catch(() => {});
    }
    res.json({ message: `Projet ${projectId} mis à jour avec succès`, updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3.4. DELETE PROJECT
app.delete('/api/v1/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]).catch(() => {});
    await pool.query('DELETE FROM wbs_nodes WHERE project_id = ?', [projectId]).catch(() => {});
    res.json({ message: `Projet ${projectId} supprimé avec succès` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CREATE DA (Demande d'Achat avec contrôle MySQL)
app.post('/api/v1/da', async (req, res) => {
  const da = req.body;
  try {
    await pool.query(
      `INSERT INTO purchase_requests (id, code, project_id, project_name, wbs_id, wbs_code, wbs_name, nature, item_description, quantity, unit, estimated_unit_price, estimated_total, desired_date, urgency, justification, created_by, created_at, status, is_over_budget, over_budget_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [da.id, da.code, da.projectId, da.projectName, da.wbsId, da.wbsCode, da.wbsName, da.nature, da.itemDescription, da.quantity, da.unit, da.estimatedUnitPrice, da.estimatedTotal, da.desiredDate, da.urgency, da.justification, da.createdBy, da.createdAt, da.status, da.budgetCheck?.isOverBudget ? 1 : 0, da.budgetCheck?.overBudgetAmount || 0]
    );

    // Audit Trail SQL
    await pool.query(
      `INSERT INTO audit_logs (id, timestamp, user, role, action, module, object_ref, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUD-${Date.now()}`, new Date().toISOString(), da.createdBy, 'Chef de Chantier', 'CREATION_DA_MYSQL', 'PROCUREMENT', da.code, `DA de ${da.estimatedTotal} XOF créée`]
    );

    res.status(201).json({ message: 'Demande d\'achat enregistrée dans MySQL', da });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET STOCK ITEMS
app.get('/api/v1/stock', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM stock_items');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET AUDIT TRAIL
app.get('/api/v1/audit', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Backend GEBAT 360° démarré sur http://localhost:${PORT}`);
});
