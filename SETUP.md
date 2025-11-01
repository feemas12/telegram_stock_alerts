# 🚀 Quick Setup Guide

## Step 1: Get API Keys

### Telegram Bot Token
1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Finnhub API Key
1. Go to [https://finnhub.io/](https://finnhub.io/)
2. Click "Get free API key"
3. Sign up for a free account
4. Copy your API key from the dashboard

### Marketaux API Key
1. Go to [https://www.marketaux.com/](https://www.marketaux.com/)
2. Click "Get API key" or "Sign up"
3. Create a free account
4. Copy your API key from the dashboard

## Step 2: Setup MySQL Database

### Install MySQL (if not already installed)

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
```

**Windows:**
Download and install from [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)

### Create Database

```bash
mysql -u root -p
```

Then run:
```sql
CREATE DATABASE telegram_stock_bot;
exit;
```

## Step 3: Install Dependencies

```bash
npm install
```

This will install:
- `telegraf` - Telegram bot framework
- `axios` - HTTP client for API calls
- `mysql2` - MySQL database driver
- `node-cron` - Task scheduler
- `dotenv` - Environment variables

## Step 4: Configure Environment

Create `.env` file in the project root:

```bash
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
FINNHUB_API_KEY=YOUR_FINNHUB_API_KEY_HERE
MARKETAUX_API_KEY=YOUR_MARKETAUX_API_KEY_HERE
PRICE_ALERT_THRESHOLD=5

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=telegram_stock_bot
```

**Important:** 
- Replace `YOUR_TELEGRAM_BOT_TOKEN_HERE` with your actual bot token
- Replace `YOUR_FINNHUB_API_KEY_HERE` with your Finnhub API key
- Replace `YOUR_MARKETAUX_API_KEY_HERE` with your Marketaux API key
- Replace `your_mysql_password` with your MySQL root password
- Keep the threshold at 5 (means ±5% change triggers alerts)

## Step 5: Start the Bot

```bash
npm start
```

You should see:
```
✅ Database initialized successfully
✅ Database ready
🤖 Bot started successfully!
⚡ Auto-alert threshold: ±5%
⏰ Price checks scheduled every 5 minutes
```

## Step 5: Test Your Bot

1. Open Telegram
2. Search for your bot by the username you created
3. Send `/start` command
4. Try adding a stock: `/add AAPL 180.5 10`
5. Check the price: `/check AAPL`
6. View your portfolio: `/portfolio`

## 🎉 You're all set!

The bot will now:
- ✅ Track stocks in your portfolio
- ✅ Check prices every 5 minutes
- ✅ Send alerts when price changes ±5%
- ✅ Provide news and real-time data

## Common Issues

### "BOT_TOKEN is not set"
- Make sure `.env` file exists in project root
- Check that you copied `.env.example` to `.env`
- Verify the token is correct (no extra spaces)

### "Failed to fetch stock data"
- Check stock symbol is correct (US stocks only)
- Verify Finnhub API key is valid
- Try again in a minute (rate limit)

### Bot doesn't respond
- Make sure bot is running (`npm start`)
- Check console for errors
- Verify bot token is correct
- Check internet connection

### Database connection errors
- Verify MySQL is running: `mysql -u root -p`
- Check database exists: `SHOW DATABASES;` in MySQL
- Verify DB_HOST, DB_USER, DB_PASSWORD in `.env`
- Check MySQL user has permissions: `GRANT ALL ON telegram_stock_bot.* TO 'root'@'localhost';`

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

This will restart the bot automatically when you make code changes.

## Stopping the Bot

Press `Ctrl + C` in the terminal to stop the bot gracefully.

## Next Steps

- Customize alert threshold in `.env`
- Modify check interval in `index.js`
- Add more stocks to your portfolio
- Share your bot with friends!

---

Need help? Check the main [README.md](README.md) for detailed documentation.
