import Papa from 'papaparse'
import { getSBIRatesFromCache, saveSBIRatesToCache } from './cacheManager'

// Load SBI FX rates from local cache or fetch from stored CSV file
export async function fetchSBIRates(forceReload = false) {
  if (!forceReload) {
    const cachedRates = getSBIRatesFromCache()
    if (cachedRates && Object.keys(cachedRates).length > 0) {
      return cachedRates
    }
  }

  try {
    // Fetch from local CSV file with cache busting
    const response = await fetch(`/data/sbi-rates.csv?t=${Date.now()}`, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    
    const csvText = await response.text()
    
    const rateMap = await new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const parsedMap = {}
            results.data.forEach(row => {
              const rate = parseFloat(row.rate)
              if (row.date && !Number.isNaN(rate) && rate > 0) {
                parsedMap[row.date] = {
                  date: row.date,
                  ttBuyRate: rate
                }
              }
            })
            if (Object.keys(parsedMap).length > 0) {
              resolve(parsedMap)
            } else {
              reject(new Error('No valid rates found in cached data'))
            }
          } else {
            reject(new Error('No rates found in cached data'))
          }
        },
        error: (error) => reject(error)
      })
    })

    saveSBIRatesToCache(rateMap)
    return rateMap
  } catch (error) {
    console.error('Error loading SBI rates from stored file:', error)
    // Fallback to fetching from online source if local load fails
    const onlineRates = await fetchSBIRatesFromOnline()
    saveSBIRatesToCache(onlineRates)
    return onlineRates
  }
}

// Fallback: Fetch SBI rates from online source (for emergency/offline mode)
async function fetchSBIRatesFromOnline() {
  try {
    const SBI_RATES_URL = 'https://raw.githubusercontent.com/sahilgupta/sbi-fx-ratekeeper/main/csv_files/SBI_REFERENCE_RATES_USD.csv'
    const response = await fetch(SBI_RATES_URL)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    
    const csvText = await response.text()
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().toUpperCase(),
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const rateMap = {}
            results.data.forEach(row => {
              const dateValue = row.DATE || row['DATE'] || row.Date || row.date
              const rateValue = row['TT BUY'] || row['TT BUY RATE'] || row['TT BUY']
              if (dateValue && rateValue) {
                const date = String(dateValue).split(' ')[0]
                const rate = parseFloat(String(rateValue).replace(/,/g, ''))
                if (!Number.isNaN(rate) && rate > 0) {
                  rateMap[date] = {
                    date,
                    ttBuyRate: rate
                  }
                }
              }
            })
            resolve(rateMap)
          } else {
            reject(new Error('No data parsed from CSV'))
          }
        },
        error: (error) => reject(error)
      })
    })
  } catch (error) {
    console.error('Error fetching SBI rates online:', error)
    throw error
  }
}

// Get the last working day of the previous month
function getLastWorkingDayOfPreviousMonth(date) {
  let year, month
  if (typeof date === 'string') {
    const parts = date.split('-')
    if (parts.length === 3) {
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10) - 1 // 0-indexed for Date constructor
    }
  }
  if (!year) {
    const d = new Date(date)
    year = d.getFullYear()
    month = d.getMonth()
  }

  // Day 0 of month gives the last day of the previous month
  const lastDayOfPrevMonth = new Date(year, month, 0)
  const y = lastDayOfPrevMonth.getFullYear()
  const m = String(lastDayOfPrevMonth.getMonth() + 1).padStart(2, '0')
  const d = String(lastDayOfPrevMonth.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

// Format date to YYYY-MM-DD
function formatDate(date) {
  if (typeof date === 'string') {
    // Parse string date (assumed to be YYYY-MM-DD or DD/MM/YYYY)
    if (date.includes('/')) {
      const parts = date.split('/')
      if (parts.length === 3) {
        const day = parts[0]
        const month = parts[1]
        const year = parts[2]
        return `${year}-${month}-${day}`
      }
    }
    return date
  }
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Find the matching rate for a transaction date
export function findMatchingRate(transactionDate, rateMap) {
  const formattedTxnDate = formatDate(transactionDate)
  
  // Get the last working day of the previous month
  const targetDateStr = getLastWorkingDayOfPreviousMonth(formattedTxnDate)
  const targetDate = new Date(targetDateStr)
  
  // Walk backward up to 10 days from the target date
  for (let i = 0; i <= 10; i++) {
    const checkDate = new Date(targetDate)
    checkDate.setDate(checkDate.getDate() - i)
    const checkDateStr = formatDate(checkDate)
    
    if (rateMap[checkDateStr]) {
      return {
        matchedDate: checkDateStr,
        rate: rateMap[checkDateStr].ttBuyRate
      }
    }
  }
  
  // If no rate found in the lookback window, return null
  return null
}

// Convert transaction with matched rate
export function convertTransaction(transaction, rateMap) {
  const matchedRate = findMatchingRate(transaction.Date, rateMap)
  
  if (!matchedRate) {
    return {
      ...transaction,
      matchedDate: null,
      rate: null,
      grossINR: null,
      taxINR: null,
      netUSD: null,
      netINR: null,
      error: 'No matching rate found'
    }
  }
  
  const grossUSD = parseFloat(transaction.GrossUSD) || 0
  const taxUSD = parseFloat(transaction.TaxUSD) || 0
  const rate = matchedRate.rate
  
  const grossINR = grossUSD * rate
  const taxINR = taxUSD * rate
  const netUSD = grossUSD - taxUSD
  const netINR = grossINR - taxINR
  
  return {
    ...transaction,
    matchedDate: matchedRate.matchedDate,
    rate: rate,
    grossINR: grossINR,
    taxINR: taxINR,
    netUSD: netUSD,
    netINR: netINR,
    error: null
  }
}

// Parse uploaded CSV
export function parseUploadedCSV(csvText) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          resolve(results.data)
        } else {
          reject(new Error('No data found in CSV'))
        }
      },
      error: (error) => reject(error)
    })
  })
}

// Export transactions to CSV
export function exportToCSV(transactions) {
  const csv = Papa.unparse(transactions)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `ITR_ForeignIncome_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Format currency
export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined) return '-'
  return parseFloat(value).toFixed(decimals)
}
