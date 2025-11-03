import { getOrCreateUser, getPortfolio, clearPortfolio } from '../db.js';
import { Markup } from 'telegraf';

/**
 * Handle /clear command
 * Clear entire portfolio with double confirmation
 */
export async function handleClearCommand(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Get portfolio
    const portfolio = await getPortfolio(user.id);

    if (!portfolio || portfolio.length === 0) {
      return ctx.reply(
        '📊 *พอร์ตว่างเปล่า*\n\n' +
        'คุณไม่มีหุ้นในพอร์ต',
        { parse_mode: 'Markdown' }
      );
    }

    // Calculate total value
    let totalValue = 0;
    let stockList = '';
    portfolio.forEach(stock => {
      const qty = parseFloat(stock.qty);
      const price = parseFloat(stock.buy_price);
      const value = qty * price;
      totalValue += value;
      stockList += `• ${stock.symbol}: ${qty} หุ้น @ $${price.toFixed(2)}\n`;
    });

    // Show first confirmation
    const buttons = [
      [Markup.button.callback('⚠️ ยืนยันล้างพอร์ต', 'clear_confirm_1')],
      [Markup.button.callback('❌ ยกเลิก', 'clear_cancel')]
    ];

    await ctx.reply(
      `⚠️ *ล้างพอร์ตทั้งหมด*\n\n` +
      `คุณกำลังจะลบหุ้น *${portfolio.length} รายการ*:\n\n` +
      `${stockList}\n` +
      `💰 มูลค่ารวม: $${totalValue.toFixed(2)}\n\n` +
      `⚠️ *คำเตือน:* การดำเนินการนี้ไม่สามารถยกเลิกได้!\n` +
      `ข้อมูลทั้งหมดจะถูกลบออกจากพอร์ต`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

  } catch (error) {
    console.error('Error in handleClearCommand:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle first confirmation
 */
export async function handleClearConfirm1(ctx) {
  try {
    // Show second confirmation (double confirm)
    const buttons = [
      [Markup.button.callback('🗑️ ยืนยันอีกครั้ง - ล้างพอร์ต', 'clear_confirm_2')],
      [Markup.button.callback('❌ ยกเลิก', 'clear_cancel')]
    ];

    await ctx.editMessageText(
      `⚠️⚠️ *ยืนยันอีกครั้ง*\n\n` +
      `คุณแน่ใจหรือไม่ว่าต้องการล้างพอร์ตทั้งหมด?\n\n` +
      `⚠️ *การกระทำนี้ไม่สามารถกู้คืนได้!*\n\n` +
      `กดยืนยันอีกครั้งเพื่อดำเนินการ`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error in handleClearConfirm1:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle second confirmation and execute
 */
export async function handleClearConfirm2(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Execute clear
    const result = await clearPortfolio(user.id);

    if (!result.success) {
      await ctx.editMessageText(
        '📊 *พอร์ตว่างเปล่าอยู่แล้ว*\n\n' +
        'ไม่มีข้อมูลให้ลบ',
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('พอร์ตว่างเปล่า');
      return;
    }

    await ctx.editMessageText(
      `✅ *ล้างพอร์ตสำเร็จ!*\n\n` +
      `🗑️ ลบหุ้นแล้ว: ${result.deletedCount} รายการ\n\n` +
      `พอร์ตของคุณว่างเปล่าแล้ว\n` +
      `ใช้ /add เพื่อเพิ่มหุ้นใหม่`,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCbQuery('✅ ล้างพอร์ตสำเร็จ');

  } catch (error) {
    console.error('Error in handleClearConfirm2:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle cancel
 */
export async function handleClearCancel(ctx) {
  try {
    await ctx.editMessageText(
      '❌ *ยกเลิกแล้ว*\n\n' +
      'พอร์ตของคุณยังคงอยู่\n' +
      'ใช้ /portfolio เพื่อดูพอร์ต',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery('ยกเลิกแล้ว');

  } catch (error) {
    console.error('Error in handleClearCancel:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

export default {
  handleClearCommand,
  handleClearConfirm1,
  handleClearConfirm2,
  handleClearCancel
};
