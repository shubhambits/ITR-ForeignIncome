import Papa from 'papaparse'
import { findMatchingRate } from './fxRateUtils'
import { getStockPricesFromCache, saveStockPricesToCache } from './cacheManager'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

// Load stock prices from local cache or fetch from stored per-company CSV files
export async function fetchHistoricalStockPrices(symbol, forceReload = false) {
  if (!symbol) return null

  if (!forceReload) {
    const cachedData = getStockPricesFromCache(symbol)
    if (cachedData && cachedData.prices && cachedData.prices.length > 0) {
      return cachedData
    }
  }

  try {
    const response = await fetch(`/data/stocks/${symbol}.csv?t=${Date.now()}`, { cache: 'no-cache' })
    if (!response.ok) {
      throw new Error(`Failed to load cached stock data for ${symbol}`)
    }

    const csvText = await response.text()
    const stockData = await new Promise((resolve, reject) => {
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
            reject(new Error(`No cached prices available for ${symbol}`))
          }
        },
        error: (error) => reject(error)
      })
    })

    saveStockPricesToCache(symbol, stockData)
    return stockData
  } catch (error) {
    console.error(`Error loading stored prices for ${symbol}:`, error)
    const onlineData = await fetchFromAlphaVantageOnline(symbol)
    saveStockPricesToCache(symbol, onlineData)
    return onlineData
  }
}

