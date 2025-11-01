import { getOrCreateUser, getStockFromPortfolio } from '../db.js';
import { getStockQuote } from '../services/finnhub.js';
import { formatStockCheckMessage } from '../services/telegram.js';

/**
 * Handle /check command
 * Usage: /check <symbol>
 * Example: /check AAPL
 */
export async function handleCheckCommand(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      return ctx.reply(
        '❌ *รูปแบบคำสั่งไม่ถูกต้อง*\n\n' +
        'ใช้: `/check <symbol>`\n\n' +
        'ตัวอย่าง:\n' +
        '`/check AAPL`\n' +
        '`/check TSLA`',
        { parse_mode: 'Markdown' }
      );
    }

    const symbol = args[0].toUpperCase();

    // Show loading message
    const loadingMsg = await ctx.reply(`🔍 กำลังตรวจสอบราคา ${symbol}...`);

    // Get stock quote
    const stockData = await getStockQuote(symbol);

    // Check if stock is in user's portfolio
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);
    const portfolioData = await getStockFromPortfolio(user.id, symbol);

    // Format and send message
    const message = formatStockCheckMessage(stockData, portfolioData);
    
    // Delete loading message and send result
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    // Only log unexpected errors (not user input errors)
    if (!error.message.includes('No data found') && !error.message.includes('rate limit')) {
      console.error('Error in handleCheckCommand:', error);
    }
    
    if (error.message.includes('No data found')) {
      await ctx.reply('❌ ไม่พบข้อมูลหุ้น กรุณาตรวจสอบสัญลักษณ์หุ้น');
    } else if (error.message.includes('rate limit')) {
      await ctx.reply('❌ API มีการใช้งานเกินขีดจำกัด กรุณาลองใหม่ในภายหลัง');
    } else {
      await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
    }
  }
}
