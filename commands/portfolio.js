import { getOrCreateUser, getPortfolio } from '../db.js';
import { getStockQuote } from '../services/finnhub.js';
import { formatPortfolioMessage } from '../services/telegram.js';

/**
 * Handle /portfolio command
 * Display user's complete portfolio with current prices
 */
export async function handlePortfolioCommand(ctx) {
  try {
    // Get user
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Get portfolio
    const portfolio = await getPortfolio(user.id);

    if (!portfolio || portfolio.length === 0) {
      return ctx.reply(
        '📊 *พอร์ตของคุณ*\n\n' +
        'ยังไม่มีหุ้นในพอร์ต\n\n' +
        'ใช้ `/add <symbol> <buy_price> <qty>` เพื่อเพิ่มหุ้น\n\n' +
        'ตัวอย่าง:\n' +
        '`/add AAPL 180.5 10`',
        { parse_mode: 'Markdown' }
      );
    }

    // Show loading message
    const loadingMsg = await ctx.reply('📊 กำลังโหลดพอร์ต...');

    // Fetch current prices for all stocks
    const portfolioWithPrices = await Promise.all(
      portfolio.map(async (item) => {
        try {
          const quote = await getStockQuote(item.symbol);
          return {
            ...item,
            currentPrice: quote.currentPrice
          };
        } catch (error) {
          // Only log unexpected errors (not invalid symbols or rate limits)
          if (!error.message.includes('No data found') && !error.message.includes('rate limit')) {
            console.error(`Error fetching price for ${item.symbol}:`, error.message);
          }
          return {
            ...item,
            currentPrice: item.buy_price // Fallback to buy price if fetch fails
          };
        }
      })
    );

    // Format and send message
    const message = formatPortfolioMessage(portfolioWithPrices);
    
    // Delete loading message and send result
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error in handlePortfolioCommand:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}
