import { getOrCreateUser, getPortfolio, removeFromPortfolio } from '../db.js';
import { Markup } from 'telegraf';

// Store temporary data for multi-step interactions
const userSessions = new Map();

/**
 * Handle /remove command
 * Supports:
 * - /remove → Show UI
 * - /remove all → Remove all portfolio
 * - /remove AAPL 5 → Remove 5 shares of AAPL
 * - /remove AAPL all → Remove all AAPL shares
 */
export async function handleRemoveCommand(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Parse command arguments
    const args = ctx.message.text.split(' ').slice(1);

    // Case 1: /remove all → Remove entire portfolio
    if (args.length === 1 && args[0].toLowerCase() === 'all') {
      return await handleRemoveAllPortfolio(ctx, user);
    }

    // Case 2: /remove AAPL 5 → Remove 5 shares
    // Case 3: /remove AAPL all → Remove all AAPL shares
    if (args.length >= 2) {
      const symbol = args[0].toUpperCase();
      const qtyOrAll = args[1].toLowerCase();

      // Get stock from portfolio
      const portfolio = await getPortfolio(user.id);
      const stock = portfolio.find(s => s.symbol === symbol);

      if (!stock) {
        return ctx.reply(
          `❌ ไม่พบหุ้น ${symbol} ในพอร์ตของคุณ\n\n` +
          'ใช้ /portfolio เพื่อดูพอร์ตปัจจุบัน',
          { parse_mode: 'Markdown' }
        );
      }

      const currentQty = parseFloat(stock.qty);
      const avgPrice = parseFloat(stock.buy_price);

      if (qtyOrAll === 'all') {
        // Remove all shares of this symbol
        return await handleDirectRemove(ctx, user, symbol, currentQty, avgPrice, true);
      } else {
        // Remove specific quantity
        const qty = parseFloat(qtyOrAll);
        
        if (isNaN(qty) || qty <= 0) {
          return ctx.reply(
            '❌ *จำนวนไม่ถูกต้อง*\n\n' +
            'ใช้: `/remove AAPL 5` หรือ `/remove AAPL all`',
            { parse_mode: 'Markdown' }
          );
        }

        if (qty > currentQty) {
          return ctx.reply(
            `❌ *จำนวนไม่เพียงพอ*\n\n` +
            `คุณมี ${symbol} จำนวน ${currentQty} หุ้น\n` +
            `ต้องการลด ${qty} หุ้น`,
            { parse_mode: 'Markdown' }
          );
        }

        return await handleDirectRemove(ctx, user, symbol, qty, avgPrice, false);
      }
    }

    // Case 4: /remove → Show UI for selection
    const portfolio = await getPortfolio(user.id);

    if (!portfolio || portfolio.length === 0) {
      return ctx.reply(
        '📊 *พอร์ตว่างเปล่า*\n\n' +
        'คุณยังไม่มีหุ้นในพอร์ต\n' +
        'ใช้ /add เพื่อเพิ่มหุ้น',
        { parse_mode: 'Markdown' }
      );
    }

    // Create inline keyboard with stock buttons
    const buttons = portfolio.map(stock => {
      const qty = parseFloat(stock.qty);
      const price = parseFloat(stock.buy_price);
      return [
        Markup.button.callback(
          `${stock.symbol} - ${qty} หุ้น @ $${price.toFixed(2)}`,
          `remove_select_${stock.symbol}`
        )
      ];
    });

    // Add cancel button
    buttons.push([Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]);

    await ctx.reply(
      '📊 *เลือกหุ้นที่ต้องการลด/ลบ*\n\n' +
      'กดเลือกหุ้นจากรายการด้านล่าง:\n\n' +
      '💡 *เคล็ดลับ:*\n' +
      '`/remove AAPL 5` - ลด AAPL 5 หุ้น\n' +
      '`/remove AAPL all` - ลบ AAPL ทั้งหมด\n' +
      '`/remove all` - ลบพอร์ตทั้งหมด',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

  } catch (error) {
    console.error('Error in handleRemoveCommand:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle direct remove (typed command)
 */
async function handleDirectRemove(ctx, user, symbol, qty, avgPrice, isAll) {
  try {
    const buttons = [
      [Markup.button.callback('✅ ยืนยัน', `remove_direct_confirm_${symbol}_${qty}`)],
      [Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]
    ];

    const message = isAll
      ? `⚠️ *ยืนยันการลบหุ้น*\n\n` +
        `📊 ${symbol}\n` +
        `🗑️ ลบทั้งหมด: ${qty} หุ้น\n` +
        `💰 ราคาเฉลี่ย: $${avgPrice.toFixed(2)}\n\n` +
        '⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้'
      : `⚠️ *ยืนยันการลดหุ้น*\n\n` +
        `📊 ${symbol}\n` +
        `➖ ลดไป: ${qty} หุ้น\n` +
        `💰 ราคาเฉลี่ย: $${avgPrice.toFixed(2)} (ไม่เปลี่ยนแปลง)\n\n` +
        '⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

  } catch (error) {
    console.error('Error in handleDirectRemove:', error);
    throw error;
  }
}

/**
 * Handle /remove all → Remove entire portfolio
 */
async function handleRemoveAllPortfolio(ctx, user) {
  try {
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

    const buttons = [
      [Markup.button.callback('⚠️ ยืนยันล้างพอร์ต', 'remove_all_confirm_1')],
      [Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]
    ];

    await ctx.reply(
      `⚠️ *ล้างพอร์ตทั้งหมด*\n\n` +
      `คุณกำลังจะลบหุ้น *${portfolio.length} รายการ*:\n\n` +
      `${stockList}\n` +
      `💰 มูลค่ารวม: $${totalValue.toFixed(2)}\n\n` +
      `⚠️ *คำเตือน:* การดำเนินการนี้ไม่สามารถยกเลิกได้!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

  } catch (error) {
    console.error('Error in handleRemoveAllPortfolio:', error);
    throw error;
  }
}

/**
 * Handle stock selection callback
 */
export async function handleRemoveSelect(ctx) {
  try {
    const symbol = ctx.callbackQuery.data.replace('remove_select_', '');
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Get portfolio to show current quantity
    const portfolio = await getPortfolio(user.id);
    const stock = portfolio.find(s => s.symbol === symbol);

    if (!stock) {
      await ctx.answerCbQuery('❌ ไม่พบหุ้นนี้ในพอร์ต');
      return;
    }

    const qty = parseFloat(stock.qty);
    const price = parseFloat(stock.buy_price);

    // Store session data
    userSessions.set(telegramId, {
      action: 'remove',
      symbol: symbol,
      currentQty: qty,
      avgPrice: price,
      userId: user.id
    });

    // Show options: partial or full remove
    const buttons = [
      [Markup.button.callback('➖ ลดบางส่วน', `remove_partial_${symbol}`)],
      [Markup.button.callback('🗑️ ลบทั้งหมด', `remove_all_${symbol}`)],
      [Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]
    ];

    await ctx.editMessageText(
      `🎯 *${symbol}*\n\n` +
      `📊 จำนวนปัจจุบัน: ${qty} หุ้น\n` +
      `💰 ราคาเฉลี่ย: $${price.toFixed(2)}\n` +
      `💵 มูลค่ารวม: $${(qty * price).toFixed(2)}\n\n` +
      'คุณต้องการ:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error in handleRemoveSelect:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle partial remove - ask for quantity
 */
export async function handleRemovePartial(ctx) {
  try {
    const symbol = ctx.callbackQuery.data.replace('remove_partial_', '');
    const telegramId = ctx.from.id.toString();
    const session = userSessions.get(telegramId);

    if (!session || session.symbol !== symbol) {
      await ctx.answerCbQuery('❌ Session หมดอายุ กรุณาเริ่มใหม่');
      return;
    }

    // Update session state
    session.waitingForQty = true;
    userSessions.set(telegramId, session);

    await ctx.editMessageText(
      `➖ *ลดจำนวนหุ้น ${symbol}*\n\n` +
      `📊 จำนวนปัจจุบัน: ${session.currentQty} หุ้น\n\n` +
      `กรุณาพิมพ์จำนวนที่ต้องการลด:\n` +
      `(ตัวเลขเท่านั้น เช่น 5)`,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error in handleRemovePartial:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle full remove - show confirmation
 */
export async function handleRemoveAll(ctx) {
  try {
    const symbol = ctx.callbackQuery.data.replace('remove_all_', '');
    const telegramId = ctx.from.id.toString();
    const session = userSessions.get(telegramId);

    if (!session || session.symbol !== symbol) {
      await ctx.answerCbQuery('❌ Session หมดอายุ กรุณาเริ่มใหม่');
      return;
    }

    // Show confirmation
    const buttons = [
      [Markup.button.callback('✅ ยืนยันลบ', `remove_confirm_all_${symbol}`)],
      [Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]
    ];

    await ctx.editMessageText(
      `⚠️ *ยืนยันการลบหุ้น*\n\n` +
      `📊 ${symbol}\n` +
      `🗑️ ลบทั้งหมด: ${session.currentQty} หุ้น\n` +
      `💰 ราคาเฉลี่ย: $${session.avgPrice.toFixed(2)}\n\n` +
      '⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error in handleRemoveAll:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle text input for quantity
 */
export async function handleTextInput(ctx) {
  const telegramId = ctx.from.id.toString();
  const session = userSessions.get(telegramId);

  // Check if user is in remove flow waiting for quantity
  if (!session || !session.waitingForQty) {
    return false; // Not handling this text
  }

  try {
    const qtyInput = parseFloat(ctx.message.text);

    // Validate input
    if (isNaN(qtyInput) || qtyInput <= 0) {
      await ctx.reply(
        '❌ กรุณาระบุจำนวนที่ถูกต้อง\n' +
        'ตัวอย่าง: 5'
      );
      return true;
    }

    if (qtyInput > session.currentQty) {
      await ctx.reply(
        `❌ จำนวนไม่เพียงพอ\n\n` +
        `คุณมี ${session.currentQty} หุ้น\n` +
        `พยายามลด ${qtyInput} หุ้น\n\n` +
        'กรุณาระบุจำนวนใหม่:'
      );
      return true;
    }

    // Store quantity and show confirmation
    session.removeQty = qtyInput;
    session.waitingForQty = false;
    userSessions.set(telegramId, session);

    const remainingQty = session.currentQty - qtyInput;
    const buttons = [
      [Markup.button.callback('✅ ยืนยัน', `remove_confirm_partial_${session.symbol}`)],
      [Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]
    ];

    await ctx.reply(
      `⚠️ *ยืนยันการลดหุ้น*\n\n` +
      `📊 ${session.symbol}\n` +
      `➖ ลดไป: ${qtyInput} หุ้น\n` +
      `📊 จาก: ${session.currentQty} หุ้น\n` +
      `📊 เหลือ: ${remainingQty} หุ้น\n` +
      `💰 ราคาเฉลี่ย: $${session.avgPrice.toFixed(2)} (ไม่เปลี่ยนแปลง)\n\n` +
      '⚠️ การดำเนินการนี้ไม่สามารถยกเลิกได้',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      }
    );

    return true; // Handled

  } catch (error) {
    console.error('Error in handleTextInput:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
    return true;
  }
}

/**
 * Confirm and execute removal
 */
export async function handleRemoveConfirm(ctx) {
  try {
    const data = ctx.callbackQuery.data;
    const telegramId = ctx.from.id.toString();
    const session = userSessions.get(telegramId);

    if (!session) {
      await ctx.answerCbQuery('❌ Session หมดอายุ กรุณาเริ่มใหม่');
      return;
    }

    const isPartial = data.includes('_partial_');
    const symbol = session.symbol;
    const qtyToRemove = isPartial ? session.removeQty : session.currentQty;

    // Execute removal
    const result = await removeFromPortfolio(session.userId, symbol, qtyToRemove);

    // Clear session
    userSessions.delete(telegramId);

    // Show success message
    let message = '✅ *ลดหุ้นสำเร็จ!*\n\n';
    message += `📊 *${symbol}*\n`;
    message += `➖ ลดไป: ${result.removedQty} หุ้น\n`;
    message += `💰 ราคาเฉลี่ย: $${result.avgPrice.toFixed(2)}\n\n`;

    if (result.fullyRemoved) {
      message += `🗑️ *ลบออกจากพอร์ตแล้ว*\n`;
    } else {
      message += `📊 *คงเหลือ*\n`;
      message += `┣ จำนวน: ${result.remainingQty} หุ้น\n`;
      message += `┗ มูลค่า: $${(result.remainingQty * result.avgPrice).toFixed(2)}\n\n`;
    }

    message += 'ใช้ /portfolio เพื่อดูพอร์ตทั้งหมด';

    await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    await ctx.answerCbQuery('✅ ดำเนินการสำเร็จ');

  } catch (error) {
    console.error('Error in handleRemoveConfirm:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle cancel action
 */
export async function handleRemoveCancel(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    userSessions.delete(telegramId);

    await ctx.editMessageText(
      '❌ *ยกเลิกแล้ว*\n\n' +
      'ใช้ /remove เพื่อเริ่มใหม่',
      { parse_mode: 'Markdown' }
    );
    await ctx.answerCbQuery('ยกเลิกแล้ว');

  } catch (error) {
    console.error('Error in handleRemoveCancel:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle direct remove confirmation
 */
export async function handleRemoveDirectConfirm(ctx) {
  try {
    const data = ctx.callbackQuery.data;
    const parts = data.replace('remove_direct_confirm_', '').split('_');
    const symbol = parts[0];
    const qty = parseFloat(parts[1]);

    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Execute removal
    const result = await removeFromPortfolio(user.id, symbol, qty);

    // Show success message
    let message = '✅ *ลดหุ้นสำเร็จ!*\n\n';
    message += `📊 *${symbol}*\n`;
    message += `➖ ลดไป: ${result.removedQty} หุ้น\n`;
    message += `💰 ราคาเฉลี่ย: $${result.avgPrice.toFixed(2)}\n\n`;

    if (result.fullyRemoved) {
      message += `🗑️ *ลบออกจากพอร์ตแล้ว*\n`;
    } else {
      message += `📊 *คงเหลือ*\n`;
      message += `┣ จำนวน: ${result.remainingQty} หุ้น\n`;
      message += `┗ มูลค่า: $${(result.remainingQty * result.avgPrice).toFixed(2)}\n\n`;
    }

    message += 'ใช้ /portfolio เพื่อดูพอร์ตทั้งหมด';

    await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    await ctx.answerCbQuery('✅ ดำเนินการสำเร็จ');

  } catch (error) {
    console.error('Error in handleRemoveDirectConfirm:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

/**
 * Handle /remove all confirmation (first step)
 */
export async function handleRemoveAllConfirm1(ctx) {
  try {
    const buttons = [
      [Markup.button.callback('🗑️ ยืนยันอีกครั้ง - ล้างพอร์ต', 'remove_all_confirm_2')],
      [Markup.button.callback('❌ ยกเลิก', 'remove_cancel')]
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
    console.error('Error in handleRemoveAllConfirm1:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
  }
}

/**
 * Handle /remove all confirmation (second step - execute)
 */
export async function handleRemoveAllConfirm2(ctx) {
  try {
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Get all stocks first
    const portfolio = await getPortfolio(user.id);
    
    if (!portfolio || portfolio.length === 0) {
      await ctx.editMessageText(
        '📊 *พอร์ตว่างเปล่าอยู่แล้ว*\n\n' +
        'ไม่มีข้อมูลให้ลบ',
        { parse_mode: 'Markdown' }
      );
      await ctx.answerCbQuery('พอร์ตว่างเปล่า');
      return;
    }

    // Remove all stocks one by one
    const deletedStocks = [];
    for (const stock of portfolio) {
      const qty = parseFloat(stock.qty);
      await removeFromPortfolio(user.id, stock.symbol, qty);
      deletedStocks.push(stock.symbol);
    }

    await ctx.editMessageText(
      `✅ *ล้างพอร์ตสำเร็จ!*\n\n` +
      `🗑️ ลบหุ้นแล้ว: ${deletedStocks.length} รายการ\n` +
      `(${deletedStocks.join(', ')})\n\n` +
      `พอร์ตของคุณว่างเปล่าแล้ว\n` +
      `ใช้ /add เพื่อเพิ่มหุ้นใหม่`,
      { parse_mode: 'Markdown' }
    );

    await ctx.answerCbQuery('✅ ล้างพอร์ตสำเร็จ');

  } catch (error) {
    console.error('Error in handleRemoveAllConfirm2:', error);
    await ctx.answerCbQuery('❌ เกิดข้อผิดพลาด');
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}

export default {
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
};
