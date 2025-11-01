import dotenv from 'dotenv';
import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { initDatabase, getAllPortfolioStocks, updateLastNotified, closeDatabase } from './db.js';
import { getStockQuote, shouldAlert, calculatePriceChange } from './services/finnhub.js';
import { sendStockAlert } from './services/telegram.js';
import { handleAddCommand } from './commands/add.js';
import { handleCheckCommand } from './commands/check.js';
import { handlePortfolioCommand } from './commands/portfolio.js';
import { handleNewsCommand } from './commands/news.js';

dotenv.config();

// Validate environment variables
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is not set in .env file');
  process.exit(1);
}

if (!process.env.FINNHUB_API_KEY) {
  console.error('❌ FINNHUB_API_KEY is not set in .env file');
  process.exit(1);
}

if (!process.env.MARKETAUX_API_KEY) {
  console.error('❌ MARKETAUX_API_KEY is not set in .env file');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);
const ALERT_THRESHOLD = parseFloat(process.env.PRICE_ALERT_THRESHOLD) || 5;

// Start command
bot.command('start', async (ctx) => {
  const welcomeMessage = `🤖 *ยินดีต้อนรับสู่ Stock Alert Bot\\!*

บอทนี้จะช่วยติดตามหุ้นสหรัฐฯ และแจ้งเตือนเมื่อราคาเปลี่ยนแปลง

📋 *คำสั่งที่ใช้งานได้:*

/add \\<symbol\\> \\<buy\\_price\\> \\<qty\\>
  → เพิ่มหุ้นเข้าพอร์ต
  ตัวอย่าง: /add AAPL 180\\.5 10

/check \\<symbol\\>
  → ตรวจสอบราคาหุ้นปัจจุบัน
  ตัวอย่าง: /check TSLA

/portfolio
  → แสดงพอร์ตทั้งหมดพร้อมกำไร/ขาดทุน

/news \\<symbol\\>
  → แสดงข่าวล่าสุดของหุ้น
  ตัวอย่าง: /news AAPL

⚡ *ระบบแจ้งเตือนอัตโนมัติ*
บอทจะตรวจสอบราคาหุ้นในพอร์ตของคุณทุก 5 นาที
และแจ้งเตือนเมื่อราคาเปลี่ยนแปลง ±${ALERT_THRESHOLD}%

🚀 เริ่มต้นด้วยการเพิ่มหุ้นด้วยคำสั่ง /add`;

  await ctx.reply(welcomeMessage, { parse_mode: 'MarkdownV2' });
});

// Register commands
bot.command('add', handleAddCommand);
bot.command('check', handleCheckCommand);
bot.command('portfolio', handlePortfolioCommand);
bot.command('news', handleNewsCommand);

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📋 *คำสั่งทั้งหมด:*\n\n' +
    '/start - เริ่มต้นใช้งาน\n' +
    '/add - เพิ่มหุ้นเข้าพอร์ต\n' +
    '/check - ตรวจสอบราคาหุ้น\n' +
    '/portfolio - ดูพอร์ตทั้งหมด\n' +
    '/news - ดูข่าวหุ้น\n' +
    '/help - แสดงความช่วยเหลือ\n\n' +
    'ใช้ /start เพื่อดูรายละเอียดเพิ่มเติม',
    { parse_mode: 'Markdown' }
  );
});

// Handle unknown commands
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) {
    await ctx.reply(
      '❌ ไม่รู้จักคำสั่งนี้\nใช้ /help เพื่อดูคำสั่งทั้งหมด'
    );
  }
});

// Auto-alert system
async function checkPriceAlerts() {
  try {
    console.log('🔍 Checking price alerts...');
    
    const portfolioStocks = await getAllPortfolioStocks();
    
    if (!portfolioStocks || portfolioStocks.length === 0) {
      console.log('No stocks in portfolio to check');
      return;
    }

    // Group stocks by symbol to avoid multiple API calls
    const stocksBySymbol = {};
    portfolioStocks.forEach(stock => {
      if (!stocksBySymbol[stock.symbol]) {
        stocksBySymbol[stock.symbol] = [];
      }
      stocksBySymbol[stock.symbol].push(stock);
    });

    // Check each unique symbol
    for (const symbol of Object.keys(stocksBySymbol)) {
      try {
        const quote = await getStockQuote(symbol);
        const stocks = stocksBySymbol[symbol];

        // Check each user's position in this stock
        for (const stock of stocks) {
          const shouldSendAlert = shouldAlert(
            quote.currentPrice,
            stock.buy_price,
            stock.last_notified,
            ALERT_THRESHOLD
          );

          if (shouldSendAlert) {
            const percentChange = calculatePriceChange(
              quote.currentPrice,
              stock.buy_price
            );

            // Send alert
            await sendStockAlert(stock.telegram_id, {
              symbol: stock.symbol,
              currentPrice: quote.currentPrice,
              buyPrice: stock.buy_price,
              percentChange: percentChange,
              qty: stock.qty
            });

            // Update last_notified
            await updateLastNotified(stock.id, quote.currentPrice);

            console.log(`✅ Alert sent for ${stock.symbol} to user ${stock.telegram_id}`);
          }
        }

        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        // Only log unexpected errors (not invalid symbols or rate limits)
        if (!error.message.includes('No data found') && !error.message.includes('rate limit')) {
          console.error(`Error checking ${symbol}:`, error.message);
        }
      }
    }

    console.log('✅ Price alert check completed');

  } catch (error) {
    console.error('Error in checkPriceAlerts:', error);
  }
}

// Schedule price check every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('⏰ Running scheduled price check...');
  checkPriceAlerts();
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง');
});

// Initialize and start
async function start() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✅ Database ready');

    // Start bot
    await bot.launch();
    console.log('🤖 Bot started successfully!');
    console.log(`⚡ Auto-alert threshold: ±${ALERT_THRESHOLD}%`);
    console.log('⏰ Price checks scheduled every 5 minutes');

    // Run initial price check
    setTimeout(() => {
      console.log('Running initial price check...');
      checkPriceAlerts();
    }, 5000);

  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.once('SIGINT', async () => {
  console.log('Received SIGINT, stopping bot...');
  bot.stop('SIGINT');
  await closeDatabase();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  console.log('Received SIGTERM, stopping bot...');
  bot.stop('SIGTERM');
  await closeDatabase();
  process.exit(0);
});

// Start the bot
start();
