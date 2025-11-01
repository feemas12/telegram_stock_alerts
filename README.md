# 🤖 Telegram Stock Alert Bot

A Telegram bot for tracking US stock prices with automatic alerts and portfolio management.

## ✨ Features

- 📊 **Real-time Stock Prices** - Get current stock quotes from Finnhub API
- 📰 **Latest News** - Fetch stock-related news from Marketaux API
- 💼 **Portfolio Management** - Track your stock positions with profit/loss calculations
- ⚡ **Auto Alerts** - Automatic notifications when stock prices change by ±5% (configurable)
- 🗄️ **MySQL Database** - Persistent storage for user portfolios with connection pooling
- ⏰ **Scheduled Checks** - Automated price monitoring every 5 minutes

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

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Show welcome message and help | `/start` |
| `/add <symbol> <buy_price> <qty>` | Add stock to portfolio | `/add AAPL 180.5 10` |
| `/check <symbol>` | Check current stock price | `/check AAPL` |
| `/portfolio` | View entire portfolio with P&L | `/portfolio` |
| `/news <symbol>` | Get latest stock news | `/news TSLA` |
| `/help` | Show all commands | `/help` |

## 🎯 Usage Examples

### Add Stock to Portfolio
```
/add AAPL 180.5 10
```
Adds 10 shares of Apple stock at $180.50 per share.

### Check Stock Price
```
/check TSLA
```
Shows current price, daily high/low, and your position if owned.

### View Portfolio
```
/portfolio
```
Displays all your stocks with:
- Current prices
- Profit/Loss per stock
- Total portfolio value
- Overall P&L percentage

### Get Stock News
```
/news AAPL
```
Shows latest 5 news articles about the stock.

## ⚡ Auto Alert System

The bot automatically monitors your portfolio every 5 minutes:

1. Fetches current prices for all stocks in your portfolio
2. Compares with your buy price
3. Sends alert if price change exceeds threshold (default: ±5%)
4. Updates last notification to avoid spam

### Example Alert:
```
⚡ AAPL Alert ⚠️

💰 ราคาปัจจุบัน: $170.20
📊 ราคาซื้อ: $180.50
📉 เปลี่ยนแปลง: -5.6%
📦 จำนวน: 10 หุ้น

ต่ำกว่าราคาซื้อของคุณ 5.6% แล้ว ⚠️
```

## 📂 Project Structure

```
telegram-app-checkstock/
├── package.json          # Dependencies and scripts
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # This file
├── index.js             # Main bot entry point
├── db.js                # Database operations
├── services/
│   ├── finnhub.js      # Finnhub API integration
│   ├── marketaux.js    # Marketaux API integration
│   └── telegram.js     # Telegram message formatting
└── commands/
    ├── add.js          # /add command handler
    ├── check.js        # /check command handler
    ├── news.js         # /news command handler
    └── portfolio.js    # /portfolio command handler
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
