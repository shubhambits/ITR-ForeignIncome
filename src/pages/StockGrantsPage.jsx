import React, { useState } from 'react'
import StockGrantsUpload from '../components/StockGrantsUpload'
import StockGrantsTable from '../components/StockGrantsTable'
import ScheduleFAOutput from '../components/ScheduleFAOutput'
import { parseUploadedCSV, fetchSBIRates } from '../utils/fxRateUtils'
import { fetchHistoricalStockPrices, formatStockGrantsForScheduleFA } from '../utils/stockPriceUtils'

export default function StockGrantsPage() {
  const [grants, setGrants] = useState([])
  const [scheduleData, setScheduleData] = useState([])
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [periodEndDate, setPeriodEndDate] = useState('2025-12-31')

  const handleUpload = async (payload, mode) => {
    setError(null)
    setScheduleData([])

    try {
      let parsed = []
      if (mode === 'csv') {
        parsed = await parseUploadedCSV(payload)
      } else {
        parsed = Array.isArray(payload) ? payload : [payload]
      }

      if (parsed.length === 0) {
        throw new Error('No input rows found')
      }

      const required = ['Date', 'Stock', 'Quantity']
      for (const col of required) {
        if (!(col in parsed[0])) {
          throw new Error(`Missing required column: ${col}`)
        }
      }

      setGrants(prev => [...prev, ...parsed])
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRemoveGrant = (index) => {
    setGrants(prev => prev.filter((_, idx) => idx !== index))
    setScheduleData([])
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all added entries?')) {
      setGrants([])
      setScheduleData([])
    }
  }

  const generateSchedule = async () => {
    if (grants.length === 0) {
      setError('Upload or add stock grants data first')
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const rateMap = await fetchSBIRates()
      const formattedRows = []

      for (const grant of grants) {
        const stockResult = await fetchHistoricalStockPrices(grant.Stock)
        if (!stockResult || !stockResult.prices) {
          throw new Error(`No price data available for ${grant.Stock}`)
        }

        const formatted = formatStockGrantsForScheduleFA([grant], stockResult.prices, periodEndDate, rateMap)
        formattedRows.push(formatted[0])
      }

      setScheduleData(formattedRows)
    } catch (err) {
      setError(err.message)
      setScheduleData([])
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-sm font-bold">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Stock Grants & Schedule FA</h2>
        <p className="text-sm text-gray-600 mb-6">Upload stock grant CSV or manually enter grant details to generate Schedule FA report with exchange rates.</p>

        <StockGrantsUpload onUpload={handleUpload} isLoading={isProcessing} />

        {/* Added Entries Section */}
        <StockGrantsTable 
          grants={grants} 
          onRemove={handleRemoveGrant} 
          onClearAll={handleClearAll} 
        />

        {grants.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="grid gap-4 md:grid-cols-2 items-end">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Reporting period end date</span>
                <input
                  type="date"
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={generateSchedule}
                disabled={isProcessing}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-6 py-3 font-semibold shadow-sm text-sm"
              >
                {isProcessing ? 'Processing...' : '⚡ Generate Schedule FA Report'}
              </button>
            </div>
          </div>
        )}
      </div>

      {scheduleData.length > 0 && (
        <ScheduleFAOutput data={scheduleData} isLoading={isProcessing} />
      )}
    </div>
  )
}

