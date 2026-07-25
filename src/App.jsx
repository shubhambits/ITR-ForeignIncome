import React, { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import UploadZone from './components/UploadZone'
import DataTable from './components/DataTable'
import StockGrantsPage from './pages/StockGrantsPage'
import { 
  parseUploadedCSV, 
  convertTransaction,
  exportToCSV 
} from './utils/fxRateUtils'
import { reloadLocalCache } from './utils/cacheManager'

function App() {
  const [currentPage, setCurrentPage] = useState('foreign-income') // 'foreign-income' or 'stock-grants'
  const [rateMap, setRateMap] = useState({})
  const [ratesLoaded, setRatesLoaded] = useState(false)
  const [cacheLoaded, setCacheLoaded] = useState(false)
  const [cacheLoading, setCacheLoading] = useState(false)
  const [stocksCount, setStocksCount] = useState(0)
  const [ratesCount, setRatesCount] = useState(0)
  const [transactions, setTransactions] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  // Reload local cache (SBI rates + Stock prices) on component mount
  const handleReloadCache = useCallback(async () => {
    setCacheLoading(true)
    setError(null)
    try {
      const cacheResult = await reloadLocalCache()
      if (cacheResult.sbiRates) {
        setRateMap(cacheResult.sbiRates)
        setRatesLoaded(true)
        setRatesCount(Object.keys(cacheResult.sbiRates).length)
      } else {
        setRatesLoaded(false)
      }

      const loadedStocksCount = Object.keys(cacheResult.stockPrices || {}).length
      setStocksCount(loadedStocksCount)
      setCacheLoaded(true)

      if (cacheResult.errors && cacheResult.errors.length > 0) {
        console.warn('Some items had errors during cache reload:', cacheResult.errors)
      }
    } catch (err) {
      console.error('Failed to reload local cache:', err)
      setError('Failed to reload local cache for rates and stocks. Please check connection.')
      setCacheLoaded(false)
    } finally {
      setCacheLoading(false)
    }
  }, [])

  useEffect(() => {
    handleReloadCache()
  }, [handleReloadCache])

  const handleFileUpload = async (csvText) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Parse the uploaded CSV
      const parsedData = await parseUploadedCSV(csvText)

      // Validate required columns
      if (parsedData.length === 0) {
        throw new Error('CSV file is empty')
      }

      const firstRow = parsedData[0]
      const requiredColumns = ['Date', 'Type', 'GrossUSD', 'TaxUSD', 'Description']
      for (const col of requiredColumns) {
        if (!(col in firstRow)) {
          throw new Error(`Missing required column: ${col}`)
        }
      }

      // Convert each transaction with matched rates
      const convertedTransactions = parsedData.map(txn =>
        convertTransaction(txn, rateMap)
      )

      setTransactions(prev => [...prev, ...convertedTransactions])
      setError(null)
    } catch (err) {
      console.error('Error processing CSV:', err)
      setError(`Error processing CSV: ${err.message}. Please check the file format.`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualAdd = (rawTxn) => {
    try {
      const converted = convertTransaction(rawTxn, rateMap)
      setTransactions(prev => [...prev, converted])
      setError(null)
    } catch (err) {
      setError(`Error adding transaction: ${err.message}`)
    }
  }

  const handleRemoveTransaction = (index) => {
    setTransactions(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleClearTransactions = () => {
    if (window.confirm('Are you sure you want to clear all foreign income transactions?')) {
      setTransactions([])
    }
  }

  const handleExport = () => {
    if (transactions.length === 0) {
      alert('No transactions to export')
      return
    }
    exportToCSV(transactions)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        ratesLoaded={ratesLoaded} 
        cacheLoaded={cacheLoaded} 
        cacheLoading={cacheLoading} 
        stocksCount={stocksCount} 
        ratesCount={ratesCount} 
        onReloadCache={handleReloadCache} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-2 border-b border-gray-300">
          <button
            onClick={() => setCurrentPage('foreign-income')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              currentPage === 'foreign-income'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            💵 Foreign Income (Dividends & RSUs)
          </button>
          <button
            onClick={() => setCurrentPage('stock-grants')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              currentPage === 'stock-grants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Stock Grants - Schedule FA
          </button>
        </div>

        {/* Foreign Income Page */}
        {currentPage === 'foreign-income' && (
          <>
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {transactions.length > 0 && (
              <SummaryCards transactions={transactions} />
            )}

            {/* Upload Zone */}
            <UploadZone 
              onFileUpload={handleFileUpload}
              onManualAdd={handleManualAdd}
              isLoading={isProcessing}
            />

            {/* Data Table */}
            <DataTable 
              transactions={transactions}
              onExport={handleExport}
              onRemove={handleRemoveTransaction}
              onClearAll={handleClearTransactions}
            />

            {/* Footer Info */}
            {transactions.length > 0 && (
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>ℹ️ Note:</strong> Exchange rates are matched to the last working day of the previous calendar month as required for ITR reporting. Rates are sourced from SBI Reference Rates (TT Buy Rate).
                </p>
              </div>
            )}
          </>
        )}

        {/* Stock Grants Page */}
        {currentPage === 'stock-grants' && (
          <StockGrantsPage />
        )}
      </main>
    </div>
  )
}

export default App
