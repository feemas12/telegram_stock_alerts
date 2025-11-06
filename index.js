import dotenv from 'dotenv';
import cron from 'node-cron';
import { Telegraf } from 'telegraf';
import { initDatabase, getAllPortfolioStocks, updateLastNotified, getAllWatchlistStocks, updateWatchlistAlert, closeDatabase } from './db.js';
import { getStockQuote, shouldAlert, calculatePriceChange } from './services/finnhub.js';
import { sendStockAlert, sendWatchlistAlert } from './services/telegram.js';
import { handleAddCommand } from './commands/add.js';
import { handleCheckCommand } from './commands/check.js';
import { handlePortfolioCommand } from './commands/portfolio.js';
import { handleNewsCommand } from './commands/news.js';
import { 
  handleRemoveCommand, 
  handleRemoveSelect, 
  handleRemovePartial, 
  handleRemoveAll, 
  handleTextInput,
  handleRemoveConfirm,
  handleRemoveCancel,
  handleRemoveDirectConfirm,
  handleRemoveAllConfirm1,
  handleRemoveAllConfirm2
} from './commands/remove.js';
import { 
  handleClearCommand, 
  handleClearConfirm1, 
  handleClearConfirm2, 
  handleClearCancel 
} from './commands/clear.js';
import {
  handleWatchCommand,
  handleWatchlistCommand,
  handleUnwatchAction,
  handleUnwatchAllConfirm,
  handleUnwatchAllExecute,
  handleUnwatchCancel
} from './commands/watch.js';
import { Markup } from 'telegraf';

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

// Welcome message when user adds bot (first time interaction)
bot.on('my_chat_member', async (ctx) => {
  const update = ctx.update.my_chat_member;
  const newStatus = update.new_chat_member.status;
  const oldStatus = update.old_chat_member?.status;

  // Check if user just added the bot
  if ((oldStatus === 'left' || oldStatus === 'kicked') && 
      (newStatus === 'member' || newStatus === 'administrator')) {
    
    const firstName = ctx.from.first_name || 'เพื่อน';
    
    const welcomeMessage = `👋 *สวัสดีครับคุณ ${firstName}\\!*

ยินดีต้อนรับสู่ *Stock Alert Bot* 🤖

ฉันจะช่วยคุณ:
✅ ติดตามราคาหุ้นสหรัฐฯ แบบ Real\\-time
✅ คำนวณกำไร/ขาดทุนอัตโนมัติ
✅ แจ้งเตือนเมื่อราคาเปลี่ยนแปลง ±${ALERT_THRESHOLD}%
✅ จัดการพอร์ตหุ้นของคุณ

━━━━━━━━━━━━━━━━━━━━

🎯 *เริ่มต้นใช้งาน 3 ขั้นตอน:*

1️⃣ กด /menu เพื่อดูเมนูด่วน
2️⃣ ลองเพิ่มหุ้นแรก: \`/add AAPL 150 10\`
3️⃣ ดูพอร์ตของคุณ: /portfolio

💡 *เคล็ดลับ:*
• ใช้ /help เพื่อดูคำสั่งทั้งหมด
• กด /menu จะแสดงปุ่มด่วน \\(ไม่ต้องพิมพ์\\)

🚀 พร้อมเริ่มต้นแล้วหรือยัง? กด /menu เลย\\!`;

    await ctx.reply(welcomeMessage, { parse_mode: 'MarkdownV2' });
    
    // Auto show menu keyboard
    setTimeout(async () => {
  const keyboard = Markup.keyboard([
    ['📊 ดูพอร์ต', '🔍 เช็คราคา'],
    ['➕ เพิ่มหุ้น', '➖ ลดหุ้น'],
    ['👁️ รายการติดตาม', '📰 ข่าวสาร'],
    ['❓ ช่วยเหลือ']
  ])
  .resize()
  .persistent();

      await ctx.reply(
        '🎯 *เมนูด่วนของคุณพร้อมแล้ว\\!*\n\n' +
        'กดปุ่มด้านล่างเพื่อเริ่มใช้งาน 👇',
        { parse_mode: 'MarkdownV2', ...keyboard }
      );
    }, 1500);
  }
});

