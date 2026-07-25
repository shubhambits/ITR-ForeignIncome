import React, { useRef, useState } from 'react'

export default function UploadZone({ onFileUpload, onManualAdd, isLoading }) {
  const fileInputRef = useRef(null)
  const dragCounter = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [useManualEntry, setUseManualEntry] = useState(false)

  const [manualForm, setManualForm] = useState({
    Date: '',
    Type: 'Dividend',
    GrossUSD: '',
    TaxUSD: '',
    Description: ''
  })

  const handleDragEnter = (e) => {
    e.preventDefault()
    dragCounter.current++
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
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
      onFileUpload(e.target.result)
    }
    reader.onerror = () => {
      alert('Error reading file')
    }
    reader.readAsText(file)
  }

  const handleInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
  }

  const handleAddManual = () => {
    if (!manualForm.Date || !manualForm.GrossUSD) {
      alert('Please fill in Date and Gross USD amount')
      return
    }
    if (onManualAdd) {
      onManualAdd({
        Date: manualForm.Date,
        Type: manualForm.Type,
        GrossUSD: parseFloat(manualForm.GrossUSD) || 0,
        TaxUSD: parseFloat(manualForm.TaxUSD) || 0,
        Description: manualForm.Description || `${manualForm.Type} payment`
      })
    }
    setManualForm({
      Date: '',
      Type: 'Dividend',
      GrossUSD: '',
      TaxUSD: '',
      Description: ''
    })
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setUseManualEntry(false)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
            !useManualEntry ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📤 Upload CSV
        </button>
        <button
          type="button"
          onClick={() => setUseManualEntry(true)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
            useManualEntry ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ✍️ Manual Entry
        </button>
      </div>

      {!useManualEntry ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-blue-600 hover:bg-blue-50'
          }`}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Drop your CSV file here or click to upload
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Expected columns: <code className="bg-gray-200 px-2 py-1 rounded text-xs">Date, Type, GrossUSD, TaxUSD, Description</code>
          </p>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <p className="font-semibold mb-1">📋 CSV Format:</p>
            <ul className="text-left inline-block text-xs space-y-1">
              <li>• <strong>Date:</strong> YYYY-MM-DD or DD/MM/YYYY format</li>
              <li>• <strong>Type:</strong> "Dividend" or "Stock Grant"</li>
              <li>• <strong>GrossUSD:</strong> Gross income in USD</li>
              <li>• <strong>TaxUSD:</strong> US tax withheld</li>
              <li>• <strong>Description:</strong> Transaction description</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add Foreign Income Transaction</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Date</span>
              <input
                type="date"
                value={manualForm.Date}
                onChange={(e) => setManualForm(prev => ({ ...prev, Date: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Type</span>
              <select
                value={manualForm.Type}
                onChange={(e) => setManualForm(prev => ({ ...prev, Type: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              >
                <option value="Dividend">Dividend</option>
                <option value="Stock Grant">Stock Grant</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Gross Amount (USD)</span>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 100.00"
                value={manualForm.GrossUSD}
                onChange={(e) => setManualForm(prev => ({ ...prev, GrossUSD: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Tax Withheld (USD)</span>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 25.00"
                value={manualForm.TaxUSD}
                onChange={(e) => setManualForm(prev => ({ ...prev, TaxUSD: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <input
                type="text"
                placeholder="e.g. Q2 Dividend Payment"
                value={manualForm.Description}
                onChange={(e) => setManualForm(prev => ({ ...prev, Description: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAddManual}
            disabled={isLoading}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white rounded-lg px-5 py-2.5 font-semibold text-sm shadow-sm transition"
          >
            ➕ Add Transaction
          </button>
        </div>
      )}
    </div>
  )
}

