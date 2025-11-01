-- ============================================
-- Drop Tables Script
-- Use this to reset the database
-- WARNING: This will DELETE ALL DATA!
-- ============================================

USE telegram_stock_bot;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables
DROP TABLE IF EXISTS portfolio;
DROP TABLE IF EXISTS users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- After running this, you can run schema.sql
-- to recreate the tables
-- ============================================
