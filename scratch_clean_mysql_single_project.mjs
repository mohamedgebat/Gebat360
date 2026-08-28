import mysql from 'mysql2/promise';

async function cleanProjectsDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gebat_360_db',
    port: 3306
  });

  try {
    console.log('🧹 Nettoyage de la base MySQL pour ne garder QUE CIV-2026-ASS-SON-001...');

    const [columns] = await connection.query("DESCRIBE projects");
    const colNames = columns.map(c => c.Field);
    console.log('Colonnes de la table projects:', colNames);

    // Supprimer tous les projets sauf CIV-2026-ASS-SON-001
    await connection.query("DELETE FROM projects WHERE id != 'CIV-2026-ASS-SON-001' AND code != 'CIV-2026-ASS-SON-001'");

    // Insérer ou mettre à jour le projet unique Songon
    await connection.query(`
      INSERT INTO projects (id, code, name, company, client, country, location, activity, manager, contract_amount, currency, initial_budget, revised_budget, progress, status)
      VALUES (
        'CIV-2026-ASS-SON-001',
        'CIV-2026-ASS-SON-001',
        'Station de traitement des boues de vidange de la ville Abidjan Ouest (Songon)',
        'GEBAT SA',
        'Ministère de l’Hydraulique & Assainissement / ONEP',
        'Côte d’Ivoire',
        'Songon, Abidjan Ouest',
        'Station de Traitement des Boues',
        'SEA Alphonse',
        5000000000,
        'XOF',
        1980000000,
        1980000000,
        3.0,
        'En cours'
      )
      ON DUPLICATE KEY UPDATE
        code = 'CIV-2026-ASS-SON-001',
        name = 'Station de traitement des boues de vidange de la ville Abidjan Ouest (Songon)',
        contract_amount = 5000000000,
        initial_budget = 1980000000,
        revised_budget = 1980000000,
        progress = 3.0,
        status = 'En cours';
    `);

    // Mettre à jour tous les daily_reports pour qu'ils pointent strictement vers CIV-2026-ASS-SON-001
    await connection.query("UPDATE daily_reports SET project_id = 'CIV-2026-ASS-SON-001'");

    const [projects] = await connection.query("SELECT id, code, name FROM projects");
    console.log('✅ Base MySQL nettoyée avec succès. Projets enregistrés (1 unique) :', projects);

  } catch (err) {
    console.error('Erreur lors du nettoyage MySQL:', err.message);
  } finally {
    await connection.end();
  }
}

cleanProjectsDatabase();