// Start command
bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name || 'เพื่อน';
  
  const welcomeMessage = `👋 *คุณ ${firstName}\\! สามารถใช้คำสั่งตามด้านล่างนี้ได้เลยครับ*

🤖 *ยินดีต้อนรับสู่ Stock Alert Bot*

บอทนี้จะช่วยติดตามหุ้นสหรัฐฯ และแจ้งเตือนเมื่อราคาเปลี่ยนแปลง

━━━━━━━━━━━━━━━━━━━━

📋 *คำสั่งหลัก:*

/add \\<symbol\\> \\<price\\> \\<qty\\>
  → เพิ่มหุ้นเข้าพอร์ต
  ตัวอย่าง: /add AAPL 180\\.5 10

/portfolio → ดูพอร์ตทั้งหมด
/remove → ลด/ลบหุ้น \\(ใช้ปุ่ม\\)
/check \\<symbol\\> → เช็คราคา
/news \\<symbol\\> → ข่าวหุ้น
/menu → เมนูด่วน

━━━━━━━━━━━━━━━━━━━━

⚡ *ระบบแจ้งเตือนอัตโนมัติ*
ตรวจสอบราคาทุก 5 นาที
แจ้งเตือนเมื่อเปลี่ยนแปลง ±${ALERT_THRESHOLD}%

🎯 *เริ่มต้นเลย\\!*
กด /menu หรือลอง /add AAPL 150 10`;

  const keyboard = Markup.keyboard([
    ['📊 ดูพอร์ต', '🔍 เช็คราคา'],
    ['➕ เพิ่มหุ้น', '➖ ลดหุ้น'],
    ['👁️ รายการติดตาม', '📰 ข่าวสาร'],
    ['❓ ช่วยเหลือ']
  ])
  .resize()
  .persistent();

  await ctx.reply(welcomeMessage, { 
    parse_mode: 'MarkdownV2',
    ...keyboard 
  });
});

// Register commands
bot.command('add', handleAddCommand);
bot.command('check', handleCheckCommand);
bot.command('portfolio', handlePortfolioCommand);
bot.command('news', handleNewsCommand);
bot.command('remove', handleRemoveCommand);
bot.command('clear', handleClearCommand);
bot.command('watch', handleWatchCommand);
bot.command('watchlist', handleWatchlistCommand);

// Menu command - show reply keyboard
bot.command('menu', async (ctx) => {
  const keyboard = Markup.keyboard([
    ['📊 ดูพอร์ต', '🔍 เช็คราคา'],
    ['➕ เพิ่มหุ้น', '➖ ลดหุ้น'],
    ['👁️ รายการติดตาม', '📰 ข่าวสาร'],
    ['❓ ช่วยเหลือ']
  ])
  .resize()
  .persistent();

  await ctx.reply(
    '🎯 *เมนูหลัก*\n\n' +
    'เลือกเมนูจากปุ่มด้านล่าง:\n' +
    'หรือใช้คำสั่ง /help เพื่อดูทั้งหมด',
    { parse_mode: 'Markdown', ...keyboard }
  );
});

