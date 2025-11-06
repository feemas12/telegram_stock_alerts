import { Markup } from 'telegraf';
import { 
  getOrCreateUser, 
  addToWatchlist, 
  getWatchlist, 
  removeFromWatchlist,
  clearWatchlist 
} from '../db.js';
import { getStockQuote } from '../services/finnhub.js';

/**
 * Handle /watch command - Add stock to watchlist
 * Usage: /watch AAPL
 */
export async function handleWatchCommand(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    const args = ctx.message.text.split(' ').slice(1);

    if (args.length === 0) {
      return ctx.reply(
        '📝 *วิธีใช้คำสั่ง /watch*\n\n' +
        'เพิ่มหุ้นเข้ารายการติดตาม:\n' +
        '`/watch AAPL`\n' +
        '`/watch TSLA`\n\n' +
        '💡 *การแจ้งเตือน:*\n' +
        '• แจ้งเตือนที่ ±3% (1 ครั้ง)\n' +
        '• แจ้งเตือนที่ ±5% (1 ครั้ง)\n\n' +
        'ใช้ /watchlist เพื่อดูรายการติดตามทั้งหมด',
        { parse_mode: 'Markdown' }
      );
    }

    const symbol = args[0].toUpperCase();

    // Validate symbol format
    if (!/^[A-Z]{1,5}$/.test(symbol)) {
      return ctx.reply(
        '❌ *รูปแบบสัญลักษณ์ไม่ถูกต้อง*\n\n' +
        'กรุณาใส่สัญลักษณ์หุ้นที่ถูกต้อง\n' +
        'ตัวอย่าง: `AAPL`, `TSLA`, `MSFT`',
        { parse_mode: 'Markdown' }
      );
    }

    // Show loading message
    const loadingMsg = await ctx.reply('⏳ กำลังเพิ่มหุ้นเข้ารายการติดตาม...');

    // Get current stock price
    const stockData = await getStockQuote(symbol);

    if (!stockData || !stockData.currentPrice || stockData.currentPrice === 0) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      return ctx.reply(
        `❌ *ไม่พบข้อมูลหุ้น ${symbol}*\n\n` +
        'กรุณาตรวจสอบสัญลักษณ์หุ้นและลองใหม่อีกครั้ง',
        { parse_mode: 'Markdown' }
      );
    }

    const currentPrice = stockData.currentPrice;

    // Add to watchlist
    await addToWatchlist(user.id, symbol, currentPrice);

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    // Send success message
    const changePercent = stockData.percentChange || 0;
    const changeValue = stockData.change || 0;
    const emoji = changePercent >= 0 ? '📈' : '📉';

    await ctx.reply(
      `✅ *เพิ่มหุ้นเข้ารายการติดตามแล้ว!*\n\n` +
      `${emoji} *${symbol}*\n` +
      `💰 ราคาปัจจุบัน: *$${currentPrice.toFixed(2)}*\n` +
      `${changePercent >= 0 ? '📊' : '📉'} เปลี่ยนแปลง: ${changeValue >= 0 ? '+' : ''}$${changeValue.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)\n\n` +
      `🔔 *การแจ้งเตือน:*\n` +
      `• ที่ ±3%: แจ้งเตือน 1 ครั้ง\n` +
      `• ที่ ±5%: แจ้งเตือนอีก 1 ครั้ง\n\n` +
      `ใช้ /watchlist เพื่อดูรายการติดตามทั้งหมด`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error in handleWatchCommand:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle /watchlist command - Show all watched stocks
 */
export async function handleWatchlistCommand(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    const watchlist = await getWatchlist(user.id);

    if (!watchlist || watchlist.length === 0) {
      return ctx.reply(
        '📝 *รายการติดตามว่างเปล่า*\n\n' +
        'คุณยังไม่มีหุ้นในรายการติดตาม\n\n' +
        '💡 ใช้ `/watch AAPL` เพื่อเพิ่มหุ้น',
        { parse_mode: 'Markdown' }
      );
    }

    // Show loading message
    const loadingMsg = await ctx.reply('⏳ กำลังโหลดรายการติดตาม...');

    let message = '📝 *รายการหุ้นที่คุณติดตาม*\n\n';
    const buttons = [];

    for (const stock of watchlist) {
      const symbol = stock.symbol;
      const basePrice = parseFloat(stock.base_price);
      
      // Get current price
      const stockData = await getStockQuote(symbol);
      const currentPrice = stockData?.currentPrice || basePrice;
      
      // Calculate change from base price
      const change = currentPrice - basePrice;
      const changePercent = (change / basePrice) * 100;
      
      const emoji = changePercent >= 0 ? '📈' : '📉';
      const sign = changePercent >= 0 ? '+' : '';

      message += `${emoji} *${symbol}*\n`;
      message += `   ราคาเริ่มต้น: $${basePrice.toFixed(2)}\n`;
      message += `   ราคาปัจจุบัน: $${currentPrice.toFixed(2)}\n`;
      message += `   เปลี่ยนแปลง: ${sign}${changePercent.toFixed(2)}%\n`;
      
      // Show alert status
      if (stock.alert_5_sent) {
        message += `   🔔 แจ้งแล้ว: ±3%, ±5%\n`;
      } else if (stock.alert_3_sent) {
        message += `   🔔 แจ้งแล้ว: ±3%\n`;
      }
      
      message += '\n';

      // Add remove button
      buttons.push([
        Markup.button.callback(
          `❌ ลบ ${symbol}`,
          `unwatch_${symbol}`
        )
      ]);
    }

    message += `📊 รวม: ${watchlist.length} รายการ\n\n`;
    message += '💡 กดปุ่มด้านล่างเพื่อลบหุ้นออกจากรายการติดตาม';

    // Add clear all button if there are stocks
    if (watchlist.length > 1) {
      buttons.push([
        Markup.button.callback('🗑️ ลบทั้งหมด', 'unwatch_all_confirm')
      ]);
    }

    // Delete loading message
    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

  } catch (error) {
    console.error('Error in handleWatchlistCommand:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle unwatch action - Remove stock from watchlist
 */
export async function handleUnwatchAction(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Extract symbol from callback data
    const symbol = ctx.callbackQuery.data.replace('unwatch_', '');

    const success = await removeFromWatchlist(user.id, symbol);

    if (success) {
      await ctx.editMessageText(
        `✅ *ลบหุ้นออกจากรายการติดตามแล้ว*\n\n` +
        `🗑️ ลบ *${symbol}* ออกจากรายการติดตามแล้ว\n\n` +
        `ใช้ /watchlist เพื่อดูรายการติดตาม`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.editMessageText(
        '❌ ไม่พบหุ้นในรายการติดตาม',
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.answerCbQuery('✅ ลบออกจากรายการติดตามแล้ว');

  } catch (error) {
    console.error('Error in handleUnwatchAction:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle unwatch all confirmation
 */
export async function handleUnwatchAllConfirm(ctx) {
  try {
    const buttons = [
      [Markup.button.callback('⚠️ ยืนยันลบทั้งหมด', 'unwatch_all_execute')],
      [Markup.button.callback('❌ ยกเลิก', 'unwatch_cancel')]
    ];

    await ctx.editMessageText(
      `⚠️ *ยืนยันการลบรายการติดตามทั้งหมด*\n\n` +
      `คุณแน่ใจหรือไม่ว่าต้องการลบหุ้นทั้งหมดออกจากรายการติดตาม?\n\n` +
      `⚠️ *การกระทำนี้ไม่สามารถกู้คืนได้!*`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error in handleUnwatchAllConfirm:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle unwatch all execution
 */
export async function handleUnwatchAllExecute(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    const result = await clearWatchlist(user.id);

    if (result.success) {
      await ctx.editMessageText(
        `✅ *ลบรายการติดตามทั้งหมดแล้ว!*\n\n` +
        `🗑️ ลบหุ้นแล้ว: ${result.deletedCount} รายการ\n\n` +
        `รายการติดตามของคุณว่างเปล่าแล้ว\n` +
        `ใช้ /watch เพื่อเพิ่มหุ้นใหม่`,
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('✅ ลบทั้งหมดสำเร็จ');
    } else {
      await ctx.editMessageText(
        '📝 *รายการติดตามว่างเปล่าอยู่แล้ว*',
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('รายการว่างเปล่า');
    }

  } catch (error) {
    console.error('Error in handleUnwatchAllExecute:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle cancel button
 */
export async function handleUnwatchCancel(ctx) {
  try {
    await ctx.editMessageText(
      '❌ *ยกเลิกการดำเนินการ*\n\n' +
      'ใช้ /watchlist เพื่อดูรายการติดตาม',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery('ยกเลิกแล้ว');
  } catch (error) {
    console.error('Error in handleUnwatchCancel:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

export default {
  handleWatchCommand,
  handleWatchlistCommand,
  handleUnwatchAction,
  handleUnwatchAllConfirm,
  handleUnwatchAllExecute,
  handleUnwatchCancel
};
