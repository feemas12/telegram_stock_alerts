# 🔧 MySQL DECIMAL Type Fix

## ปัญหาที่พบ

### 1. TypeError: buy_price.toFixed is not a function

**สาเหตุ:**
MySQL DECIMAL type ส่งค่ากลับมาเป็น **string** แทนที่จะเป็น **number** ใน Node.js

```javascript
// จาก MySQL
buy_price: "180.50"  // ← String!
qty: "10.0000"       // ← String!

// พยายามเรียก .toFixed(2)
item.buy_price.toFixed(2)  // ❌ Error: toFixed is not a function
```

### 2. Telegram Markdown Parsing Error

**สาเหตุ:**
Telegram Bot API ต้องการ escape special characters ใน MarkdownV2

```
Error: can't parse entities: Can't find end of the entity starting at byte offset 336
```

## การแก้ไข

### 1. แก้ไข services/telegram.js (3 functions)

#### formatPortfolioMessage()
```javascript
// Before
const investment = item.buy_price * item.qty;
message += `ราคาซื้อ: $${item.buy_price.toFixed(2)}`;  // ❌ Error

// After
const buyPrice = parseFloat(item.buy_price);     // ✅ Convert to number
const qty = parseFloat(item.qty);
const investment = buyPrice * qty;
message += `ราคาซื้อ: $${buyPrice.toFixed(2)}`;  // ✅ Works!
```

#### formatStockCheckMessage()
```javascript
// Before
const profitLoss = (stockData.currentPrice - portfolioData.buy_price) * portfolioData.qty;

// After
const buyPrice = parseFloat(portfolioData.buy_price);
const qty = parseFloat(portfolioData.qty);
const profitLoss = (stockData.currentPrice - buyPrice) * qty;
```

#### sendStockAlert()
```javascript
// Before
message += `💰 ราคาปัจจุบัน: $${currentPrice.toFixed(2)}`;

// After
const price = parseFloat(currentPrice);
const buy = parseFloat(buyPrice);
const change = parseFloat(percentChange);
const quantity = parseFloat(qty);
message += `💰 ราคาปัจจุบัน: $${price.toFixed(2)}`;
```

### 2. แก้ไข index.js (/start command)

```javascript
// Before
parse_mode: 'Markdown'
// Text with unescaped special characters

// After
parse_mode: 'MarkdownV2'
// Text with escaped special characters: \!, \., \<, \>, \_
```

## ทำไม MySQL DECIMAL เป็น String?

MySQL DECIMAL/NUMERIC types มีความแม่นยำสูงมาก (precision)
- ถ้าแปลงเป็น JavaScript Number จะเสีย precision
- mysql2 driver จึงส่งเป็น string เพื่อรักษาความแม่นยำ

```sql
DECIMAL(10, 2)  → "180.50" ใน Node.js
```

## ไฟล์ที่แก้ไข

✅ **services/telegram.js**
- `formatPortfolioMessage()` - แปลง buy_price, qty, currentPrice
- `formatStockCheckMessage()` - แปลง buy_price, qty จาก portfolio
- `sendStockAlert()` - แปลง currentPrice, buyPrice, percentChange, qty

✅ **index.js**
- `/start` command - เปลี่ยนเป็น MarkdownV2 และ escape special chars

## วิธีทดสอบ

### Test 1: เพิ่มหุ้นเข้าพอร์ต
```bash
/add AAPL 180.5 10
```
✅ ควรบันทึกสำเร็จ

### Test 2: ดูพอร์ต
```bash
/portfolio
```
✅ ไม่มี error "toFixed is not a function"
✅ แสดงราคาและกำไร/ขาดทุนถูกต้อง

### Test 3: เช็คราคา
```bash
/check AAPL
```
✅ แสดงราคาปัจจุบันและข้อมูลในพอร์ต (ถ้ามี)

### Test 4: Start command
```bash
/start
```
✅ ไม่มี Markdown parsing error
✅ แสดง welcome message ถูกต้อง

## Best Practice สำหรับ MySQL DECIMAL

```javascript
// ❌ Don't do this
const price = item.price;  // May be string from MySQL
const total = price * qty;  // Works but risky

// ✅ Do this
const price = parseFloat(item.price);  // Always convert first
const qty = parseFloat(item.qty);
const total = price * qty;  // Safe calculation
```

## Type Checking

สามารถเพิ่ม type checking เพื่อป้องกัน:

```javascript
function toNumber(value) {
  const num = parseFloat(value);
  if (isNaN(num)) {
    throw new Error(`Cannot convert to number: ${value}`);
  }
  return num;
}

// Use it
const price = toNumber(item.buy_price);
```

## Alternative Solutions

### Option 1: Configure mysql2 to parse DECIMAL as number
```javascript
// In db.js
const pool = mysql.createPool({
  // ... other config
  decimalNumbers: true  // Parse DECIMAL as number (may lose precision)
});
```
⚠️ **Not recommended** - อาจเสีย precision สำหรับตัวเลขขนาดใหญ่

### Option 2: Use parseFloat everywhere (Chosen)
```javascript
// Convert at usage point (our solution)
const price = parseFloat(item.buy_price);
```
✅ **Recommended** - ควบคุมได้ชัดเจน, ไม่เสีย precision ใน DB

### Option 3: Create helper function
```javascript
// Create utility
function formatCurrency(value) {
  return parseFloat(value).toFixed(2);
}

// Use it
message += `Price: $${formatCurrency(item.buy_price)}`;
```
✅ **Good for larger apps** - Reusable และ DRY

## สรุป

✅ แปลง MySQL DECIMAL (string) เป็น number ด้วย `parseFloat()`  
✅ แก้ไข Telegram Markdown parsing ด้วย MarkdownV2  
✅ เพิ่ม type conversion ใน 3 functions  
✅ รักษา precision ของตัวเลขใน database  

---

**Fixed:** November 2024  
**Issue:** MySQL DECIMAL as string + Telegram Markdown  
**Solution:** parseFloat() + MarkdownV2  
**Status:** ✅ Resolved
