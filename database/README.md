# 📊 Database Scripts

SQL scripts สำหรับจัดการ MySQL database ของ Telegram Stock Alert Bot

## 📁 ไฟล์ในโฟลเดอร์นี้

### 1. `schema.sql` (หลัก)
สคริปต์สร้าง database และ tables ทั้งหมด

**วิธีใช้:**
```bash
mysql -u root -p < ../schema.sql
```

หรือใน DBeaver / MySQL Workbench:
1. เปิดไฟล์ `schema.sql`
2. กด Execute (F5)

**สิ่งที่สร้าง:**
- Database: `telegram_stock_bot`
- Table: `users` (เก็บข้อมูลผู้ใช้ Telegram)
- Table: `portfolio` (เก็บข้อมูลหุ้นของผู้ใช้)
- Indexes สำหรับ performance
- Foreign keys และ constraints

---

### 2. `drop_tables.sql`
ลบ tables ทั้งหมด (สำหรับ reset database)

⚠️ **คำเตือน:** จะลบข้อมูลทั้งหมด!

**วิธีใช้:**
```bash
mysql -u root -p telegram_stock_bot < drop_tables.sql
```

---

### 3. `sample_data.sql`
ข้อมูลตัวอย่างสำหรับทดสอบ

**วิธีใช้:**
```bash
mysql -u root -p telegram_stock_bot < sample_data.sql
```

**ข้อมูลที่เพิ่ม:**
- 3 users ตัวอย่าง
- 11 portfolio entries
- หุ้นต่างๆ เช่น AAPL, TSLA, GOOGL

---

### 4. `useful_queries.sql`
คำสั่ง SQL ที่มีประโยชน์สำหรับ query ข้อมูล

**ประกอบด้วย:**
- ดูข้อมูลทั้งหมด
- Portfolio summary
- Stock analysis
- User statistics
- Alert history
- Database maintenance
- Performance queries
- Backup queries

---

## 🚀 Quick Start

### Setup Database ครั้งแรก

```bash
# 1. สร้าง database และ tables
mysql -u root -p < ../schema.sql

# 2. (Optional) เพิ่มข้อมูลตัวอย่าง
mysql -u root -p telegram_stock_bot < sample_data.sql
```

### ใช้กับ DBeaver

1. เชื่อมต่อกับ MySQL server
2. Import schema:
   - Right click → Execute SQL Script
   - เลือกไฟล์ `schema.sql`
   - กด Execute

3. (Optional) Import sample data:
   - Execute `sample_data.sql`

### ใช้กับ MySQL Workbench

1. เปิด MySQL Workbench
2. เชื่อมต่อกับ server
3. File → Run SQL Script
4. เลือก `schema.sql`
5. กด Run

---

## 📋 Database Schema

### Table: users
```sql
- id (INT, PK, AUTO_INCREMENT)
- telegram_id (VARCHAR(255), UNIQUE)
- username (VARCHAR(255))
- created_at (TIMESTAMP)
```

### Table: portfolio
```sql
- id (INT, PK, AUTO_INCREMENT)
- user_id (INT, FK -> users.id)
- symbol (VARCHAR(20))
- buy_price (DECIMAL(10,2))
- qty (DECIMAL(10,4))
- type (VARCHAR(20))
- last_notified (DECIMAL(10,2))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🔧 การใช้งาน

### ดูข้อมูลทั้งหมด
```sql
USE telegram_stock_bot;

-- All users
SELECT * FROM users;

-- All portfolios with user info
SELECT u.username, p.symbol, p.buy_price, p.qty
FROM portfolio p
JOIN users u ON p.user_id = u.id;
```

### Reset Database
```bash
# ลบ tables
mysql -u root -p telegram_stock_bot < drop_tables.sql

# สร้างใหม่
mysql -u root -p < ../schema.sql
```

### Backup Database
```bash
# Export ทั้ง database
mysqldump -u root -p telegram_stock_bot > backup_$(date +%Y%m%d).sql

# Restore
mysql -u root -p telegram_stock_bot < backup_20241101.sql
```

---

## 💡 Tips

### 1. ตรวจสอบว่า database สร้างสำเร็จ
```sql
SHOW DATABASES;
USE telegram_stock_bot;
SHOW TABLES;
DESCRIBE users;
DESCRIBE portfolio;
```

### 2. ตรวจสอบข้อมูล
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM portfolio;
```

### 3. ลบข้อมูลทดสอบ
```sql
DELETE FROM portfolio WHERE user_id IN (
    SELECT id FROM users WHERE telegram_id LIKE 'TEST%'
);
DELETE FROM users WHERE telegram_id LIKE 'TEST%';
```

---

## 🔒 Security

### สร้าง user เฉพาะสำหรับ bot

```sql
-- สร้าง user
CREATE USER 'telegram_bot'@'localhost' IDENTIFIED BY 'strong_password';

-- ให้สิทธิ์
GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_stock_bot.* TO 'telegram_bot'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

แล้วใช้ใน `.env`:
```env
DB_USER=telegram_bot
DB_PASSWORD=strong_password
```

---

## 📞 Troubleshooting

### "Access denied"
```sql
-- ตรวจสอบ user permissions
SHOW GRANTS FOR 'root'@'localhost';
```

### "Table doesn't exist"
```bash
# รัน schema.sql อีกครั้ง
mysql -u root -p < ../schema.sql
```

### Foreign key errors
```sql
-- ปิดชั่วคราว
SET FOREIGN_KEY_CHECKS = 0;
-- ทำงานที่ต้องการ
SET FOREIGN_KEY_CHECKS = 1;
```

---

## 📚 Additional Resources

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [DBeaver Documentation](https://dbeaver.io/docs/)
- [SQL Tutorial](https://www.w3schools.com/sql/)

---

Created for Telegram Stock Alert Bot  
Database: MySQL 5.7+ / 8.0+
