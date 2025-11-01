# 🔄 Migration Guide: SQLite to MySQL

This guide helps you migrate from the SQLite version to MySQL.

## Why MySQL?

- ✅ Better scalability for multiple users
- ✅ Connection pooling for better performance
- ✅ More robust for production deployments
- ✅ Better concurrent access handling
- ✅ Advanced features like CASCADE deletes

## Prerequisites

- MySQL Server 5.7+ or 8.0+ installed
- Access to your existing SQLite database (if migrating data)

## Step 1: Install MySQL

### macOS
```bash
brew install mysql
brew services start mysql
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Windows
Download and install from [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)

## Step 2: Create MySQL Database

```bash
mysql -u root -p
```

Then run:
```sql
CREATE DATABASE telegram_stock_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

## Step 3: Update Dependencies

```bash
npm uninstall sqlite3
npm install mysql2
```

## Step 4: Update Environment Variables

Add to your `.env` file:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=telegram_stock_bot
```

## Step 5: Migrate Existing Data (Optional)

If you have existing data in SQLite that you want to migrate:

### Export from SQLite

```bash
sqlite3 stock_bot.db .dump > backup.sql
```

### Convert SQLite dump to MySQL format

Create a script `convert.sh`:

```bash
#!/bin/bash
cat backup.sql | \
sed 's/INTEGER PRIMARY KEY AUTOINCREMENT/INT AUTO_INCREMENT PRIMARY KEY/g' | \
sed 's/TEXT/VARCHAR(255)/g' | \
sed 's/REAL/DECIMAL(10,2)/g' > mysql_backup.sql
```

Run:
```bash
chmod +x convert.sh
./convert.sh
```

### Import to MySQL

```bash
mysql -u root -p telegram_stock_bot < mysql_backup.sql
```

**Note:** Manual adjustments might be needed depending on your data.

## Step 6: Test the Migration

1. Start the bot:
   ```bash
   npm start
   ```

2. Verify database connection:
   - You should see: `✅ Database initialized successfully`

3. Test commands:
   ```
   /start
   /add AAPL 180.5 10
   /portfolio
   /check AAPL
   ```

4. Verify data:
   ```bash
   mysql -u root -p telegram_stock_bot
   ```
   ```sql
   SELECT * FROM users;
   SELECT * FROM portfolio;
   ```

## Differences Between SQLite and MySQL Versions

### Database Schema Changes

| Feature | SQLite | MySQL |
|---------|--------|-------|
| ID Type | INTEGER AUTOINCREMENT | INT AUTO_INCREMENT |
| Text Fields | TEXT | VARCHAR(255) |
| Numbers | REAL | DECIMAL(10,2) |
| Timestamps | Not used | TIMESTAMP with AUTO_UPDATE |
| Foreign Keys | Basic | CASCADE DELETE support |

### Code Changes

**Connection Management:**
- SQLite: Single file-based connection
- MySQL: Connection pooling for better performance

**Graceful Shutdown:**
- MySQL version properly closes connection pool on exit

**Data Types:**
- More precise DECIMAL types for money values
- VARCHAR with proper length limits
- Automatic timestamps for audit trail

## Rollback (If Needed)

If you need to go back to SQLite:

1. Reinstall SQLite:
   ```bash
   npm uninstall mysql2
   npm install sqlite3@^5.1.6
   ```

2. Restore the original `db.js` from version control

3. Remove MySQL config from `.env`

## Troubleshooting

### "Access denied for user"
```bash
mysql -u root -p
```
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### "Can't connect to MySQL server"
- Check MySQL is running: `sudo systemctl status mysql`
- Verify host in `.env` (use `localhost` or `127.0.0.1`)

### "Table doesn't exist"
- The bot auto-creates tables on first run
- Or manually run the CREATE TABLE commands from `db.js`

### Connection pool errors
- Check `connectionLimit` in `db.js`
- Ensure MySQL `max_connections` is sufficient:
  ```sql
  SHOW VARIABLES LIKE 'max_connections';
  SET GLOBAL max_connections = 200;
  ```

## Performance Tips

### Optimize MySQL Configuration

Edit `/etc/mysql/my.cnf` (Linux) or `my.ini` (Windows):

```ini
[mysqld]
max_connections = 200
innodb_buffer_pool_size = 256M
query_cache_size = 32M
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

### Monitor Performance

```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Check table sizes
SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'telegram_stock_bot';

-- Add indexes if needed
CREATE INDEX idx_user_telegram ON users(telegram_id);
CREATE INDEX idx_portfolio_symbol ON portfolio(symbol);
```

## Backup Strategy

### Automated Daily Backups

Create a backup script `backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p telegram_stock_bot > "backup_${DATE}.sql"
# Keep only last 7 days
find . -name "backup_*.sql" -mtime +7 -delete
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Security Recommendations

1. **Don't use root user in production:**
   ```sql
   CREATE USER 'telegram_bot'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON telegram_stock_bot.* TO 'telegram_bot'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Update .env:**
   ```env
   DB_USER=telegram_bot
   DB_PASSWORD=strong_password
   ```

3. **Restrict network access:**
   - Only allow localhost connections
   - Use firewall rules for production

## Production Deployment

For production, consider:

1. **Use environment-specific configs**
2. **Enable SSL connections**
3. **Set up replication for high availability**
4. **Monitor with tools like MySQL Workbench**
5. **Regular backups to cloud storage**

## Support

- Check MySQL logs: `/var/log/mysql/error.log`
- Bot logs show connection status
- Test connection separately before running bot

---

✅ **Migration complete!** Your bot now uses MySQL for better scalability and performance.
