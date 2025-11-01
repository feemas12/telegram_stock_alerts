import { getStockNews, formatNewsMessage } from '../services/marketaux.js';

/**
 * Handle /news command
 * Usage: /news <symbol>
 * Example: /news AAPL
 */
export async function handleNewsCommand(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      return ctx.reply(
        '❌ *รูปแบบคำสั่งไม่ถูกต้อง*\n\n' +
        'ใช้: `/news <symbol>`\n\n' +
        'ตัวอย่าง:\n' +
        '`/news AAPL`\n' +
        '`/news TSLA`',
        { parse_mode: 'Markdown' }
      );
    }

    const symbol = args[0].toUpperCase();

    // Show loading message
    const loadingMsg = await ctx.reply(`📰 กำลังค้นหาข่าว ${symbol}...`);

    // Get news
    const news = await getStockNews(symbol, 5);

    // Format message
    const message = formatNewsMessage(news, symbol);

    // Delete loading message and send result
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
    
    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });

  } catch (error) {
    // Only log unexpected errors (not rate limits)
    if (!error.message.includes('rate limit')) {
      console.error('Error in handleNewsCommand:', error);
    }
    
    if (error.message.includes('rate limit')) {
      await ctx.reply('❌ API มีการใช้งานเกินขีดจำกัด กรุณาลองใหม่ในภายหลัง');
    } else {
      await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
    }
  }
}
