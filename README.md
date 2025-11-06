# 🤖 Telegram Stock Alert Bot

A Telegram bot for tracking US stock prices with automatic alerts and portfolio management.

## ✨ Features

### 📊 Core Features
- **Real-time Stock Prices** - Get current stock quotes from Finnhub API
- **Latest News** - Fetch stock-related news from Marketaux API
- **Portfolio Management** - Track your stock positions with profit/loss calculations
- **Weighted Average Price** - Automatic calculation when adding more shares
- **Auto Alerts** - Automatic notifications when stock prices change by ±5% (configurable)
- **Watchlist** ⭐ - Track stocks of interest with ±3% and ±5% price alerts

### 🎯 Portfolio Management
- **Add Stocks** - Add stocks with automatic weighted average calculation
- **Remove Stocks** - 4 ways to remove (UI, specific qty, symbol all, portfolio all)
- **View Portfolio** - Real-time profit/loss tracking
- **Clear Portfolio** - Remove all stocks with double confirmation

### 🎨 UI/UX Features
- **Inline Buttons** - Interactive buttons for stock selection and confirmations
- **Reply Keyboard** - Quick access menu (no typing needed)
- **Help Examples** - Interactive help with examples
- **Session Management** - Remembers your interaction flow

### 🗄️ Data & Reliability
- **MySQL Database** - Persistent storage with connection pooling
- **Scheduled Checks** - Automated price monitoring every 5 minutes
- **Data Validation** - Prevents invalid operations

## 🛠️ Tech Stack

