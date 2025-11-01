import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY;

/**
 * Get real-time stock quote
 * @param {string} symbol - Stock symbol (e.g., 'AAPL')
 * @returns {Promise<Object>} Quote data with current price, change, etc.
 */
export async function getStockQuote(symbol) {
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: API_KEY
      }
    });

    const data = response.data;

    // Check if data is valid
    if (data.c === 0 || data.c === null) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }

    return {
      symbol: symbol.toUpperCase(),
      currentPrice: data.c,      // Current price
      change: data.d,            // Change
      percentChange: data.dp,    // Percent change
      high: data.h,              // High price of the day
      low: data.l,               // Low price of the day
      open: data.o,              // Open price of the day
      previousClose: data.pc,    // Previous close price
      timestamp: data.t          // Timestamp
    };
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.');
    }
    
    // Don't log expected errors (invalid symbols)
    if (!error.message.includes('No data found')) {
      console.error(`Finnhub API Error for ${symbol}:`, error.message);
    }
    
    throw error;
  }
}

/**
 * Get company profile
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} Company profile data
 */
export async function getCompanyProfile(symbol) {
  try {
    const response = await axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
      params: {
        symbol: symbol.toUpperCase(),
        token: API_KEY
      }
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching company profile for ${symbol}:`, error.message);
    return null;
  }
}

/**
 * Calculate price change percentage
 * @param {number} currentPrice - Current stock price
 * @param {number} buyPrice - Purchase price
 * @returns {number} Percentage change
 */
export function calculatePriceChange(currentPrice, buyPrice) {
  return ((currentPrice - buyPrice) / buyPrice) * 100;
}

/**
 * Format price to 2 decimal places
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price) {
  return parseFloat(price).toFixed(2);
}

/**
 * Check if alert should be triggered
 * @param {number} currentPrice - Current stock price
 * @param {number} buyPrice - Purchase price
 * @param {number} lastNotified - Last notified price
 * @param {number} threshold - Alert threshold percentage (default: 5)
 * @returns {boolean}
 */
export function shouldAlert(currentPrice, buyPrice, lastNotified, threshold = 5) {
  const changePercent = Math.abs(calculatePriceChange(currentPrice, buyPrice));
  
  // Alert if change exceeds threshold
  if (changePercent < threshold) {
    return false;
  }

  // If never notified before, alert
  if (!lastNotified) {
    return true;
  }

  // Alert if price changed significantly from last notification
  const changeFromLastNotified = Math.abs(calculatePriceChange(currentPrice, lastNotified));
  return changeFromLastNotified >= threshold;
}
