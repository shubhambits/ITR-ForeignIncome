import Papa from 'papaparse'
import stockConfig from '../../data/config.json'

const STORAGE_KEY_SBI = 'itr_sbi_rates_cache'
const STORAGE_KEY_STOCK_PREFIX = 'itr_stock_cache_'
const STORAGE_KEY_METADATA = 'itr_cache_metadata'

// In-memory cache fallback/fast lookup
const memoryCache = {
  sbiRates: null,
  stockPrices: {},
  lastUpdated: null
}

/**
 * Save SBI rates to memory and localStorage
 */
export function saveSBIRatesToCache(rates) {
  memoryCache.sbiRates = rates
  memoryCache.lastUpdated = new Date().toISOString()
  try {
    const payload = {
      timestamp: memoryCache.lastUpdated,
      data: rates
    }
    localStorage.setItem(STORAGE_KEY_SBI, JSON.stringify(payload))
  } catch (e) {
    console.warn('Failed to save SBI rates to localStorage:', e)
  }
}

/**
 * Retrieve SBI rates from memory or localStorage
 */
export function getSBIRatesFromCache() {
  if (memoryCache.sbiRates) {
    return memoryCache.sbiRates
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SBI)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.data && Object.keys(parsed.data).length > 0) {
        memoryCache.sbiRates = parsed.data
        return parsed.data
      }
    }
  } catch (e) {
    console.warn('Failed to read SBI rates from localStorage:', e)
  }
  return null
}

/**
 * Save stock price data to memory and localStorage
 */
export function saveStockPricesToCache(symbol, stockData) {
  if (!symbol || !stockData) return
  const upperSymbol = symbol.toUpperCase()
  memoryCache.stockPrices[upperSymbol] = stockData
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      symbol: upperSymbol,
      data: stockData
    }
    localStorage.setItem(`${STORAGE_KEY_STOCK_PREFIX}${upperSymbol}`, JSON.stringify(payload))
  } catch (e) {
    console.warn(`Failed to save stock ${upperSymbol} to localStorage:`, e)
  }
}

/**
 * Retrieve stock price data from memory or localStorage
 */
export function getStockPricesFromCache(symbol) {
  if (!symbol) return null
  const upperSymbol = symbol.toUpperCase()
  if (memoryCache.stockPrices[upperSymbol]) {
    return memoryCache.stockPrices[upperSymbol]
  }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_STOCK_PREFIX}${upperSymbol}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.data && parsed.data.prices && parsed.data.prices.length > 0) {
        memoryCache.stockPrices[upperSymbol] = parsed.data
        return parsed.data
      }
    }
  } catch (e) {
    console.warn(`Failed to read stock ${upperSymbol} from localStorage:`, e)
  }
  return null
}

/**
 * Save overall cache metadata
 */
export function saveCacheMetadata(meta) {
  try {
    localStorage.setItem(STORAGE_KEY_METADATA, JSON.stringify({
      ...meta,
      updatedAt: new Date().toISOString()
    }))
  } catch (e) {
    console.warn('Failed to save cache metadata:', e)
  }
}

/**
 * Get overall cache metadata
 */
export function getCacheMetadata() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_METADATA)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

/**
 * Fetch and parse local SBI CSV file
 */
async function fetchAndParseSBICSV() {
  const cacheBuster = `?t=${Date.now()}`
  const response = await fetch(`/data/sbi-rates.csv${cacheBuster}`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  
  const csvText = await response.text()
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const rateMap = {}
          results.data.forEach(row => {
            const rate = parseFloat(row.rate)
            if (row.date && !Number.isNaN(rate) && rate > 0) {
              rateMap[row.date] = {
                date: row.date,
                ttBuyRate: rate
              }
            }
          })
          if (Object.keys(rateMap).length > 0) {
            resolve(rateMap)
          } else {
            reject(new Error('No valid rates found in sbi-rates.csv'))
          }
        } else {
          reject(new Error('No rates found in sbi-rates.csv'))
        }
      },
      error: (error) => reject(error)
    })
  })
}

/**
 * Fetch and parse local stock CSV file for a given symbol
 */
async function fetchAndParseStockCSV(symbol) {
  const cacheBuster = `?t=${Date.now()}`
  const response = await fetch(`/data/stocks/${symbol}.csv${cacheBuster}`, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(`Failed to load stock file for ${symbol}`)
  }

  const csvText = await response.text()
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const prices = results.data.map(row => ({
            date: row.date,
            open: parseFloat(row.open),
            high: parseFloat(row.high),
            low: parseFloat(row.low),
            close: parseFloat(row.close),
            dividend: row.dividend ? parseFloat(row.dividend) : 0
          }))
          resolve({
            symbol,
            currency: 'USD',
            prices
          })
        } else {
          reject(new Error(`No prices available for ${symbol}`))
        }
      },
      error: (error) => reject(error)
    })
  })
}

/**
 * Reload local cache with stored SBI rates and stock data
 * Triggered on app load.
 */
export async function reloadLocalCache() {
  console.log('Reloading local cache for SBI rates and stock prices...')
  const results = {
    sbiRates: null,
    stockPrices: {},
    errors: []
  }

  // 1. Reload SBI rates
  try {
    const sbiRates = await fetchAndParseSBICSV()
    saveSBIRatesToCache(sbiRates)
    results.sbiRates = sbiRates
  } catch (err) {
    console.error('Error reloading SBI rates into cache:', err)
    results.errors.push(`SBI rates: ${err.message}`)
  }

  // 2. Reload Stock prices for configured stocks
  const symbols = stockConfig.stocks ? Object.keys(stockConfig.stocks) : ['AAPL', 'ABNB', 'AMZN', 'GOOGL', 'MSFT', 'ORCL']
  
  await Promise.allSettled(
    symbols.map(async (symbol) => {
      try {
        const stockData = await fetchAndParseStockCSV(symbol)
        saveStockPricesToCache(symbol, stockData)
        results.stockPrices[symbol] = stockData
      } catch (err) {
        console.error(`Error reloading stock ${symbol} into cache:`, err)
        results.errors.push(`Stock ${symbol}: ${err.message}`)
      }
    })
  )

  const loadedStockCount = Object.keys(results.stockPrices).length
  const metadata = {
    sbiCount: results.sbiRates ? Object.keys(results.sbiRates).length : 0,
    stocksCount: loadedStockCount,
    symbolsLoaded: Object.keys(results.stockPrices),
    hasErrors: results.errors.length > 0,
    errors: results.errors
  }
  saveCacheMetadata(metadata)

  console.log(`Local cache reloaded. SBI rates: ${metadata.sbiCount}, Stocks: ${loadedStockCount}`)
  return results
}
