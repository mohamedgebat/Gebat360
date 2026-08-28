import mysql from 'mysql2/promise';

async function purgeDatabase() {
  console.log('🧹 Purge des données métier dans la base MySQL gebat_360_db...');

  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gebat_360_db',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Vider toutes les données opérationnelles et métiers
    console.log('  • Purge de la table wbs_nodes...');
    await connection.query('TRUNCATE TABLE wbs_nodes');

    console.log('  • Purge de la table projects...');
    await connection.query('TRUNCATE TABLE projects');

    console.log('  • Purge de la table stock_movements...');
    await connection.query('TRUNCATE TABLE stock_movements');

    console.log('  • Purge de la table stock_items...');
    await connection.query('TRUNCATE TABLE stock_items');

    console.log('  • Purge de la table purchase_orders...');
    await connection.query('TRUNCATE TABLE purchase_orders');

    console.log('  • Purge de la table purchase_requests...');
    await connection.query('TRUNCATE TABLE purchase_requests');

    console.log('  • Purge de la table goods_receipts...');
    await connection.query('TRUNCATE TABLE goods_receipts');

    console.log('  • Purge de la table daily_reports...');
    await connection.query('TRUNCATE TABLE daily_reports');

    console.log('  • Purge de la table system_alerts...');
    await connection.query('TRUNCATE TABLE system_alerts');

    console.log('  • Purge de la table project_risks...');
    await connection.query('TRUNCATE TABLE project_risks');

    console.log('  • Purge de la table audit_logs...');
    await connection.query('TRUNCATE TABLE audit_logs');

    console.log('  • Purge de la table login_attempts...');
    await connection.query('TRUNCATE TABLE login_attempts');

    // Conserver uniquement les 3 comptes demandés (Admin, DG, Directeur Projet)
    console.log('  • Conservation exclusive des comptes Admin, DG, et Directeur Projet...');
    await connection.query(
      "DELETE FROM users WHERE id NOT IN ('USR-001', 'USR-002', 'USR-005')"
    );

    // Mettre à jour user_sites pour ré-associer les 3 comptes conservés à tous les sites
    console.log('  • Mise à jour des autorisations de sites...');
    await connection.query('TRUNCATE TABLE user_sites');
    await connection.query(`
      INSERT INTO user_sites (user_id, site_id) VALUES
      ('USR-001', 1), ('USR-001', 2),
      ('USR-002', 1), ('USR-002', 2),
      ('USR-005', 1), ('USR-005', 2)
    `);

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();
    connection.release();

    console.log('==================================================');
    console.log('✨ PURGE COMPLÈTE RÉALISÉE AVEC SUCCÈS !');
    console.log('==================================================');
    console.log('• Projets, WBS, Achats, Stocks, Production & Alertes vidés.');
    console.log('• 3 Comptes Utilisateurs préservés :');
    console.log('   1. Admin : Yacouba Mohamed (y.mohamed@gebat-sa.com)');
    console.log('   2. DG : Kouassi Kouadio (k.kouadio@gebat-sa.com)');
    console.log('   3. Directeur Projet : SEA Alphonse (sea.alphonse@gebat-sa.com)');

  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur lors de la purge :', err);
  } finally {
    await pool.end();
  }
}

purgeDatabase();