- **Runtime:** Node.js (ES Module)
- **Database:** MySQL
- **Scheduler:** node-cron
- **Bot Framework:** Telegraf
- **APIs:**
  - [Finnhub.io](https://finnhub.io/) → Stock prices
  - [Marketaux.com](https://www.marketaux.com/) → Stock news

## 📦 Installation

### Prerequisites

- Node.js 16+ installed
- MySQL Server 5.7+ or 8.0+ installed and running
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Finnhub API Key (free from [finnhub.io](https://finnhub.io/))
- Marketaux API Key (free from [marketaux.com](https://www.marketaux.com/))

### Setup Steps

1. **Clone or download the project:**
   ```bash
   cd telegram-app-checkstock
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create MySQL database:**
   ```bash
   mysql -u root -p
   ```
   ```sql
   CREATE DATABASE telegram_stock_bot;
   exit;
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

5. **Edit `.env` file with your credentials:**
   ```env
   BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
   FINNHUB_API_KEY=YOUR_FINNHUB_API_KEY
   MARKETAUX_API_KEY=YOUR_MARKETAUX_API_KEY
   PRICE_ALERT_THRESHOLD=5
   
   # MySQL Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=telegram_stock_bot
   ```

6. **Start the bot:**
   ```bash
   npm start
   ```

## 📱 Telegram Commands

### Portfolio Management

| Command | Description | Example |
|---------|-------------|---------|  
| `/add <symbol> <price> <qty>` | Add stock to portfolio | `/add AAPL 180.5 10` |
| `/portfolio` | View entire portfolio with P&L | `/portfolio` |
| `/remove` | Show stock selection UI | `/remove` |
| `/remove <symbol> <qty>` | Remove specific quantity ⭐ | `/remove AAPL 5` |
| `/remove <symbol> all` | Remove all shares of a symbol ⭐ | `/remove AAPL all` |
| `/remove all` | Remove entire portfolio ⭐ | `/remove all` |
| `/clear` | Clear entire portfolio (double confirm) | `/clear` |

### Stock Information

| Command | Description | Example |
|---------|-------------|---------|  
| `/check <symbol>` | Check current stock price | `/check AAPL` |
| `/news <symbol>` | Get latest stock news | `/news TSLA` |

### Watchlist ⭐

| Command | Description | Example |
|---------|-------------|---------|  
| `/watch <symbol>` | Add stock to watchlist | `/watch AAPL` |
| `/watchlist` | View all watched stocks | `/watchlist` |

**Alert Levels:**
- ±3% → First alert
- ±5% → Second alert

### Utilities

| Command | Description | Example |
|---------|-------------|---------|  
| `/start` | Show welcome message | `/start` |
| `/menu` | Show quick access menu ⭐ | `/menu` |
| `/help` | Show detailed help with examples ⭐ | `/help` |

⭐ = New features

## 🎯 Usage Examples

### 1. Add Stock to Portfolio
```
/add AAPL 180.5 10
```
Adds 10 shares of Apple at $180.50/share.

**Adding more shares automatically calculates weighted average:**
```
/add AAPL 150 10
```
Now you have 20 shares with average price of $165.25

### 2. View Portfolio
```
/portfolio
```
Displays all your stocks with:
- Current prices
- Profit/Loss per stock  
- Total portfolio value
- Overall P&L percentage

### 3. Remove Stocks (4 Ways)

**Option 1: Use Interactive UI**
```
/remove
```
→ Shows list of stocks with buttons to select

**Option 2: Remove Specific Quantity**
```
/remove AAPL 5
```
→ Removes 5 shares of AAPL (keeps average price)

**Option 3: Remove All Shares of One Symbol**
```
/remove AAPL all
```
→ Removes all AAPL shares from portfolio

**Option 4: Remove Entire Portfolio**
```
/remove all
```
→ Removes all stocks (requires double confirmation)

### 4. Check Stock Price
```
/check TSLA
```
Shows current price, daily high/low, and your position if owned.

### 5. Get Stock News
```
/news AAPL
```
Shows latest 5 news articles about the stock.

### 6. Quick Access Menu
```
/menu
```
Shows a persistent keyboard menu with buttons for:
- 📊 View Portfolio
- ➕ Add Stock
- ➖ Remove Stock  
- 🔍 Check Price
- 👁️ Watchlist
- 📰 News
- ❓ Help

### 7. Track Stocks with Watchlist ⭐
```
/watch AAPL
```
Adds Apple to your watchlist and shows the current price. You'll receive:
- **First alert** when price moves ±3% from base price
- **Second alert** when price moves ±5% from base price

**View your watchlist:**
```
/watchlist
```
Shows all tracked stocks with:
- Base price (when added)
- Current price
- Change percentage
- Alert status
- Buttons to remove stocks

## ⚡ Auto Alert System

The bot automatically monitors your portfolio and watchlist every 5 minutes:

### Portfolio Alerts
1. Fetches current prices for all stocks in your portfolio
2. Compares with your buy price
3. Sends alert if price change exceeds threshold (default: ±5%)
4. Updates last notification to avoid spam

### Watchlist Alerts ⭐
1. Monitors all stocks in your watchlist
2. Sends **first alert** at ±3% price change
3. Sends **second alert** at ±5% price change
4. Each alert is sent only once per stock

### Example Portfolio Alert:
```
⚡ AAPL Alert ⚠️

💰 ราคาปัจจุบัน: $170.20
📊 ราคาซื้อ: $180.50
📉 เปลี่ยนแปลง: -5.6%
📦 จำนวน: 10 หุ้น

ต่ำกว่าราคาซื้อของคุณ 5.6% แล้ว ⚠️
```

### Example Watchlist Alert:
```
⚠️ Watchlist Alert: TSLA

📊 ราคาเริ่มต้น: $200.00
💰 ราคาปัจจุบัน: $206.50
📈 สูงขึ้น: 3.25%

🔔 แจ้งเตือนระดับ ±3%
```

## 📂 Project Structure

```
telegram-app-checkstock/
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # This file
├── index.js             # Main bot entry point with UI handlers
├── db.js                # Database operations (add, remove, portfolio)
├── services/
│   ├── finnhub.js      # Finnhub API integration
│   ├── marketaux.js    # Marketaux API integration
│   └── telegram.js     # Telegram message formatting
└── commands/
    ├── add.js          # /add command handler
    ├── check.js        # /check command handler
    ├── news.js         # /news command handler
    ├── portfolio.js    # /portfolio command handler
    ├── remove.js       # /remove command with 4 modes
    ├── clear.js        # /clear command
    └── watch.js        # /watch & /watchlist commands ⭐ NEW
```

## 🗄️ Database Schema

### Table: `users`
| Field | Type | Description |
|-------|------|-------------|
| id | INT AUTO_INCREMENT PRIMARY KEY | User ID |
| telegram_id | VARCHAR(255) UNIQUE | Telegram user ID |
| username | VARCHAR(255) | Username |
| created_at | TIMESTAMP | Creation timestamp |

### Table: `portfolio`
| Field | Type | Description |
|-------|------|-------------|
| id | INT AUTO_INCREMENT PRIMARY KEY | Portfolio entry ID |
| user_id | INT | FK to users.id |
| symbol | VARCHAR(20) | Stock symbol (e.g., AAPL) |
| buy_price | DECIMAL(10, 2) | Price at purchase |
| qty | DECIMAL(10, 4) | Quantity of shares |
| type | VARCHAR(20) | 'stock' or 'fund' |
| last_notified | DECIMAL(10, 2) | Last alert price |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Table: `watchlist` ⭐
| Field | Type | Description |
|-------|------|-------------|
| id | INT AUTO_INCREMENT PRIMARY KEY | Watchlist entry ID |
| user_id | INT | FK to users.id |
| symbol | VARCHAR(20) | Stock symbol (e.g., AAPL) |
| base_price | DECIMAL(10, 2) | Price when added to watchlist |
| alert_3_sent | BOOLEAN | Whether ±3% alert was sent |
| alert_5_sent | BOOLEAN | Whether ±5% alert was sent |
| last_price | DECIMAL(10, 2) | Last recorded price |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## 🔧 Configuration

### Alert Threshold
Change the alert sensitivity in `.env`:
```env
PRICE_ALERT_THRESHOLD=3  # Alert at ±3% change
```

### Check Interval
Modify the cron schedule in `index.js`:
```javascript
// Check every 10 minutes instead of 5
cron.schedule('*/10 * * * *', () => {
  checkPriceAlerts();
});
```

## 🚨 API Rate Limits

### Finnhub (Free Tier)
- 60 calls/minute
- Consider adding delays between requests

### Marketaux (Free Tier)
- 100 calls/day
- Use sparingly for news

## 🐛 Troubleshooting

### Bot doesn't respond
- Check BOT_TOKEN in `.env`
- Ensure bot is running: `npm start`
- Check console for errors

### No stock data found
- Verify stock symbol is correct (US stocks only)
- Check Finnhub API key is valid
- Ensure API rate limits not exceeded

### Database errors
- Verify MySQL server is running: `mysql -u root -p`
- Check database credentials in `.env`
- Ensure database `telegram_stock_bot` exists
- Check MySQL user permissions

## 🎨 UI/UX Features

### Inline Buttons
Interactive buttons for easy navigation:
- **Stock Selection** - Click to choose stocks from your portfolio
- **Confirmation** - Confirm before removing stocks
- **Help Examples** - View examples with one click
- **Close Button** - Dismiss messages when done

### Reply Keyboard (Quick Menu)
Persistent menu buttons:
```
/menu
```
Shows buttons at the bottom of your chat for quick access to all features.

### Session Management
The bot remembers your interaction flow:
- No need to start over if you make a mistake
- Can cancel operations at any time
- Automatic cleanup of old sessions

## 💡 Tips & Best Practices

### Portfolio Management
- **Add stocks gradually** - The bot automatically calculates weighted average
- **Use `/remove` UI** - Easier than typing for beginners
- **Use typed commands** - Faster for experienced users
  - `/remove AAPL 5` - Quick removal
  - `/remove AAPL all` - Remove symbol
  - `/remove all` - Clear portfolio

### Safety Features
- **Double confirmation** - Required for `/remove all` and `/clear`
- **Validation** - Can't remove more shares than you own
- **Preview before action** - Always shows what will happen

### Keyboard Shortcuts
- Use `/menu` once and keep the keyboard visible
- Click buttons instead of typing commands
- Press "❌ ปิด" to dismiss help messages

## 📝 Development

### Run with auto-reload
```bash
npm run dev
```

### Test commands manually
Start the bot and send commands via Telegram.

## 🔒 Security Notes

- Never commit `.env` file to Git
- Keep API keys private
- Database file (`stock_bot.db`) is in `.gitignore`

## 📄 License

ISC

## 🙏 Credits

- Stock data: [Finnhub.io](https://finnhub.io/)
- News data: [Marketaux.com](https://www.marketaux.com/)
- Bot framework: [Telegraf](https://telegraf.js.org/)

## 📞 Support

For issues or questions, please check:
1. README troubleshooting section
2. API documentation (Finnhub & Marketaux)
3. Telegraf documentation

---

Made with ❤️ for stock tracking enthusiasts
