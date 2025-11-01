import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MARKETAUX_BASE_URL = 'https://api.marketaux.com/v1';
const API_KEY = process.env.MARKETAUX_API_KEY;

/**
 * Get latest news for a stock symbol
 * @param {string} symbol - Stock symbol (e.g., 'AAPL')
 * @param {number} limit - Number of news articles (default: 5)
 * @returns {Promise<Array>} Array of news articles
 */
export async function getStockNews(symbol, limit = 5) {
  try {
    const response = await axios.get(`${MARKETAUX_BASE_URL}/news/all`, {
      params: {
        symbols: symbol.toUpperCase(),
        filter_entities: true,
        language: 'en',
        limit: limit,
        api_token: API_KEY
      }
    });

    if (!response.data?.data || response.data.data.length === 0) {
      return [];
    }

    return response.data.data.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      publishedAt: article.published_at,
      source: article.source,
      sentiment: article.entities?.[0]?.sentiment_score || null,
      image: article.image_url
    }));
  } catch (error) {
    if (error.response?.status === 429) {
      throw new Error('News API rate limit exceeded. Please try again later.');
    }
    
    // Don't log rate limit errors
    if (!error.message.includes('rate limit')) {
      console.error(`Marketaux API Error for ${symbol}:`, error.message);
    }
    
    throw error;
  }
}

/**
 * Format news for Telegram message
 * @param {Array} news - Array of news articles
 * @param {string} symbol - Stock symbol
 * @returns {string} Formatted message
 */
export function formatNewsMessage(news, symbol) {
  if (!news || news.length === 0) {
    return `📰 ไม่พบข่าวสำหรับ ${symbol.toUpperCase()}`;
  }

  let message = `📰 *ข่าวล่าสุด ${symbol.toUpperCase()}*\n\n`;

  news.forEach((article, index) => {
    message += `*${index + 1}. ${article.title}*\n`;
    
    if (article.description) {
      const shortDesc = article.description.length > 150 
        ? article.description.substring(0, 150) + '...' 
        : article.description;
      message += `${shortDesc}\n`;
    }

    if (article.sentiment !== null) {
      const sentimentEmoji = article.sentiment > 0 ? '📈' : article.sentiment < 0 ? '📉' : '➡️';
      message += `${sentimentEmoji} Sentiment: ${article.sentiment.toFixed(2)}\n`;
    }

    message += `🔗 [อ่านเพิ่มเติม](${article.url})\n`;
    message += `📅 ${new Date(article.publishedAt).toLocaleString('th-TH')}\n\n`;
  });

  return message;
}

/**
 * Get general market news
 * @param {number} limit - Number of articles
 * @returns {Promise<Array>} Array of news articles
 */
export async function getMarketNews(limit = 10) {
  try {
    const response = await axios.get(`${MARKETAUX_BASE_URL}/news/all`, {
      params: {
        filter_entities: true,
        language: 'en',
        limit: limit,
        api_token: API_KEY
      }
    });

    return response.data.data || [];
  } catch (error) {
    // Don't log rate limit errors
    if (!error.message.includes('rate limit')) {
      console.error('Error fetching market news:', error.message);
    }
    throw error;
  }
}
