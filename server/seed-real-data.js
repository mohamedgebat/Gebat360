/**
 * GEBAT 360° ERP — SEEDING DONNÉES RÉELLES BINGERVILLE & SONGON (EXCEL)
 */
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gebat_360_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function seedRealData() {
  console.log('🔄 Connexion à MySQL gebat_360_db pour l\'injection des données réelles...');
  const pool = mysql.createPool(dbConfig);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Déclaration des DDL pour s'assurer que toutes les tables existent
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        location VARCHAR(150),
        city VARCHAR(100),
        region VARCHAR(100),
        status VARCHAR(30) DEFAULT 'ACTIF',
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_sites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        site_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_site (user_id, site_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(100) DEFAULT 'GEBAT SA',
        client VARCHAR(150),
        country VARCHAR(100) DEFAULT 'Côte d’Ivoire',
        location VARCHAR(150),
        activity VARCHAR(150),
        manager VARCHAR(150),
        contract_ref VARCHAR(100),
        contract_amount DECIMAL(15,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'XOF',
        signature_date DATE,
        start_date DATE,
        duration_months INT DEFAULT 18,
        end_date DATE,
        initial_budget DECIMAL(15,2) DEFAULT 0,
        revised_budget DECIMAL(15,2) DEFAULT 0,
        progress DECIMAL(5,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'EN_COURS',
        risk VARCHAR(30) DEFAULT 'FAIBLE',
        site_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS wbs_nodes (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) NOT NULL,
        code VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) DEFAULT 'U',
        planned_qty DECIMAL(15,3) DEFAULT 0,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        initial_budget DECIMAL(15,2) DEFAULT 0,
        revised_budget DECIMAL(15,2) DEFAULT 0,
        committed DECIMAL(15,2) DEFAULT 0,
        actual_cost DECIMAL(15,2) DEFAULT 0,
        forecast DECIMAL(15,2) DEFAULT 0,
        eac DECIMAL(15,2) DEFAULT 0,
        progress DECIMAL(5,2) DEFAULT 0,
        nature VARCHAR(50) DEFAULT 'MAT',
        level VARCHAR(50) DEFAULT 'ACTIVITE',
        parent_id VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        project_id VARCHAR(64) NOT NULL,
        wbs_id VARCHAR(64),
        nature VARCHAR(50),
        item_description TEXT,
        quantity DECIMAL(15,2) DEFAULT 1,
        unit VARCHAR(50),
        estimated_unit_price DECIMAL(15,2) DEFAULT 0,
        estimated_total DECIMAL(15,2) DEFAULT 0,
        desired_date DATE,
        urgency VARCHAR(30) DEFAULT 'NORMALE',
        justification TEXT,
        created_by VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'EN_ATTENTE_VALIDATION'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        da_id VARCHAR(64),
        supplier VARCHAR(150),
        total_amount DECIMAL(15,2) DEFAULT 0,
        issue_date DATE,
        status VARCHAR(50) DEFAULT 'COMMANDÉ'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        po_id VARCHAR(64),
        po_code VARCHAR(50),
        project_id VARCHAR(64),
        wbs_id VARCHAR(64),
        supplier VARCHAR(150),
        receipt_date DATE,
        received_by VARCHAR(150),
        status VARCHAR(50) DEFAULT 'RÉCEPTIONNÉ'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_items (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(20) DEFAULT 'U',
        warehouse VARCHAR(150),
        min_threshold INT DEFAULT 0,
        current_stock INT DEFAULT 0,
        average_unit_price DECIMAL(15,2) DEFAULT 0,
        total_value DECIMAL(15,2) DEFAULT 0,
        site_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        type VARCHAR(30) NOT NULL,
        item_id VARCHAR(64) NOT NULL,
        item_name VARCHAR(255),
        quantity DECIMAL(15,2) DEFAULT 0,
        unit VARCHAR(20),
        unit_price DECIMAL(15,2) DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        warehouse VARCHAR(150),
        project_id VARCHAR(64),
        wbs_id VARCHAR(64),
        source_doc VARCHAR(100),
        user VARCHAR(150),
        date DATE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        date DATE,
        project_id VARCHAR(64),
        wbs_id VARCHAR(64),
        weather VARCHAR(50),
        planned_qty DECIMAL(15,2) DEFAULT 0,
        realized_qty DECIMAL(15,2) DEFAULT 0,
        unit VARCHAR(20),
        workers_count INT DEFAULT 0,
        hours_worked DECIMAL(5,2) DEFAULT 0,
        equipment_count INT DEFAULT 0,
        equipment_hours DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        status VARCHAR(30) DEFAULT 'SOUMIS',
        created_by VARCHAR(150),
        productivity_rate DECIMAL(5,2) DEFAULT 100
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id VARCHAR(64) PRIMARY KEY,
        code VARCHAR(50),
        category VARCHAR(50),
        severity VARCHAR(30),
        project_id VARCHAR(64),
        wbs_id VARCHAR(64),
        title VARCHAR(255),
        message TEXT,
        observed_value DECIMAL(15,2),
        threshold_value DECIMAL(15,2),
        assigned_to_role VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(30) DEFAULT 'Actif'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Purge des anciennes données
    console.log('🧹 Purge des données de test non conformes...');
    await conn.query('DELETE FROM user_sites');
    await conn.query('DELETE FROM wbs_nodes');
    await conn.query('DELETE FROM purchase_requests');
    await conn.query('DELETE FROM purchase_orders');
    await conn.query('DELETE FROM goods_receipts');
    await conn.query('DELETE FROM stock_movements');
    await conn.query('DELETE FROM stock_items');
    await conn.query('DELETE FROM daily_reports');
    await conn.query('DELETE FROM system_alerts');
    await conn.query('DELETE FROM projects');
    await conn.query('DELETE FROM sites');

    // 2. Insertion des 2 SITES RÉELS
    console.log('🏗️ Insertion des 2 SITES RÉELS (Bingerville & Songon)...');
    await conn.query(`
      INSERT INTO sites (id, code, name, description, location, city, region, status) VALUES
      (1, 'SITE-BNG', 'STBV Bingerville', 'Station de Traitement des Boues de Vidange de la ville Abidjan Est (Bingerville)', 'Abidjan Est', 'Bingerville', 'Abidjan', 'ACTIF'),
      (2, 'SITE-SNG', 'STBV Songon', 'Station de Traitement des Boues de Vidange de la ville Abidjan Ouest (Songon)', 'Abidjan Ouest', 'Songon', 'Abidjan', 'ACTIF')
    `);

    // 3. Insertion des 2 PROJETS RÉELS
    console.log('📂 Insertion des 2 PROJETS RÉELS (PAGEMV LOT 1)...');
    await conn.query(`
      INSERT INTO projects (id, code, name, company, client, country, location, activity, manager, contract_ref, contract_amount, currency, signature_date, start_date, duration_months, end_date, initial_budget, revised_budget, progress, status, risk, site_id) VALUES
      ('PRJ-BNG-2026', 'PRJ-BNG-2026', 'STBV Bingerville — Abidjan Est', 'GEBAT SA', 'Ministère de l\\'Assainissement et de la Salubrité (PAGEMV)', 'Côte d’Ivoire', 'Bingerville (Abidjan Est)', 'BAT — Station de Traitement Boues de Vidange', 'SEA Alphonse', 'PAGEMV-LOT1-BNG', 10663874200.00, 'XOF', '2026-01-15', '2026-02-01', 18, '2027-08-01', 5691955610.00, 5691955610.00, 35.0, 'EN_COURS', 'FAIBLE', 1),
      ('PRJ-SNG-2026', 'PRJ-SNG-2026', 'STBV Songon — Abidjan Ouest', 'GEBAT SA', 'Ministère de l\\'Assainissement et de la Salubrité (PAGEMV)', 'Côte d’Ivoire', 'Songon (Abidjan Ouest)', 'BAT — Station de Traitement Boues de Vidange', 'Bakary Koné', 'PAGEMV-LOT1-SNG', 2824832500.00, 'XOF', '2026-01-15', '2026-02-01', 18, '2027-08-01', 776184899.00, 776184899.00, 28.0, 'EN_COURS', 'FAIBLE', 2)
    `);

    // 4. Insertion des habilitations utilisateur (user_sites) pour les 2 sites
    console.log('👥 Configuration des habilitations des 10 utilisateurs réels...');
    const userSiteMappings = [
      { user_id: 'USR-001', site_id: 1 }, { user_id: 'USR-001', site_id: 2 }, // Yacouba Mohamed -> Bingerville + Songon
      { user_id: 'USR-002', site_id: 1 }, { user_id: 'USR-002', site_id: 2 }, // Kouassi Kouadio -> Bingerville + Songon
      { user_id: 'USR-003', site_id: 1 }, { user_id: 'USR-003', site_id: 2 }, // Amina Diallo -> Bingerville + Songon
      { user_id: 'USR-004', site_id: 1 }, { user_id: 'USR-004', site_id: 2 }, // Jean-Marc Traoré -> Bingerville + Songon
      { user_id: 'USR-005', site_id: 1 }, { user_id: 'USR-005', site_id: 2 }, // SEA Alphonse -> Bingerville + Songon
      { user_id: 'USR-006', site_id: 1 },                                     // Yao N’Guessan -> Bingerville
      { user_id: 'USR-007', site_id: 2 },                                     // Bakary Koné -> Songon
      { user_id: 'USR-008', site_id: 1 }, { user_id: 'USR-008', site_id: 2 }, // Moussa Sy -> Bingerville + Songon
      { user_id: 'USR-009', site_id: 1 }, { user_id: 'USR-009', site_id: 2 }, // Fatou Sow -> Bingerville + Songon
      { user_id: 'USR-010', site_id: 1 },                                     // Sékou Camara -> Bingerville
    ];

    for (const m of userSiteMappings) {
      await conn.query('INSERT INTO user_sites (user_id, site_id) VALUES (?, ?)', [m.user_id, m.site_id]);
    }

    // 5. Ingestion des 2 196 nœuds WBS depuis le fichier JSON extrait
    const wbsJsonPath = 'C:/Users/yacouba.mohamed/.gemini/antigravity/brain/2cb27a52-45d8-4f2e-8181-8f18ca6ec543/scratch/extracted_real_wbs.json';
    const wbsRaw = fs.readFileSync(wbsJsonPath, 'utf8');
    const wbsData = JSON.parse(wbsRaw);

    const allWbsNodes = [...wbsData.bingerville, ...wbsData.songon];
    console.log(`📊 Ingestion de ${allWbsNodes.length} lignes WBS réelles dans MySQL...`);

    const wbsInsertQuery = `
      INSERT INTO wbs_nodes (id, project_id, code, name, unit, planned_qty, initial_budget, revised_budget, nature, level, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const n of allWbsNodes) {
      await conn.query(wbsInsertQuery, [
        n.id,
        n.project_id,
        n.code,
        n.name,
        n.unit || 'U',
        n.planned_qty || 1,
        n.initial_budget || 0,
        n.revised_budget || 0,
        n.nature || 'DIV',
        n.level || 'ACTIVITE',
        n.parent_id || null
      ]);
    }
    console.log('✅ Ingestion des 2 196 nœuds WBS effectuée avec succès !');

    // 6. Ingestion des données d'articles en stock réels pour Bingerville et Songon
    console.log('📦 Création des articles de stock pour Bingerville & Songon...');
    const initialStocks = [
      { id: 'STK-BNG-001', code: 'ART-BNG-CIM', name: 'Ciment CPJ 42.5 (Sacs 50kg)', category: 'Matériaux', unit: 'sac', warehouse: 'Magasin Bingerville', minThreshold: 100, currentStock: 850, price: 4500, siteId: 1 },
      { id: 'STK-BNG-002', code: 'ART-BNG-FER12', name: 'Fer à Béton Haute Adhérence HA 12mm', category: 'Matériaux', unit: 'barre', warehouse: 'Magasin Bingerville', minThreshold: 50, currentStock: 420, price: 6800, siteId: 1 },
      { id: 'STK-BNG-003', code: 'ART-BNG-CARB', name: 'Carburant Gazole Engins & Toupies', category: 'Matériel', unit: 'L', warehouse: 'Citerne Bingerville', minThreshold: 1000, currentStock: 4500, price: 750, siteId: 1 },

      { id: 'STK-SNG-001', code: 'ART-SNG-CIM', name: 'Ciment CPJ 42.5 (Sacs 50kg)', category: 'Matériaux', unit: 'sac', warehouse: 'Magasin Songon', minThreshold: 100, currentStock: 600, price: 4500, siteId: 2 },
      { id: 'STK-SNG-002', code: 'ART-SNG-PVC300', name: 'Tuyau PVC DN 300mm Assainissement', category: 'Matériaux', unit: 'm', warehouse: 'Stock Plein Air Songon', minThreshold: 30, currentStock: 180, price: 14500, siteId: 2 },
      { id: 'STK-SNG-003', code: 'ART-SNG-CARB', name: 'Carburant Gazole Engins Chantier', category: 'Matériel', unit: 'L', warehouse: 'Citerne Songon', minThreshold: 800, currentStock: 3200, price: 750, siteId: 2 },
    ];

    for (const item of initialStocks) {
      await conn.query(`
        INSERT INTO stock_items (id, code, name, category, unit, warehouse, min_threshold, current_stock, average_unit_price, total_value, site_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.code, item.name, item.category, item.unit, item.warehouse, item.minThreshold, item.currentStock, item.price, item.currentStock * item.price, item.siteId]);
    }
    console.log('✅ Stock initialisé avec succès.');

    await conn.commit();
    console.log('\n🎉 INITIALISATION ET MIGRATION DES DONNÉES RÉELLES TERMINÉE AVEC SUCCÈS !');
    conn.release();
    process.exit(0);
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('❌ ERREUR lors de l\'injection des données réelles:', err);
    process.exit(1);
  }
}

seedRealData();
