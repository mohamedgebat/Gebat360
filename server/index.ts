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
  } catch (err) {
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
      [da.id, da.code, da.projectId, da.projectName, da.wbsId, da.wbsCode, da.wbsName, da.nature, da.itemDescription, da.quantity, da.unit, da.estimatedUnitPrice, da.estimatedTotal, da.desiredDate, da.urgency, da.justification, da.createdBy, da.createdAt, da.status, da.budgetCheck.isOverBudget ? 1 : 0, da.budgetCheck.overBudgetAmount]
    );

    // Audit Trail SQL
    await pool.query(
      `INSERT INTO audit_logs (id, timestamp, user, role, action, module, object_ref, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUD-${Date.now()}`, new Date().toISOString(), da.createdBy, 'Chef de Chantier', 'CREATION_DA_MYSQL', 'PROCUREMENT', da.code, `DA de ${da.estimatedTotal} XOF créée`]
    );

    res.status(201).json({ message: 'Demande d\'achat enregistrée dans MySQL', da });
  } catch (err) {
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