// Help command - with detailed usage
bot.command('help', async (ctx) => {
  const helpMessage = 
    '📋 *คำสั่งทั้งหมดพร้อมวิธีใช้*\n\n' +
    
    '━━━━ 📊 *การจัดการพอร์ต* ━━━━\n\n' +
    
    '➕ */add* - เพิ่มหุ้นเข้าพอร์ต\n' +
    '   `  /add AAPL 150.50 10`\n' +
    '   → เพิ่ม Apple 10 หุ้น ราคา $150.50\n\n' +
    
    '📊 */portfolio* - ดูพอร์ตทั้งหมด\n' +
    '   `  /portfolio`\n' +
    '   → แสดงหุ้นทั้งหมดพร้อมกำไร/ขาดทุน\n\n' +
    
    '➖ */remove* ⭐ - ลด/ลบหุ้น (2 แบบ)\n' +
    '   `  /remove`\n' +
    '   → แสดงเมนูเลือกหุ้น (ใช้ปุ่ม)\n' +
    '   `  /remove AAPL 5`\n' +
    '   → ลด Apple 5 หุ้น\n' +
    '   `  /remove AAPL all`\n' +
    '   → ลบ Apple ทั้งหมด\n' +
    
    '🗑️ */clear* - ล้างพอร์ตทั้งหมด\n' +
    '   `  /clear`\n' +
    '   → ลบหุ้นทั้งหมด (ยืนยัน 2 ครั้ง)\n\n' +
    
    '━━━━ 📈 *ข้อมูลหุ้น* ━━━━\n\n' +
    
    '🔍 */check* - ตรวจสอบราคาหุ้น\n' +
    '   `  /check TSLA`\n' +
    '   → ดูราคาปัจจุบันของ Tesla\n\n' +
    
    '📰 */news* - ข่าวสารหุ้น\n' +
    '   `  /news AAPL`\n' +
    '   → ดูข่าวล่าสุดของ Apple\n\n' +
    
    '━━━━ 👁️ *รายการติดตาม* ━━━━\n\n' +
    
    '��️ */watch* ⭐ - เพิ่มหุ้นเข้ารายการติดตาม\n' +
    '   `  /watch AAPL`\n' +
    '   → เพิ่ม Apple เข้ารายการติดตาม\n' +
    '   → แจ้งเตือนที่ ±3% และ ±5%\n\n' +
    
    '📝 */watchlist* ⭐ - ดูรายการติดตาม\n' +
    '   `  /watchlist`\n' +

    '   → ดูข่าวล่าสุดของ Apple\n\n' +
    
    '━━━━ ⚙️ *อื่นๆ* ━━━━\n\n' +
    
    '🎯 */menu* ⭐ - เมนูด่วน\n' +
    '   `  /menu`\n' +
    '   → แสดงปุ่มเมนูด่วน (ไม่ต้องพิมพ์)\n\n' +
    
    '❓ */help* - แสดงความช่วยเหลือ\n' +
    '   `  /help`\n' +
    '   → แสดงหน้านี้\n\n' +
    
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '⭐ = ฟีเจอร์ใหม่\n' +
    '💡 กดปุ่มเมนูด่านล่างเพื่อเริ่มใช้งาน\n' +
    'หรือพิมพ์ /menu เพื่อแสดงเมนูด่วน';

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Handle callback queries (inline button clicks)
bot.action(/^remove_select_/, handleRemoveSelect);
bot.action(/^remove_partial_/, handleRemovePartial);
bot.action(/^remove_all_/, handleRemoveAll);
bot.action(/^remove_confirm_/, handleRemoveConfirm);
bot.action(/^remove_direct_confirm_/, handleRemoveDirectConfirm);
bot.action('remove_all_confirm_1', handleRemoveAllConfirm1);
bot.action('remove_all_confirm_2', handleRemoveAllConfirm2);
bot.action('remove_cancel', handleRemoveCancel);

bot.action('clear_confirm_1', handleClearConfirm1);
bot.action('clear_confirm_2', handleClearConfirm2);
bot.action('clear_cancel', handleClearCancel);

bot.action(/^unwatch_(?!all|cancel)/, handleUnwatchAction);
bot.action('unwatch_all_confirm', handleUnwatchAllConfirm);
bot.action('unwatch_all_execute', handleUnwatchAllExecute);
bot.action('unwatch_cancel', handleUnwatchCancel);

// Handle help example buttons
bot.action('help_add_example', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💡 *ตัวอย่างคำสั่ง /add*\n\n' +
    '`/add AAPL 150.50 10`\n' +
    '→ เพิ่ม Apple 10 หุ้น ราคา $150.50\n\n' +
    '`/add TSLA 220 5`\n' +
    '→ เพิ่ม Tesla 5 หุ้น ราคา $220\n\n' +
    '`/add MSFT 330.25 8`\n' +
    '→ เพิ่ม Microsoft 8 หุ้น ราคา $330.25',
    { parse_mode: 'Markdown' }
  );
});

