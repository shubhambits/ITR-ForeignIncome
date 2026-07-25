import React, { useEffect, useRef, useState } from 'react'
import stockConfig from '../../data/config.json'
import { fetchHistoricalStockPrices, getClosingPrice } from '../utils/stockPriceUtils'

export default function StockGrantsUpload({ onUpload, isLoading }) {
  const fileInputRef = useRef(null)
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [priceError, setPriceError] = useState(null)
  const [stockPrice, setStockPrice] = useState(null)
  const [saleStockPrice, setSaleStockPrice] = useState(null)
  const [salePriceError, setSalePriceError] = useState(null)

  const [customData, setCustomData] = useState({
    Date: '',
    Stock: '',
    Quantity: '',
    Company: '',
    CompanyAddress: '',
    CompanyZIP: '',
    GrossUSD: '',
    IsSold: 'no',
    SoldQuantity: '',
    SaleDate: '',
    SalePriceUSD: '0',
    ProceedsUSD: '0'
  })
  const [useManualEntry, setUseManualEntry] = useState(false)

  const handleDragEnter = (e) => {
    e.preventDefault()
    dragCounter.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = (file) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      onUpload(e.target.result, 'csv')
    }
    reader.readAsText(file)
  }

  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleManualInputChange = (field, value) => {
    setCustomData(prev => {
      const nextData = { ...prev, [field]: value }

      if (field === 'IsSold' && value === 'no') {
        nextData.SoldQuantity = '0'
        nextData.SaleDate = ''
        nextData.SalePriceUSD = '0'
        nextData.ProceedsUSD = '0'
      } else if (field === 'IsSold' && value === 'yes') {
        if (!nextData.SoldQuantity || nextData.SoldQuantity === '0') {
          nextData.SoldQuantity = nextData.Quantity || ''
        }
      }

      // Auto compute ProceedsUSD if SalePriceUSD or SoldQuantity changes
      if (field === 'SalePriceUSD' || field === 'SoldQuantity' || field === 'Quantity') {
        if (nextData.IsSold === 'yes') {
          const soldQty = parseFloat(nextData.SoldQuantity) || parseFloat(nextData.Quantity) || 0
          const salePrice = parseFloat(nextData.SalePriceUSD) || 0
          nextData.ProceedsUSD = salePrice > 0 && soldQty > 0 ? (soldQty * salePrice).toFixed(2) : '0'
        } else {
          nextData.ProceedsUSD = '0'
        }
      }

      return nextData
    })
  }

  const handleStockChange = (symbol) => {
    const companyInfo = stockConfig.stocks?.[symbol]
    setCustomData(prev => ({
      ...prev,
      Stock: symbol,
      Company: companyInfo?.name || '',
      CompanyAddress: companyInfo?.address || '',
      CompanyZIP: companyInfo?.zip || ''
    }))
  }

  useEffect(() => {
    const fetchStockPrice = async () => {
      setStockPrice(null)
      setPriceError(null)
      const { Stock, Date } = customData
      
      if (!Stock || !Date) {
        return
      }

      try {
        const stockResult = await fetchHistoricalStockPrices(Stock)
        const { closingPrice } = getClosingPrice(stockResult.prices, Date)
        if (!closingPrice) {
          throw new Error(`No closing price found for ${Stock} on or before ${Date}`)
        }
        setStockPrice(closingPrice)
      } catch (error) {
        setPriceError(error.message)
      }
    }

    fetchStockPrice()
  }, [customData.Stock, customData.Date])

  // Autopopulate Sale Price on Sale Date
  useEffect(() => {
    const fetchSaleStockPrice = async () => {
      setSaleStockPrice(null)
      setSalePriceError(null)
      const { Stock, SaleDate, IsSold, SoldQuantity, Quantity } = customData

      if (IsSold !== 'yes' || !Stock || !SaleDate) {
        return
      }

      try {
        const stockResult = await fetchHistoricalStockPrices(Stock)
        const { closingPrice } = getClosingPrice(stockResult.prices, SaleDate)
        if (!closingPrice) {
          throw new Error(`No closing price found for ${Stock} on or before ${SaleDate}`)
        }

        setSaleStockPrice(closingPrice)
        const priceStr = closingPrice.toFixed(2)
        const soldQty = parseFloat(SoldQuantity) || parseFloat(Quantity) || 0
        const totalProceeds = (soldQty * closingPrice).toFixed(2)

        setCustomData(prev => ({
          ...prev,
          SalePriceUSD: priceStr,
          ProceedsUSD: totalProceeds
        }))
      } catch (error) {
        setSalePriceError(error.message)
      }
    }

    fetchSaleStockPrice()
  }, [customData.Stock, customData.SaleDate, customData.IsSold, customData.SoldQuantity])

  useEffect(() => {
    const calculateUsdAmounts = async () => {
      const { Stock, Date, Quantity } = customData
      const quantity = parseFloat(Quantity)
      if (!Stock || !Date || isNaN(quantity) || quantity <= 0) {
        setCustomData(prev => ({ ...prev, GrossUSD: '' }))
        return
      }

      try {
        const stockResult = await fetchHistoricalStockPrices(Stock)
        const { closingPrice } = getClosingPrice(stockResult.prices, Date)
        if (!closingPrice) {
          throw new Error(`No closing price found for ${Stock} on or before ${Date}`)
        }

        const value = (quantity * closingPrice).toFixed(2)
        setCustomData(prev => ({ ...prev, GrossUSD: value }))
      } catch (error) {
        setCustomData(prev => ({ ...prev, GrossUSD: '' }))
      }
    }

    calculateUsdAmounts()
  }, [customData.Stock, customData.Date, customData.Quantity])

  const handleAddManualEntry = () => {
    if (!customData.Date || !customData.Stock || !customData.Quantity) {
      alert('Please fill in Date, Stock, and Quantity')
      return
    }
    if (customData.IsSold === 'yes' && (!customData.SaleDate || !customData.SoldQuantity)) {
      alert('Please fill in Date of Sale and Sold Quantity')
      return
    }

    const entry = { ...customData }
    onUpload(entry, 'manual')
    setCustomData({
      Date: '',
      Stock: '',
      Quantity: '',
      Company: '',
      CompanyAddress: '',
      CompanyZIP: '',
      GrossUSD: '',
      IsSold: 'no',
      SoldQuantity: '',
      SaleDate: '',
      SalePriceUSD: '0',
      ProceedsUSD: '0'
    })
  }

  return (
    <div className="mb-8 space-y-6">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setUseManualEntry(false)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${useManualEntry ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white'}`}
        >Upload CSV</button>
        <button
          type="button"
          onClick={() => setUseManualEntry(true)}
          className={`px-4 py-2 rounded-lg font-semibold transition ${useManualEntry ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >Manual Entry</button>
      </div>

      {!useManualEntry ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${isDragging ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-600'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleInputChange}
            className="hidden"
            disabled={isLoading}
          />
          <div className="text-4xl mb-3">📤</div>
          <h3 className="text-lg font-semibold text-gray-900">Drag & drop your stock grants CSV here</h3>
          <p className="text-sm text-gray-600 mt-2">Required columns: Date, Stock, Quantity — company details and values are auto-derived</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add a stock grant entry</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Grant / Acquisition Date *</span>
              <input
                type="date"
                value={customData.Date}
                onChange={(e) => handleManualInputChange('Date', e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Stock Symbol *</span>
              <select
                value={customData.Stock}
                onChange={(e) => handleStockChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select a symbol</option>
                {Object.entries(stockConfig.stocks || {}).map(([symbol, info]) => (
                  <option key={symbol} value={symbol}>{symbol} — {info.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Granted Quantity *</span>
              <input
                type="number"
                value={customData.Quantity}
                onChange={(e) => handleManualInputChange('Quantity', e.target.value)}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Acquisition Price (USD) as on {customData.Date || 'selected date'}</span>
              <div className="mt-1 block w-full rounded-lg border border-gray-300 bg-blue-50 shadow-sm p-3 font-semibold text-blue-900">
                {stockPrice ? `$${stockPrice.toFixed(2)}` : '-'}
              </div>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Has any portion of this stock grant been sold? *</span>
              <div className="mt-2 flex gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="IsSold"
                    value="no"
                    checked={customData.IsSold === 'no'}
                    onChange={(e) => handleManualInputChange('IsSold', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-800">No (Unsold)</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="IsSold"
                    value="yes"
                    checked={customData.IsSold === 'yes'}
                    onChange={(e) => handleManualInputChange('IsSold', e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-800">Yes (Sold)</span>
                </label>
              </div>
            </label>

            {customData.IsSold === 'yes' && (
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Sold Quantity *</span>
                  <input
                    type="number"
                    value={customData.SoldQuantity}
                    onChange={(e) => handleManualInputChange('SoldQuantity', e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Date of Sale *</span>
                  <input
                    type="date"
                    value={customData.SaleDate}
                    onChange={(e) => handleManualInputChange('SaleDate', e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Sale Price (USD per share)</span>
                  <input
                    type="number"
                    value={customData.SalePriceUSD}
                    onChange={(e) => handleManualInputChange('SalePriceUSD', e.target.value)}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                    min="0"
                    step="0.01"
                  />
                  {saleStockPrice && (
                    <span className="text-xs text-green-700 font-semibold block mt-1">
                      ✓ Autopopulated from closing price on {customData.SaleDate}: ${saleStockPrice.toFixed(2)}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Total Sale Proceeds (USD)</span>
                  <input
                    type="text"
                    value={`$${customData.ProceedsUSD}`}
                    readOnly
                    className="mt-1 block w-full rounded-lg border-gray-300 bg-white shadow-sm font-mono font-bold text-green-700"
                  />
                </label>
                {salePriceError && (
                  <div className="sm:col-span-2 text-xs text-red-600">
                    {salePriceError}
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Company</span>
              <input
                type="text"
                value={customData.Company}
                readOnly
                className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-100 shadow-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Gross Initial Value (USD)</span>
              <input
                type="text"
                value={customData.GrossUSD ? `$${customData.GrossUSD}` : '-'}
                readOnly
                className="mt-1 block w-full rounded-lg border-gray-300 bg-gray-100 shadow-sm font-mono font-semibold"
              />
            </label>
            {priceError && (
              <div className="sm:col-span-2 text-sm text-red-600">
                {priceError}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddManualEntry}
            disabled={isLoading}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2 font-semibold shadow-sm"
          >Add Stock Grant Entry</button>
        </div>
      )}
    </div>
  )
}
