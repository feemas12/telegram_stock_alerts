-- ============================================
-- Sample Data for Testing
-- ============================================

USE telegram_stock_bot;

-- Clear existing data (optional)
-- DELETE FROM portfolio;
-- DELETE FROM users;

-- Insert Sample Users
INSERT INTO users (telegram_id, username) VALUES 
('123456789', 'demo_user_1'),
('987654321', 'demo_user_2'),
('555555555', 'stock_trader');

-- Insert Sample Portfolio Data
INSERT INTO portfolio (user_id, symbol, buy_price, qty, type) VALUES 
-- User 1's Portfolio
(1, 'AAPL', 180.50, 10.0000, 'stock'),
(1, 'TSLA', 250.00, 5.0000, 'stock'),
(1, 'GOOGL', 140.25, 8.0000, 'stock'),
(1, 'MSFT', 380.75, 15.0000, 'stock'),

-- User 2's Portfolio
(2, 'AAPL', 175.00, 20.0000, 'stock'),
(2, 'NVDA', 450.00, 12.0000, 'stock'),
(2, 'AMD', 120.50, 25.0000, 'stock'),

-- User 3's Portfolio
(3, 'TSLA', 240.00, 8.0000, 'stock'),
(3, 'META', 320.00, 10.0000, 'stock'),
(3, 'AMZN', 145.00, 6.0000, 'stock');

-- Verify Data
SELECT 
    u.username,
    p.symbol,
    p.buy_price,
    p.qty,
    ROUND(p.buy_price * p.qty, 2) AS total_value,
    p.type,
    p.created_at
FROM portfolio p
JOIN users u ON p.user_id = u.id
ORDER BY u.username, p.symbol;
