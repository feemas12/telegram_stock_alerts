import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL connection pool
let pool = null;

// Create connection pool
function createPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'telegram_stock_bot',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

// Get database connection
export async function getConnection() {
  const pool = createPool();
  return await pool.getConnection();
}

// Initialize database tables
export async function initDatabase() {
  const connection = await getConnection();
  
  try {
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create portfolio table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        buy_price DECIMAL(10, 2) NOT NULL,
        qty DECIMAL(10, 4) NOT NULL,
        type VARCHAR(20) DEFAULT 'stock',
        last_notified DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_symbol (user_id, symbol)
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// User operations
export async function getOrCreateUser(telegramId, username) {
  const connection = await getConnection();
  
  try {
    // Try to get existing user
    const [rows] = await connection.query(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId]
    );

    if (rows.length > 0) {
      return rows[0];
    }

    // Create new user
    await connection.query(
      'INSERT INTO users (telegram_id, username) VALUES (?, ?)',
      [telegramId, username]
    );

    // Get the created user
    const [newRows] = await connection.query(
      'SELECT * FROM users WHERE telegram_id = ?',
      [telegramId]
    );

    return newRows[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Portfolio operations
export async function addToPortfolio(userId, symbol, buyPrice, qty, type = 'stock') {
  const connection = await getConnection();
  
  try {
    // MySQL doesn't support ON CONFLICT, use INSERT ... ON DUPLICATE KEY UPDATE
    await connection.query(
      `INSERT INTO portfolio (user_id, symbol, buy_price, qty, type) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       buy_price = VALUES(buy_price), 
       qty = qty + VALUES(qty)`,
      [userId, symbol.toUpperCase(), buyPrice, qty, type]
    );
    return true;
  } catch (error) {
    console.error('Error in addToPortfolio:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPortfolio(userId) {
  const connection = await getConnection();
  
  try {
    const [rows] = await connection.query(
      'SELECT * FROM portfolio WHERE user_id = ?',
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Error in getPortfolio:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getStockFromPortfolio(userId, symbol) {
  const connection = await getConnection();
  
  try {
    const [rows] = await connection.query(
      'SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?',
      [userId, symbol.toUpperCase()]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getStockFromPortfolio:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getAllPortfolioStocks() {
  const connection = await getConnection();
  
  try {
    const [rows] = await connection.query(`
      SELECT p.*, u.telegram_id 
      FROM portfolio p 
      JOIN users u ON p.user_id = u.id
    `);
    return rows;
  } catch (error) {
    console.error('Error in getAllPortfolioStocks:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateLastNotified(portfolioId, price) {
  const connection = await getConnection();
  
  try {
    await connection.query(
      'UPDATE portfolio SET last_notified = ? WHERE id = ?',
      [price, portfolioId]
    );
    return true;
  } catch (error) {
    console.error('Error in updateLastNotified:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Close connection pool (for graceful shutdown)
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('✅ Database connection pool closed');
  }
}

export default { getConnection, initDatabase, closeDatabase };
