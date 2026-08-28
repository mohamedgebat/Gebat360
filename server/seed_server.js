import fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const songon = JSON.parse(fs.readFileSync('../scratch_prod_songon_parsed.json', 'utf8'));
  const binger = JSON.parse(fs.readFileSync('../scratch_prod_bingerville_parsed.json', 'utf8'));
  const reports = [...songon, ...binger];

  console.log('Seeding ' + reports.length + ' reports from Prod_Songon.xlsx & Prod_Bingerville.xlsx into MySQL database...');
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gebat_360_db',
    });
    console.log('✅ Connected to MySQL database!');
    
    // Seed Projects
    await conn.query(`
      INSERT INTO projects 
      (id, code, name, company, client, country, location, activity, manager, contract_ref, contract_amount, currency, signature_date, start_date, duration_months, end_date, initial_budget, revised_budget, progress, status, risk)
      VALUES 
      ('CIV-2026-ASS-SON-001', 'CIV-2026-ASS-SON-001', 'Station de traitement des boues de vidange de la ville Abidjan Ouest (Songon)', 'GEBAT SA', 'Ministère de l’Hydraulique & Assainissement / ONEP', 'Côte d’Ivoire', 'Songon, Abidjan Ouest', 'Station de Traitement des Boues', 'SEA Alphonse', 'CTR-GEBAT-2026-ASS-SON-001', 2193630462.00, 'XOF', '2026-01-15', '2026-02-01', 18, '2027-07-31', 2100000000.00, 2100000000.00, 3.05, 'EN_COURS', 'Modéré'),
      ('CIV-2026-ASS-BEN-002', 'CIV-2026-ASS-BEN-002', 'Station de traitement des boues de vidange de la ville Abidjan Est commune de Bingerville', 'GEBAT SA', 'Ministère de l’Hydraulique & Assainissement / ONEP', 'Côte d’Ivoire', 'Bingerville, Abidjan Est', 'Station de Traitement des Boues', 'KOUASSI Jean', 'CTR-GEBAT-2026-ASS-BEN-002', 2806369538.00, 'XOF', '2026-01-15', '2026-02-01', 18, '2027-07-31', 2810000000.00, 2810000000.00, 13.02, 'EN_COURS', 'Faible')
      ON DUPLICATE KEY UPDATE 
      contract_amount = VALUES(contract_amount),
      initial_budget = VALUES(initial_budget),
      revised_budget = VALUES(revised_budget),
      progress = VALUES(progress)
    `);
    console.log('✅ Projects seeded in MySQL!');

    await conn.query("DELETE FROM daily_reports");
    let inserted = 0;
    for (const r of reports) {
      await conn.query(
        `INSERT INTO daily_reports 
        (id, code, date, project_id, wbs_id, weather, planned_qty, realized_qty, unit, workers_count, equipment_count, notes, status, created_by, productivity_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id, r.reportCode, r.date, r.projectId, r.wbsCode, r.weather, r.plannedQty, r.realizedQty, r.unit, r.workersCount, r.equipmentCount, r.notes, r.status, 'Conducteur de Travaux', r.productivityRate
        ]
      );
      inserted++;
    }
    console.log('✅ Inserted ' + inserted + ' daily reports into MySQL table!');
    await conn.end();
  } catch (err) {
    console.error('MySQL Notice:', err.message);
  }
}
run();
