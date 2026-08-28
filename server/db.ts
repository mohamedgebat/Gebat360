import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gebat_360_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connecté avec succès à la base de données MySQL gebat_360_db');
    connection.release();
  } catch (error) {
    console.warn('⚠️ Impossible de se connecter directement à MySQL (Vérifier si le serveur MySQL local est démarré sur le port 3306):', error.message);
  }
}