bot.action('help_check_example', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💡 *ตัวอย่างคำสั่ง /check*\n\n' +
    '`/check AAPL`\n' +
    '→ ดูราคาปัจจุบันของ Apple\n\n' +
    '`/check TSLA`\n' +
    '→ ดูราคาปัจจุบันของ Tesla\n\n' +
    '`/check GOOGL`\n' +
    '→ ดูราคาปัจจุบันของ Google',
    { parse_mode: 'Markdown' }
  );
});

bot.action('help_news_example', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💡 *ตัวอย่างคำสั่ง /news*\n\n' +
    '`/news AAPL`\n' +
    '   → ดูข่าวล่าสุดของ Apple\n\n' +
    
    '━━━━ 👁️ *รายการติดตาม* ━━━━\n\n' +
    
    '��️ */watch* ⭐ - เพิ่มหุ้นเข้ารายการติดตาม\n' +
    '   `  /watch AAPL`\n' +
    '   → เพิ่ม Apple เข้ารายการติดตาม\n' +
    '   → แจ้งเตือนที่ ±3% และ ±5%\n\n' +
    
    '📝 */watchlist* ⭐ - ดูรายการติดตาม\n' +
    '   `  /watchlist`\n' +

    '→ ดูข่าวล่าสุดของ Apple\n\n' +
    '`/news TSLA`\n' +
    '→ ดูข่าวล่าสุดของ Tesla\n\n' +
    '`/news NVDA`\n' +
    '→ ดูข่าวล่าสุดของ NVIDIA',
    { parse_mode: 'Markdown' }
  );
});

bot.action('help_close', async (ctx) => {
  await ctx.answerCbQuery('ปิดแล้ว');
  try {
    await ctx.deleteMessage();
  } catch (error) {
    // Ignore error if message is too old
  }
});

