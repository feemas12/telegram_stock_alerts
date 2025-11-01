-- ============================================
-- Telegram Stock Alert Bot - Database Schema
-- Database: MySQL 5.7+ / 8.0+
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS telegram_stock_bot 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Use Database
USE telegram_stock_bot;

-- ============================================
-- Table: users
-- Description: Stores Telegram user information
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'User ID',
    telegram_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'Telegram user ID',
    username VARCHAR(255) DEFAULT NULL COMMENT 'Telegram username',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    INDEX idx_telegram_id (telegram_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Telegram users table';

-- ============================================
-- Table: portfolio
-- Description: Stores user stock portfolio
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Portfolio entry ID',
    user_id INT NOT NULL COMMENT 'Foreign key to users.id',
    symbol VARCHAR(20) NOT NULL COMMENT 'Stock symbol (e.g., AAPL, TSLA)',
    buy_price DECIMAL(10, 2) NOT NULL COMMENT 'Price at which stock was purchased',
    qty DECIMAL(10, 4) NOT NULL COMMENT 'Quantity of shares',
    type VARCHAR(20) DEFAULT 'stock' COMMENT 'Asset type: stock or fund',
    last_notified DECIMAL(10, 2) DEFAULT NULL COMMENT 'Last alert price to prevent spam',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    -- Foreign Key Constraint
    CONSTRAINT fk_portfolio_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Unique Constraint: One user can't have duplicate symbols
    CONSTRAINT unique_user_symbol 
        UNIQUE KEY (user_id, symbol),
    
    -- Indexes for better query performance
    INDEX idx_user_id (user_id),
    INDEX idx_symbol (symbol),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User stock portfolio table';

-- ============================================
-- Sample Data (Optional - Remove if not needed)
-- ============================================

-- Uncomment below to insert sample data for testing

/*
-- Sample User
INSERT INTO users (telegram_id, username) VALUES 
('123456789', 'demo_user');

-- Sample Portfolio
INSERT INTO portfolio (user_id, symbol, buy_price, qty, type) VALUES 
(1, 'AAPL', 180.50, 10.0000, 'stock'),
(1, 'TSLA', 250.00, 5.0000, 'stock'),
(1, 'GOOGL', 140.25, 8.0000, 'stock');
*/

-- ============================================
-- Useful Queries
-- ============================================

-- View all users
-- SELECT * FROM users;

-- View all portfolio entries
-- SELECT * FROM portfolio;

-- View portfolio with user information
-- SELECT u.username, p.symbol, p.buy_price, p.qty, p.type, p.created_at
-- FROM portfolio p
-- JOIN users u ON p.user_id = u.id
-- ORDER BY u.username, p.symbol;

-- Check database size
-- SELECT 
--     table_name AS 'Table',
--     ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
-- FROM information_schema.tables
-- WHERE table_schema = 'telegram_stock_bot'
-- ORDER BY (data_length + index_length) DESC;

-- ============================================
-- End of Schema
-- ============================================
