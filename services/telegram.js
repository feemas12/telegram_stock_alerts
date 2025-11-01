import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

let botInstance = null;

/**
 * Initialize and get bot instance
 * @returns {Telegraf} Bot instance
 */
export function getBotInstance() {
  if (!botInstance) {
    botInstance = new Telegraf(process.env.BOT_TOKEN);
  }
  return botInstance;
}

/**
 * Send message to a specific user
 * @param {string} telegramId - Telegram user ID
 * @param {string} message - Message to send
 * @param {Object} options - Additional options (parse_mode, etc.)
 */
export async function sendMessage(telegramId, message, options = {}) {
  try {
    const bot = getBotInstance();
    await bot.telegram.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...options
    });
  } catch (error) {
    console.error(`Error sending message to ${telegramId}:`, error.message);
    throw error;
  }
}

/**
 * Send alert message with formatted stock data
 * @param {string} telegramId - Telegram user ID
 * @param {Object} alertData - Alert data object
 */
export async function sendStockAlert(telegramId, alertData) {
  const { symbol, currentPrice, buyPrice, percentChange, qty } = alertData;
  
  // Convert to numbers to ensure toFixed works
  const price = parseFloat(currentPrice);
  const buy = parseFloat(buyPrice);
  const change = parseFloat(percentChange);
  const quantity = parseFloat(qty);
  
  const emoji = change >= 0 ? '📈' : '📉';
  const changeText = change >= 0 ? 'สูงกว่า' : 'ต่ำกว่า';
  const warningEmoji = Math.abs(change) >= 5 ? '⚠️' : '';
  
  const message = `
⚡ *${symbol} Alert* ${warningEmoji}

💰 ราคาปัจจุบัน: $${price.toFixed(2)}
📊 ราคาซื้อ: $${buy.toFixed(2)}
${emoji} เปลี่ยนแปลง: ${change > 0 ? '+' : ''}${change.toFixed(2)}%
📦 จำนวน: ${quantity} หุ้น

${changeText}ราคาซื้อของคุณ ${Math.abs(change).toFixed(1)}% แล้ว ${warningEmoji}
  `.trim();

  await sendMessage(telegramId, message);
}

/**
 * Format portfolio display
 * @param {Array} portfolio - Array of portfolio items with current prices
 * @returns {string} Formatted message
 */
export function formatPortfolioMessage(portfolio) {
  if (!portfolio || portfolio.length === 0) {
    return '📊 *พอร์ตของคุณ*\n\nยังไม่มีหุ้นในพอร์ต ใช้ /add เพื่อเพิ่มหุ้น';
  }

  let message = '📊 *พอร์ตของคุณ*\n\n';
  let totalInvestment = 0;
  let totalCurrentValue = 0;

  portfolio.forEach((item, index) => {
    // Convert MySQL DECIMAL to number
    const buyPrice = parseFloat(item.buy_price);
    const qty = parseFloat(item.qty);
    const currentPrice = parseFloat(item.currentPrice);
    
    const investment = buyPrice * qty;
    const currentValue = currentPrice * qty;
    const profitLoss = currentValue - investment;
    const profitLossPercent = ((currentValue - investment) / investment) * 100;

    totalInvestment += investment;
    totalCurrentValue += currentValue;

    const emoji = profitLoss >= 0 ? '📈' : '📉';
    const plSign = profitLoss >= 0 ? '+' : '';

    message += `*${index + 1}. ${item.symbol}*\n`;
    message += `   ราคาซื้อ: $${buyPrice.toFixed(2)} × ${qty}\n`;
    message += `   ราคาปัจจุบัน: $${currentPrice.toFixed(2)}\n`;
    message += `   ${emoji} ${plSign}$${profitLoss.toFixed(2)} (${plSign}${profitLossPercent.toFixed(2)}%)\n\n`;
  });

  const totalProfitLoss = totalCurrentValue - totalInvestment;
  const totalProfitLossPercent = ((totalCurrentValue - totalInvestment) / totalInvestment) * 100;
  const totalEmoji = totalProfitLoss >= 0 ? '📈' : '📉';
  const totalSign = totalProfitLoss >= 0 ? '+' : '';

  message += `━━━━━━━━━━━━━━━\n`;
  message += `💼 มูลค่าเริ่มต้น: $${totalInvestment.toFixed(2)}\n`;
  message += `💰 มูลค่าปัจจุบัน: $${totalCurrentValue.toFixed(2)}\n`;
  message += `${totalEmoji} *กำไร/ขาดทุนรวม: ${totalSign}$${totalProfitLoss.toFixed(2)} (${totalSign}${totalProfitLossPercent.toFixed(2)}%)*`;

  return message;
}

/**
 * Format stock check message
 * @param {Object} stockData - Stock data
 * @param {Object} portfolioData - Portfolio data (optional)
 * @returns {string} Formatted message
 */
export function formatStockCheckMessage(stockData, portfolioData = null) {
  let message = `📊 *${stockData.symbol}*\n\n`;
  message += `💰 ราคาปัจจุบัน: $${stockData.currentPrice.toFixed(2)}\n`;
  message += `📈 สูงสุดวันนี้: $${stockData.high.toFixed(2)}\n`;
  message += `📉 ต่ำสุดวันนี้: $${stockData.low.toFixed(2)}\n`;
  message += `🔓 เปิดวันนี้: $${stockData.open.toFixed(2)}\n`;
  message += `🔒 ปิดเมื่อวาน: $${stockData.previousClose.toFixed(2)}\n\n`;

  const changeEmoji = stockData.change >= 0 ? '📈' : '📉';
  const changeSign = stockData.change >= 0 ? '+' : '';
  message += `${changeEmoji} เปลี่ยนแปลง: ${changeSign}$${stockData.change.toFixed(2)} (${changeSign}${stockData.percentChange.toFixed(2)}%)\n`;

  if (portfolioData) {
    // Convert MySQL DECIMAL to number
    const buyPrice = parseFloat(portfolioData.buy_price);
    const qty = parseFloat(portfolioData.qty);
    
    const profitLoss = (stockData.currentPrice - buyPrice) * qty;
    const profitLossPercent = ((stockData.currentPrice - buyPrice) / buyPrice) * 100;
    const plEmoji = profitLoss >= 0 ? '💚' : '❤️';
    const plSign = profitLoss >= 0 ? '+' : '';

    message += `\n━━━━━━━━━━━━━━━\n`;
    message += `📦 *ในพอร์ตของคุณ:*\n`;
    message += `   ราคาซื้อ: $${buyPrice.toFixed(2)}\n`;
    message += `   จำนวน: ${qty} หุ้น\n`;
    message += `   ${plEmoji} กำไร/ขาดทุน: ${plSign}$${profitLoss.toFixed(2)} (${plSign}${profitLossPercent.toFixed(2)}%)`;
  }

  return message;
}

export default { getBotInstance, sendMessage, sendStockAlert, formatPortfolioMessage, formatStockCheckMessage };
