import { getOrCreateUser, addToPortfolio } from '../db.js';

/**
 * Handle /add command
 * Usage: /add <symbol> <buy_price> <qty>
 * Example: /add AAPL 180.5 10
 */
export async function handleAddCommand(ctx) {
  try {
    const args = ctx.message.text.split(' ').slice(1);

    if (args.length < 3) {
      return ctx.reply(
        '❌ *รูปแบบคำสั่งไม่ถูกต้อง*\n\n' +
        'ใช้: `/add <symbol> <buy_price> <qty>`\n\n' +
        'ตัวอย่าง:\n' +
        '`/add AAPL 180.5 10`\n' +
        '`/add TSLA 250.00 5`',
        { parse_mode: 'Markdown' }
      );
    }

    const [symbol, buyPriceStr, qtyStr] = args;
    const buyPrice = parseFloat(buyPriceStr);
    const qty = parseFloat(qtyStr);

    // Validate inputs
    if (!symbol || symbol.length > 10) {
      return ctx.reply('❌ สัญลักษณ์หุ้นไม่ถูกต้อง');
    }

    if (isNaN(buyPrice) || buyPrice <= 0) {
      return ctx.reply('❌ ราคาซื้อต้องเป็นตัวเลขที่มากกว่า 0');
    }

    if (isNaN(qty) || qty <= 0) {
      return ctx.reply('❌ จำนวนหุ้นต้องเป็นตัวเลขที่มากกว่า 0');
    }

    // Get or create user
    const telegramId = ctx.from.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Unknown';
    const user = await getOrCreateUser(telegramId, username);

    // Add to portfolio
    await addToPortfolio(user.id, symbol, buyPrice, qty);

    const totalValue = (buyPrice * qty).toFixed(2);
    
    await ctx.reply(
      `✅ *เพิ่มหุ้นสำเร็จ!*\n\n` +
      `📊 หุ้น: ${symbol.toUpperCase()}\n` +
      `💰 ราคาซื้อ: $${buyPrice.toFixed(2)}\n` +
      `📦 จำนวน: ${qty} หุ้น\n` +
      `💵 มูลค่ารวม: $${totalValue}\n\n` +
      `ใช้ /portfolio เพื่อดูพอร์ตทั้งหมด`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Error in handleAddCommand:', error);
    await ctx.reply('❌ เกิดข้อผิดพลาด: ' + error.message);
  }
}
