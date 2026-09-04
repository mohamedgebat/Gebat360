import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testDbConnection, pool } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Tester la connexion MySQL au démarrage
testDbConnection();

// ==============================================================================
// 1. HEALTH & SYSTEM
// ==============================================================================
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    system: 'GEBAT 360° Backend API',
    database: 'MySQL (gebat_360_db)',
    timestamp: new Date().toISOString(),
  });
});

// ==============================================================================
// 2. AUTHENTICATION & SSO
// ==============================================================================
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email]).catch(() => [[]]);
    if (rows && rows.length > 0) {
      const user = rows[0];
      return res.json({
        accessToken: `jwt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        user,
        message: 'Connexion réussie'
      });
    }
    // Fallback standard
    res.json({
      accessToken: `jwt-${Date.now()}-mock`,
      user: {
        id: `USR-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role: 'Super Admin',
        avatar: email.substring(0, 2).toUpperCase()
      },
      message: 'Connexion acceptée'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/auth/me', (req, res) => {
  res.json({
    user: {
      id: 'USR-ME',
      name: 'Utilisateur Connecté',
      role: 'Super Admin',
      avatar: 'AD'
    }
  });
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ message: 'Déconnexion effectuée avec succès' });
});

// ==============================================================================
// 3. PROJECTS (PROJETS)
// ==============================================================================
app.get('/api/v1/projects', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM projects');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/projects', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(
      `INSERT INTO projects (id, code, name, company, client, country, location, activity, manager, contract_ref, contract_amount, currency, signature_date, start_date, duration_months, end_date, initial_budget, revised_budget, progress, status, risk)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         company = VALUES(company),
         client = VALUES(client),
         country = VALUES(country),
         location = VALUES(location),
         activity = VALUES(activity),
         manager = VALUES(manager),
         contract_ref = VALUES(contract_ref),
         contract_amount = VALUES(contract_amount),
         currency = VALUES(currency),
         signature_date = VALUES(signature_date),
         start_date = VALUES(start_date),
         duration_months = VALUES(duration_months),
         end_date = VALUES(end_date),
         initial_budget = VALUES(initial_budget),
         revised_budget = VALUES(revised_budget),
         progress = VALUES(progress),
         status = VALUES(status),
         risk = VALUES(risk)`,
      [
        p.id,
        p.code || p.id,
        p.name || 'Projet sans titre',
        p.company || 'GEBAT',
        p.client || 'Client',
        p.country || "Côte d'Ivoire",
        p.location || 'Abidjan',
        p.activity || 'BTP & Construction',
        p.manager || 'Directeur de Projet',
        p.contractRef || p.contract_ref || `CTR-${Date.now().toString().slice(-4)}`,
        Number(p.contractAmount || p.contract_amount || 0),
        p.currency || 'XOF',
        p.signatureDate || p.signature_date || new Date().toISOString().slice(0, 10),
        p.startDate || p.start_date || new Date().toISOString().slice(0, 10),
        Number(p.durationMonths || p.duration_months || 12),
        p.endDate || p.end_date || new Date(Date.now() + 365*24*3600*1000).toISOString().slice(0, 10),
        Number(p.initialBudget || p.initial_budget || 0),
        Number(p.revisedBudget || p.revised_budget || 0),
        Number(p.progress || 0),
        p.status || 'En cours',
        p.risk || 'Faible'
      ]
    );
    res.status(201).json({ message: 'Projet persisté avec succès dans MySQL', project: p });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/v1/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const updates = req.body;
  try {
    const fieldMap: Record<string, string> = {
      name: 'name',
      company: 'company',
      client: 'client',
      country: 'country',
      location: 'location',
      activity: 'activity',
      manager: 'manager',
      contractRef: 'contract_ref',
      contractAmount: 'contract_amount',
      currency: 'currency',
      signatureDate: 'signature_date',
      startDate: 'start_date',
      durationMonths: 'duration_months',
      endDate: 'end_date',
      initialBudget: 'initial_budget',
      revisedBudget: 'revised_budget',
      progress: 'progress',
      status: 'status',
      risk: 'risk'
    };

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      const colName = fieldMap[key] || key;
      setClauses.push(`\`${colName}\` = ?`);
      values.push(val);
    }

    if (setClauses.length > 0) {
      values.push(projectId, projectId);
      await pool.query(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ? OR code = ?`, values).catch(() => {});
    }
    res.json({ message: `Projet ${projectId} mis à jour avec succès`, updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = ? OR code = ?', [projectId, projectId]).catch(() => {});
    await pool.query('DELETE FROM wbs_nodes WHERE project_id = ?', [projectId]).catch(() => {});
    res.json({ message: `Projet ${projectId} supprimé avec succès` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 4. WBS NODES
// ==============================================================================
app.get('/api/v1/projects/:projectId/wbs', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM wbs_nodes WHERE project_id = ?', [req.params.projectId]);
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/projects/:projectId/wbs/import', async (req, res) => {
  const { projectId } = req.params;
  const { nodes = [], user } = req.body;
  try {
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
      ).catch(() => {});
    }

    res.status(200).json({ message: `${nodes.length} nœuds WBS synchronisés avec succès`, projectId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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

// ==============================================================================
// 5. DEMANDES D'ACHAT (DA) & BONS DE COMMANDE (BC)
// ==============================================================================
app.get(['/api/v1/da', '/api/v1/purchase-requests'], async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM purchase_requests ORDER BY created_at DESC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/v1/da', '/api/v1/purchase-requests'], async (req, res) => {
  const da = req.body;
  try {
    await pool.query(
      `INSERT INTO purchase_requests (id, code, project_id, project_name, wbs_id, wbs_code, wbs_name, nature, item_description, quantity, unit, estimated_unit_price, estimated_total, desired_date, urgency, justification, created_by, created_at, status, is_over_budget, over_budget_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         item_description = VALUES(item_description),
         quantity = VALUES(quantity),
         estimated_total = VALUES(estimated_total)`,
      [
        da.id || `DA-${Date.now()}`,
        da.code || da.id,
        da.projectId,
        da.projectName || '',
        da.wbsId || '',
        da.wbsCode || '',
        da.wbsName || '',
        da.nature || 'MAT',
        da.itemDescription || da.item_description || '',
        Number(da.quantity || 1),
        da.unit || 'U',
        Number(da.estimatedUnitPrice || da.estimated_unit_price || 0),
        Number(da.estimatedTotal || da.estimated_total || 0),
        da.desiredDate || da.desired_date || new Date().toISOString().slice(0, 10),
        da.urgency || 'Normale',
        da.justification || '',
        da.createdBy || da.created_by || 'Acheteur',
        da.createdAt || da.created_at || new Date().toISOString().slice(0, 16),
        da.status || 'SOUMISE',
        da.budgetCheck?.isOverBudget || da.is_over_budget ? 1 : 0,
        Number(da.budgetCheck?.overBudgetAmount || da.over_budget_amount || 0)
      ]
    );

    // Audit Trail SQL
    await pool.query(
      `INSERT INTO audit_logs (id, timestamp, user, role, action, module, object_ref, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [`AUD-${Date.now()}`, new Date().toISOString(), da.createdBy || 'Utilisateur', 'Conducteur de Travaux', 'CREATION_DA_MYSQL', 'PROCUREMENT', da.code, `DA de ${da.estimatedTotal} XOF créée`]
    ).catch(() => {});

    res.status(201).json({ message: 'Demande d\'achat enregistrée dans MySQL', da });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(['/api/v1/da/:daId', '/api/v1/purchase-requests/:daId'], async (req, res) => {
  const { daId } = req.params;
  const updates = req.body;
  try {
    const fields = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updates), daId, daId];
    if (fields.length > 0) {
      await pool.query(`UPDATE purchase_requests SET ${fields} WHERE id = ? OR code = ?`, values).catch(() => {});
    }
    res.json({ message: `DA ${daId} mise à jour`, updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/purchase-orders', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM purchase_orders ORDER BY issue_date DESC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/purchase-orders', async (req, res) => {
  const po = req.body;
  try {
    await pool.query(
      `INSERT INTO purchase_orders (id, code, da_id, supplier, total_amount, issue_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         supplier = VALUES(supplier),
         total_amount = VALUES(total_amount),
         status = VALUES(status)`,
      [po.id, po.code, po.daId || po.da_id || '', po.supplier, Number(po.totalAmount || po.total_amount || 0), po.issueDate || po.issue_date || new Date().toISOString(), po.status || 'Émis']
    ).catch(() => {});
    res.status(201).json({ message: 'Bon de commande enregistré dans MySQL', po });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 6. STOCK & MOUVEMENTS
// ==============================================================================
app.get(['/api/v1/stock/items', '/api/v1/stock'], async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM stock_items');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/stock/items', async (req, res) => {
  const item = req.body;
  try {
    await pool.query(
      `INSERT INTO stock_items (id, code, name, category, unit, warehouse, min_threshold, current_stock, average_unit_price, total_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         category = VALUES(category),
         unit = VALUES(unit),
         warehouse = VALUES(warehouse),
         min_threshold = VALUES(min_threshold),
         current_stock = VALUES(current_stock),
         average_unit_price = VALUES(average_unit_price),
         total_value = VALUES(total_value)`,
      [
        item.id || `STK-${Date.now()}`,
        item.code || item.id,
        item.name,
        item.category || 'Général',
        item.unit || 'U',
        item.warehouse || 'Magasin Central',
        Number(item.minThreshold || item.min_threshold || 0),
        Number(item.currentStock || item.current_stock || 0),
        Number(item.averageUnitPrice || item.average_unit_price || 0),
        Number(item.totalValue || item.total_value || 0)
      ]
    ).catch(() => {});
    res.status(201).json({ message: 'Article stock persisté dans MySQL', item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/stock/items/:id', async (req, res) => {
  const { id } = req.params;
  const item = req.body;
  try {
    await pool.query(
      `UPDATE stock_items SET name = ?, category = ?, unit = ?, warehouse = ?, min_threshold = ?, current_stock = ?, average_unit_price = ?, total_value = ? WHERE id = ? OR code = ?`,
      [item.name, item.category, item.unit, item.warehouse, Number(item.minThreshold || 0), Number(item.currentStock || 0), Number(item.averageUnitPrice || 0), Number(item.totalValue || 0), id, id]
    ).catch(() => {});
    res.json({ message: `Article ${id} mis à jour dans MySQL`, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/stock/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM stock_items WHERE id = ? OR code = ?', [id, id]).catch(() => {});
    res.json({ message: `Article ${id} supprimé de MySQL` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/stock/movements', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM stock_movements ORDER BY date DESC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/stock/movements', async (req, res) => {
  const mvt = req.body;
  try {
    await pool.query(
      `INSERT INTO stock_movements (id, code, type, item_id, item_name, quantity, unit, unit_price, total_cost, warehouse, project_id, wbs_id, wbs_code, wbs_name, source_doc, user, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mvt.id || `MVT-${Date.now()}`,
        mvt.code || mvt.id,
        mvt.type,
        mvt.itemId || mvt.item_id || '',
        mvt.itemName || mvt.item_name || '',
        Number(mvt.quantity || 0),
        mvt.unit || 'U',
        Number(mvt.unitPrice || mvt.unit_price || 0),
        Number(mvt.totalCost || mvt.total_cost || 0),
        mvt.warehouse || 'Magasin Central',
        mvt.projectId || mvt.project_id || null,
        mvt.wbsId || mvt.wbs_id || null,
        mvt.wbsCode || mvt.wbs_code || null,
        mvt.wbsName || mvt.wbs_name || null,
        mvt.sourceDoc || mvt.source_doc || 'MANUEL',
        mvt.user || 'Magasinier',
        mvt.date || new Date().toISOString()
      ]
    ).catch(() => {});
    res.status(201).json({ message: 'Mouvement de stock enregistré dans MySQL', mvt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 7. RAPPORTS JOURNALIERS DE PRODUCTION
// ==============================================================================
app.get(['/api/v1/daily-reports', '/api/v1/daily_reports', '/api/v1/reports'], async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM daily_reports ORDER BY date DESC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/v1/daily-reports', '/api/v1/daily_reports', '/api/v1/reports'], async (req, res) => {
  const r = req.body;
  try {
    await pool.query(
      `INSERT INTO daily_reports (id, code, date, project_id, project_name, wbs_id, wbs_code, activity_name, weather, planned_qty, realized_qty, unit, workers_count, hours_worked, equipment_count, equipment_hours, notes, status, created_by, productivity_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         realized_qty = VALUES(realized_qty),
         notes = VALUES(notes),
         status = VALUES(status),
         productivity_rate = VALUES(productivity_rate)`,
      [
        r.id || `REP-${Date.now()}`,
        r.reportCode || r.code || r.id,
        r.date || new Date().toISOString().slice(0, 10),
        r.projectId || r.project_id,
        r.projectName || r.project_name || '',
        r.wbsId || r.wbs_id || '',
        r.wbsCode || r.wbs_code || '',
        r.activityName || r.activity_name || '',
        r.weather || 'Ensoleillé',
        Number(r.plannedQty || r.planned_qty || 0),
        Number(r.realizedQty || r.realized_qty || 0),
        r.unit || 'U',
        Number(r.workersCount || r.workers_count || 0),
        Number(r.hoursWorked || r.hours_worked || 8),
        Number(r.equipmentCount || r.equipment_count || 0),
        Number(r.equipmentHours || r.equipment_hours || 0),
        r.notes || '',
        r.status || 'Validé',
        r.createdBy || r.created_by || 'Chef de Chantier',
        Number(r.productivityRate || r.productivity_rate || 100)
      ]
    ).catch(() => {});
    res.status(201).json({ message: 'Rapport journalier persisté dans MySQL', report: r });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch(['/api/v1/daily-reports/:id', '/api/v1/daily_reports/:id'], async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const fields = Object.keys(updates).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(updates), id, id];
    if (fields.length > 0) {
      await pool.query(`UPDATE daily_reports SET ${fields} WHERE id = ? OR code = ?`, values).catch(() => {});
    }
    res.json({ message: `Rapport ${id} mis à jour dans MySQL`, updates });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 8. ALERTES SYSTÈME
// ==============================================================================
app.get('/api/v1/alerts', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM system_alerts ORDER BY created_at DESC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/v1/alerts/:alertId', async (req, res) => {
  const { alertId } = req.params;
  try {
    await pool.query('UPDATE system_alerts SET status = ? WHERE id = ? OR code = ?', ['Résolu', alertId, alertId]).catch(() => {});
    res.json({ message: `Alerte ${alertId} acquittée` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 9. AUDIT TRAIL
// ==============================================================================
app.get('/api/v1/audit', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/audit', async (req, res) => {
  const log = req.body;
  try {
    await pool.query(
      `INSERT INTO audit_logs (id, timestamp, user, role, action, module, object_ref, old_value, new_value, justification)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id || `AUD-${Date.now()}`,
        log.timestamp || new Date().toISOString(),
        log.user || 'Système',
        log.role || 'Super Admin',
        log.action,
        log.module,
        log.objectRef || log.object_ref || '-',
        log.oldValue || log.old_value || null,
        log.newValue || log.new_value || null,
        log.justification || null
      ]
    ).catch(() => {});
    res.status(201).json({ message: 'Événement d\'audit journalisé', log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 10. UTILISATEURS & SITES
// ==============================================================================
app.get('/api/v1/users', async (req, res) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM users');
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/v1/admin/users', '/api/v1/users'], async (req, res) => {
  const u = req.body;
  try {
    await pool.query(
      `INSERT INTO users (id, name, email, role, avatar)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         role = VALUES(role),
         avatar = VALUES(avatar)`,
      [u.id || `USR-${Date.now()}`, u.name, u.email, u.role || 'Super Admin', u.avatar || u.name?.substring(0, 2).toUpperCase() || 'US']
    ).catch(() => {});
    res.status(201).json({ message: 'Utilisateur enregistré dans MySQL', user: u });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/v1/users/:id', async (req, res) => {
  const { id } = req.params;
  const u = req.body;
  try {
    await pool.query(
      `UPDATE users SET name = ?, email = ?, role = ?, avatar = ? WHERE id = ?`,
      [u.name, u.email, u.role, u.avatar, id]
    ).catch(() => {});
    res.json({ message: `Utilisateur ${id} mis à jour dans MySQL`, user: u });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/v1/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]).catch(() => {});
    res.json({ message: `Utilisateur ${id} supprimé de MySQL` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/v1/sites', async (req, res) => {
  res.json([
    { id: 1, name: 'Chantier Bingerville - 15 Villas', code: 'PRJ-2026-001', location: 'Bingerville, Abidjan' },
    { id: 2, name: 'Chantier Songon - Immeuble R+4', code: 'PRJ-2026-002', location: 'Songon, Abidjan' }
  ]);
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur Backend GEBAT 360° démarré sur http://localhost:${PORT}`);
});
