-- ============================================
-- Useful SQL Queries for Telegram Stock Bot
-- ============================================

USE telegram_stock_bot;

-- ============================================
-- 1. View All Data
-- ============================================

-- All users
SELECT * FROM users;

-- All portfolio entries
SELECT * FROM portfolio;

-- ============================================
-- 2. Portfolio Summary
-- ============================================

-- Portfolio with user info
SELECT 
    u.id AS user_id,
    u.username,
    u.telegram_id,
    p.symbol,
    p.buy_price,
    p.qty,
    ROUND(p.buy_price * p.qty, 2) AS total_invested,
    p.type,
    p.last_notified,
    p.created_at
FROM portfolio p
JOIN users u ON p.user_id = u.id
ORDER BY u.username, p.symbol;

-- Portfolio grouped by user
SELECT 
    u.username,
    COUNT(p.id) AS total_stocks,
    SUM(p.buy_price * p.qty) AS total_portfolio_value
FROM users u
LEFT JOIN portfolio p ON u.id = p.user_id
GROUP BY u.id, u.username
ORDER BY total_portfolio_value DESC;

-- ============================================
-- 3. Stock Analysis
-- ============================================

-- Most popular stocks
SELECT 
    symbol,
    COUNT(*) AS holders,
    SUM(qty) AS total_quantity,
    AVG(buy_price) AS avg_buy_price,
    SUM(buy_price * qty) AS total_value
FROM portfolio
GROUP BY symbol
ORDER BY holders DESC, total_value DESC;

-- Stocks by type
SELECT 
    type,
    COUNT(*) AS count,
    SUM(buy_price * qty) AS total_value
FROM portfolio
GROUP BY type;

-- ============================================
-- 4. User Statistics
-- ============================================

-- Total users
SELECT COUNT(*) AS total_users FROM users;

-- Users with portfolios
SELECT COUNT(DISTINCT user_id) AS active_users FROM portfolio;

-- Users without portfolios
SELECT 
    u.id,
    u.username,
    u.telegram_id,
    u.created_at
FROM users u
LEFT JOIN portfolio p ON u.id = p.user_id
WHERE p.id IS NULL;

-- ============================================
-- 5. Alert History
-- ============================================

-- Stocks with recent alerts
SELECT 
    u.username,
    p.symbol,
    p.buy_price,
    p.last_notified,
    ROUND(((p.last_notified - p.buy_price) / p.buy_price) * 100, 2) AS change_percent
FROM portfolio p
JOIN users u ON p.user_id = u.id
WHERE p.last_notified IS NOT NULL
ORDER BY p.updated_at DESC;

-- Stocks needing alerts (assuming 5% threshold)
SELECT 
    u.telegram_id,
    p.symbol,
    p.buy_price,
    p.last_notified,
    -- You would compare with current price from API
    'Check API for current price' AS note
FROM portfolio p
JOIN users u ON p.user_id = u.id;

-- ============================================
-- 6. Database Maintenance
-- ============================================

-- Check table sizes
SELECT 
    table_name AS 'Table',
    table_rows AS 'Rows',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    ROUND((data_length / 1024 / 1024), 2) AS 'Data (MB)',
    ROUND((index_length / 1024 / 1024), 2) AS 'Index (MB)'
FROM information_schema.tables
WHERE table_schema = 'telegram_stock_bot'
ORDER BY (data_length + index_length) DESC;

-- Check indexes
SELECT 
    table_name,
    index_name,
    non_unique,
    GROUP_CONCAT(column_name ORDER BY seq_in_index) AS columns
FROM information_schema.statistics
WHERE table_schema = 'telegram_stock_bot'
GROUP BY table_name, index_name, non_unique
ORDER BY table_name, index_name;

-- ============================================
-- 7. Data Cleanup
-- ============================================

-- Find duplicate entries (should not exist due to unique constraint)
SELECT 
    user_id,
    symbol,
    COUNT(*) AS duplicates
FROM portfolio
GROUP BY user_id, symbol
HAVING COUNT(*) > 1;

-- Remove old users (created > 1 year ago, no portfolio)
-- CAUTION: Uncomment only if you want to delete
/*
DELETE u FROM users u
LEFT JOIN portfolio p ON u.id = p.user_id
WHERE p.id IS NULL 
AND u.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
*/

-- ============================================
-- 8. Performance Queries
-- ============================================

-- Explain query performance
EXPLAIN SELECT 
    u.username,
    p.symbol,
    p.buy_price,
    p.qty
FROM portfolio p
JOIN users u ON p.user_id = u.id
WHERE u.telegram_id = '123456789';

-- Check slow queries (requires slow_query_log enabled)
-- SHOW VARIABLES LIKE 'slow_query%';

-- ============================================
-- 9. Backup and Export
-- ============================================

-- Export users to CSV (run in terminal)
-- SELECT * FROM users INTO OUTFILE '/tmp/users_backup.csv'
-- FIELDS TERMINATED BY ',' ENCLOSED BY '"'
-- LINES TERMINATED BY '\n';

-- ============================================
-- 10. Testing Queries
-- ============================================

-- Add test user
INSERT INTO users (telegram_id, username) VALUES 
('TEST_USER_ID', 'test_user');

-- Add test portfolio
INSERT INTO portfolio (user_id, symbol, buy_price, qty) VALUES 
(LAST_INSERT_ID(), 'AAPL', 100.00, 1.0);

-- Clean up test data
DELETE FROM portfolio WHERE user_id IN (
    SELECT id FROM users WHERE telegram_id = 'TEST_USER_ID'
);
DELETE FROM users WHERE telegram_id = 'TEST_USER_ID';

-- ============================================
-- End of Queries
-- ============================================