// Fallback to online Alpha Vantage if local cache is missing
async function fetchFromAlphaVantageOnline(symbol, apiKey = 'demo') {
  const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=full&apikey=${apiKey}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error while fetching ${symbol}: ${response.status}`)
  }

  const data = await response.json()
  if (data['Error Message']) {
    throw new Error(data['Error Message'])
  }
  if (data['Note']) {
    throw new Error('Alpha Vantage rate limit exceeded. Please use cached data or retry later.')
  }
  if (!data['Time Series (Daily)']) {
    throw new Error(`No data found for symbol: ${symbol}`)
  }

  const prices = Object.entries(data['Time Series (Daily)']).map(([date, values]) => ({
    date,
    open: parseFloat(values['1. open']),
    high: parseFloat(values['2. high']),
    low: parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
    dividend: 0
  }))
  .sort((a, b) => new Date(a.date) - new Date(b.date))

  return {
    symbol,
    currency: 'USD',
    prices
  }
}

export function getPriceOnDate(prices, targetDate) {
  const target = new Date(targetDate)
  let closestPrice = null
  let closestDiff = Infinity

  for (const price of prices) {
    const priceDate = new Date(price.date)
    const diff = target - priceDate
    if (diff >= 0 && diff < closestDiff) {
      closestDiff = diff
      closestPrice = price
    }
  }

  return closestPrice
}

export function getPeakValue(prices, fromDate, toDate) {
  const from = new Date(fromDate)
  const to = new Date(toDate)
  let peak = 0
  let peakDate = null

  for (const price of prices) {
    const priceDate = new Date(price.date)
    if (priceDate >= from && priceDate <= to) {
      if (price.high > peak) {
        peak = price.high
        peakDate = price.date
      }
    }
  }

  return { peak, peakDate }
}

export function getClosingPrice(prices, onDate) {
  const targetDate = new Date(onDate)
  let closingPrice = null
  let closingDate = null
  for (let i = prices.length - 1; i >= 0; i--) {
    const priceDate = new Date(prices[i].date)
    if (priceDate <= targetDate) {
      closingPrice = prices[i].close
      closingDate = prices[i].date
      break
    }
  }
  return { closingPrice, closingDate }
}

import stockConfig from '../../data/config.json'

export function formatDateDDMMYYYY(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

export function calculateTotalDividendsCredited(prices, grant, periodEndDate, rateMap) {
  if (!prices || prices.length === 0 || !grant || !grant.Quantity) {
    return { grossUSD: 0, grossINR: 0, breakdown: [] }
  }

  const qty = parseFloat(grant.Quantity) || 0
  if (qty <= 0) return { grossUSD: 0, grossINR: 0, breakdown: [] }

  const grantDate = new Date(grant.Date)
  const periodEnd = new Date(periodEndDate)
  
  // Year start date for the current reporting period (e.g., 2026-01-01)
  const yearStartDate = new Date(periodEnd.getFullYear(), 0, 1)

  // Start date is grant date or current reporting year start, whichever is higher
  const startDate = grantDate > yearStartDate ? grantDate : yearStartDate

  const isSold = grant.IsSold === 'yes' || grant.IsSold === true
  const endDate = isSold && grant.SaleDate ? new Date(grant.SaleDate) : periodEnd

  let totalGrossUSD = 0
  let totalGrossINR = 0
  const breakdown = []

  for (const priceObj of prices) {
    const priceDate = new Date(priceObj.date)
    if (priceDate >= startDate && priceDate <= endDate) {
      const divPerShare = priceObj.dividend || 0
      if (divPerShare > 0) {
        const divUSD = qty * divPerShare
        const matchedRateObj = rateMap ? findMatchingRate(priceObj.date, rateMap) : null
        const sbiRate = matchedRateObj ? matchedRateObj.rate : 1
        const rateDate = matchedRateObj ? matchedRateObj.matchedDate : 'N/A'
        const divINR = Math.round(divUSD * sbiRate)

        totalGrossUSD += divUSD
        totalGrossINR += divINR

        breakdown.push({
          date: priceObj.date,
          divPerShare,
          quantity: qty,
          divUSD,
          sbiRate,
          rateDate,
          divINR
        })
      }
    }
  }

  return {
    grossUSD: totalGrossUSD,
    grossINR: totalGrossINR,
    breakdown
  }
}

export function formatStockGrantsForScheduleFA(grants, prices, periodEndDate, rateMap) {
  return grants.map(grant => {
    const configInfo = stockConfig.stocks?.[grant.Stock]

    const initialPrice = getPriceOnDate(prices, grant.Date)
    const initialValueUSD = initialPrice ? initialPrice.close : 0

    const periodStart = new Date(grant.Date)
    const periodEnd = new Date(periodEndDate)
    const { peak: peakUSD, peakDate } = getPeakValue(prices, periodStart, periodEnd)
    const { closingPrice: closingUSD, closingDate } = getClosingPrice(prices, periodEndDate)

    // SBI TT Buy Rate based on GRANT date -> last working day of previous month
    const matchedGrantRateObj = rateMap ? findMatchingRate(grant.Date, rateMap) : null
    const grantSbiRate = matchedGrantRateObj ? matchedGrantRateObj.rate : 1
    const grantRateDate = matchedGrantRateObj ? matchedGrantRateObj.matchedDate : 'N/A'

    const initialValueINR = Math.round(grant.Quantity * initialValueUSD * grantSbiRate).toString()
    const peakValueINR = Math.round(grant.Quantity * peakUSD * grantSbiRate).toString()
    const closingBalanceINR = Math.round(grant.Quantity * closingUSD * grantSbiRate).toString()

    // Calculate dividend credited amount based on quantity & cached dividend data
    const divResult = calculateTotalDividendsCredited(prices, grant, periodEndDate, rateMap)
    
    let grossINR = '0'
    let finalGrossUSD = 0

    if (divResult.breakdown && divResult.breakdown.length > 0) {
      grossINR = divResult.grossINR.toString()
      finalGrossUSD = divResult.grossUSD
    }

    // Sale Proceeds calculation using SALE date rate if sold
    const isSold = grant.IsSold === 'yes' || grant.IsSold === true
    let proceedsINR = '0'
    let saleSbiRate = null
    let saleRateDate = 'N/A'

    if (isSold && grant.SaleDate) {
      const matchedSaleRateObj = rateMap ? findMatchingRate(grant.SaleDate, rateMap) : null
      saleSbiRate = matchedSaleRateObj ? matchedSaleRateObj.rate : grantSbiRate
      saleRateDate = matchedSaleRateObj ? matchedSaleRateObj.matchedDate : 'N/A'

      const soldQty = parseFloat(grant.SoldQuantity) || parseFloat(grant.Quantity) || 0
      const salePrice = parseFloat(grant.SalePriceUSD) || 0
      const proceedsUSD = parseFloat(grant.ProceedsUSD) || (soldQty * salePrice)

      proceedsINR = proceedsUSD > 0 ? Math.round(proceedsUSD * saleSbiRate).toString() : '0'
    } else if (isSold && parseFloat(grant.ProceedsUSD) > 0) {
      const proceedsUSD = parseFloat(grant.ProceedsUSD)
      proceedsINR = Math.round(proceedsUSD * grantSbiRate).toString()
    }

    return {
      'Country Name and Code': grant.Country || configInfo?.country || '2-UNITED STATES OF AMERICA',
      'Name of entity': grant.Company || configInfo?.name || grant.Stock,
      'Address of entity': grant.CompanyAddress || configInfo?.address || 'Not provided',
      'ZIP Code': grant.CompanyZIP || configInfo?.zip || 'Not provided',
      'Nature of entity': grant.Nature || configInfo?.nature || 'Listed Company',
      'Date of acquiring the interest': formatDateDDMMYYYY(grant.Date),
      'Initial value of the investment': initialValueINR,
      'Peak value of investment during the Period': peakValueINR,
      'Closing balance': closingBalanceINR,
      'Total gross amount paid/credited with respect to the holding during the period': grossINR,
      'Total gross proceeds from sale or redemption of investment during the period': proceedsINR,
      'Stock Symbol': grant.Stock || 'N/A',
      'Quantity': grant.Quantity,
      'Initial Price USD': initialValueUSD ? initialValueUSD.toFixed(4) : '0.0000',
      'Peak Price USD': peakUSD ? peakUSD.toFixed(4) : '0.0000',
      'Peak Date': peakDate || 'N/A',
      'Closing Price USD': closingUSD ? closingUSD.toFixed(4) : '0.0000',
      'Closing Date': closingDate || 'N/A',
      'SBI Rate': grantSbiRate.toFixed(4),
      'SBI Rate Date': grantRateDate,
      'Sale Date': formatDateDDMMYYYY(grant.SaleDate) || 'N/A',
      'Sale SBI Rate': saleSbiRate ? saleSbiRate.toFixed(4) : 'N/A',
      'Sale SBI Rate Date': saleRateDate,
      'Gross USD': finalGrossUSD.toFixed(2),
      'Dividend Breakdown': divResult.breakdown
    }
  })
}