// Handle reply keyboard button clicks
bot.hears('📊 ดูพอร์ต', handlePortfolioCommand);
bot.hears('➕ เพิ่มหุ้น', async (ctx) => {
  const buttons = [
    [Markup.button.callback('💡 ดูตัวอย่าง', 'help_add_example')],
    [Markup.button.callback('❌ ปิด', 'help_close')]
  ];

  await ctx.reply(
    '➕ *เพิ่มหุ้นเข้าพอร์ต*\n\n' +
    'ใช้: `/add <symbol> <ราคาซื้อ> <จำนวน>`\n\n' +
    '📝 *วิธีใช้:*\n' +
    '1️⃣ พิมพ์ /add\n' +
    '2️⃣ ตามด้วยสัญลักษณ์หุ้น เช่น AAPL\n' +
    '3️⃣ ราคาซื้อ เช่น 150.50\n' +
    '4️⃣ จำนวนหุ้น เช่น 10\n\n' +
    '✅ ตัวอย่าง:\n' +
    '`/add AAPL 150.50 10`',
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});
bot.hears('➖ ลดหุ้น', handleRemoveCommand);
bot.hears('🔍 เช็คราคา', async (ctx) => {
  const buttons = [
    [Markup.button.callback('💡 ดูตัวอย่าง', 'help_check_example')],
    [Markup.button.callback('❌ ปิด', 'help_close')]
  ];

  await ctx.reply(
    '🔍 *ตรวจสอบราคาหุ้น*\n\n' +
    'ใช้: `/check <symbol>`\n\n' +
    '📝 *วิธีใช้:*\n' +
    '1️⃣ พิมพ์ /check\n' +
    '2️⃣ ตามด้วยสัญลักษณ์หุ้น\n\n' +
    '✅ ตัวอย่าง:\n' +
    '`/check TSLA` - เช็คราคา Tesla\n' +
    '`/check AAPL` - เช็คราคา Apple',
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});
bot.hears('📰 ข่าวสาร', async (ctx) => {
  const buttons = [
    [Markup.button.callback('💡 ดูตัวอย่าง', 'help_news_example')],
    [Markup.button.callback('❌ ปิด', 'help_close')]
  ];

  await ctx.reply(
    '📰 *ข่าวสารหุ้น*\n\n' +
    'ใช้: `/news <symbol>`\n\n' +
    '📝 *วิธีใช้:*\n' +
    '1️⃣ พิมพ์ /news\n' +
    '2️⃣ ตามด้วยสัญลักษณ์หุ้น\n\n' +
    '✅ ตัวอย่าง:\n' +
    '`/news AAPL` - ข่าว Apple\n' +
    '   → ดูข่าวล่าสุดของ Apple\n\n' +
    
    '━━━━ 👁️ *รายการติดตาม* ━━━━\n\n' +
    
    '��️ */watch* ⭐ - เพิ่มหุ้นเข้ารายการติดตาม\n' +
    '   `  /watch AAPL`\n' +
    '   → เพิ่ม Apple เข้ารายการติดตาม\n' +
    '   → แจ้งเตือนที่ ±3% และ ±5%\n\n' +
    
    '📝 */watchlist* ⭐ - ดูรายการติดตาม\n' +
    '   `  /watchlist`\n' +

    '`/news TSLA` - ข่าว Tesla',
    { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
});
bot.hears('👁️ รายการติดตาม', async (ctx) => {
  await handleWatchlistCommand(ctx);
});
bot.hears('❓ ช่วยเหลือ', async (ctx) => {
  const helpMessage = 
    '📋 *คำสั่งทั้งหมดพร้อมวิธีใช้*\n\n' +
    
    '━━━━ 📊 *การจัดการพอร์ต* ━━━━\n\n' +
    
    '➕ */add* - เพิ่มหุ้นเข้าพอร์ต\n' +
    '   `  /add AAPL 150.50 10`\n' +
    '   → เพิ่ม Apple 10 หุ้น ราคา $150.50\n\n' +
    
    '📊 */portfolio* - ดูพอร์ตทั้งหมด\n' +
    '   `  /portfolio`\n' +
    '   → แสดงหุ้นทั้งหมดพร้อมกำไร/ขาดทุน\n\n' +
    
    '➖ */remove* ⭐ - ลด/ลบหุ้น (2 แบบ)\n' +
    '   `  /remove`\n' +
    '   → แสดงเมนูเลือกหุ้น (ใช้ปุ่ม)\n' +
    '   `  /remove AAPL 5`\n' +
    '   → ลด Apple 5 หุ้น\n' +
    '   `  /remove AAPL all`\n' +
    '   → ลบ Apple ทั้งหมด\n' +
    
    '🗑️ */clear* - ล้างพอร์ตทั้งหมด\n' +
    '   `  /clear`\n' +
    '   → ลบหุ้นทั้งหมด (ยืนยัน 2 ครั้ง)\n\n' +
    
    '━━━━ 📈 *ข้อมูลหุ้น* ━━━━\n\n' +
    
    '🔍 */check* - ตรวจสอบราคาหุ้น\n' +
    '   `  /check TSLA`\n' +
    '   → ดูราคาปัจจุบันของ Tesla\n\n' +
    
    '📰 */news* - ข่าวสารหุ้น\n' +
    '   `  /news AAPL`\n' +
    '   → ดูข่าวล่าสุดของ Apple\n\n' +
    
    '━━━━ 👁️ *รายการติดตาม* ━━━━\n\n' +
    
    '��️ */watch* ⭐ - เพิ่มหุ้นเข้ารายการติดตาม\n' +
    '   `  /watch AAPL`\n' +
    '   → เพิ่ม Apple เข้ารายการติดตาม\n' +
    '   → แจ้งเตือนที่ ±3% และ ±5%\n\n' +
    
    '📝 */watchlist* ⭐ - ดูรายการติดตาม\n' +
    '   `  /watchlist`\n' +

    '   → ดูข่าวล่าสุดของ Apple\n\n' +
    
    '━━━━ ⚙️ *อื่นๆ* ━━━━\n\n' +
    
    '🎯 */menu* ⭐ - เมนูด่วน\n' +
    '   `  /menu`\n' +
    '   → แสดงปุ่มเมนูด่วน (ไม่ต้องพิมพ์)\n\n' +
    
    '❓ */help* - แสดงความช่วยเหลือ\n' +
    '   `  /help`\n' +
    '   → แสดงหน้านี้\n\n' +
    
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '⭐ = ฟีเจอร์ใหม่\n' +
    '💡 กดปุ่มเมนูด่านล่างเพื่อเริ่มใช้งาน\n' +
    'หรือพิมพ์ /menu เพื่อแสดงเมนูด่วน';

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Handle text input (for remove quantity or unknown commands)
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Check if this is quantity input for remove command
  const handled = await handleTextInput(ctx);
  if (handled) return;
  
  // Handle unknown commands
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

// Check watchlist price alerts
async function checkWatchlistAlerts() {
  try {
    console.log('🔍 Checking watchlist alerts...');
    
    const watchlistStocks = await getAllWatchlistStocks();
    
    if (!watchlistStocks || watchlistStocks.length === 0) {
      console.log('No stocks in watchlist to check');
      return;
    }

    // Group stocks by symbol to avoid multiple API calls
    const stocksBySymbol = {};
    watchlistStocks.forEach(stock => {
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

        // Check each user's watchlist for this stock
        for (const stock of stocks) {
          const basePrice = parseFloat(stock.base_price);
          const currentPrice = quote.currentPrice;
          const percentChange = calculatePriceChange(currentPrice, basePrice);
          const absChange = Math.abs(percentChange);

          let shouldSend3Alert = false;
          let shouldSend5Alert = false;

          // Check for ±3% alert (only if not sent before)
          if (!stock.alert_3_sent && absChange >= 3) {
            shouldSend3Alert = true;
          }

          // Check for ±5% alert (only if not sent before)
          if (!stock.alert_5_sent && absChange >= 5) {
            shouldSend5Alert = true;
          }

          // Send 3% alert
          if (shouldSend3Alert && !shouldSend5Alert) {
            await sendWatchlistAlert(stock.telegram_id, {
              symbol: stock.symbol,
              currentPrice: currentPrice,
              basePrice: basePrice,
              percentChange: percentChange,
              alertLevel: 3
            });

            // Update alert status
            await updateWatchlistAlert(stock.id, true, false, currentPrice);
            console.log(`✅ 3% Alert sent for ${stock.symbol} to user ${stock.telegram_id}`);
          }

          // Send 5% alert (takes precedence over 3%)
          if (shouldSend5Alert) {
            await sendWatchlistAlert(stock.telegram_id, {
              symbol: stock.symbol,
              currentPrice: currentPrice,
              basePrice: basePrice,
              percentChange: percentChange,
              alertLevel: 5
            });

            // Update alert status (mark both 3% and 5% as sent)
            await updateWatchlistAlert(stock.id, true, true, currentPrice);
            console.log(`✅ 5% Alert sent for ${stock.symbol} to user ${stock.telegram_id}`);
          }
        }

        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        // Only log unexpected errors (not invalid symbols or rate limits)
        if (!error.message.includes('No data found') && !error.message.includes('rate limit')) {
          console.error(`Error checking watchlist ${symbol}:`, error.message);
        }
      }
    }

    console.log('✅ Watchlist alert check completed');

  } catch (error) {
    console.error('Error in checkWatchlistAlerts:', error);
  }
}

// Schedule price check every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('⏰ Running scheduled price check...');
  checkPriceAlerts();
  checkWatchlistAlerts();
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
