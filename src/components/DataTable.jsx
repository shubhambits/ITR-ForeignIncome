import React, { useState } from 'react'
import { formatCurrency } from '../utils/fxRateUtils'

export default function DataTable({ transactions, onExport, onRemove, onClearAll }) {
  const [sortConfig, setSortConfig] = useState({ key: 'Date', direction: 'asc' })

  const sorted = [...transactions].map((txn, originalIndex) => ({ ...txn, _originalIndex: originalIndex }))
  sorted.sort((a, b) => {
    const aVal = a[sortConfig.key]
    const bVal = b[sortConfig.key]
    
    if (aVal == null) return 1
    if (bVal == null) return -1
    
    let comparison = 0
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }
    
    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const getTypeColor = (type) => {
    if (type === 'Dividend') return 'bg-green-100 text-green-800'
    if (type === 'Stock Grant') return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-base">No transactions added yet. Upload a CSV or add entries manually to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden my-6">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Added Transactions ({transactions.length})</h3>
          <p className="text-xs text-gray-500">Converted with SBI exchange rates for ITR reporting</p>
        </div>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('Date')}
              >
                Date {sortConfig.key === 'Date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('Type')}
              >
                Type {sortConfig.key === 'Type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Gross (USD)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Gross (INR)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Tax (USD)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Tax (INR)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Matched Rate</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Rate Date</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((txn) => (
              <tr key={txn._originalIndex} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">{txn.Date}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getTypeColor(txn.Type)}`}>
                    {txn.Type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{txn.Description}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium font-mono">
                  ${formatCurrency(txn.GrossUSD)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-blue-600 font-mono">
                  ₹{formatCurrency(txn.grossINR)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium font-mono">
                  ${formatCurrency(txn.TaxUSD)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600 font-mono">
                  ₹{formatCurrency(txn.taxINR)}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono font-semibold">
                  {txn.rate ? formatCurrency(txn.rate, 4) : txn.error ? '✗' : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-600">
                  {txn.matchedDate || (txn.error ? '✗' : '-')}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {onRemove && (
                    <button
                      onClick={() => onRemove(txn._originalIndex)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                      title="Remove Entry"
                    >
                      🗑️
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-gray-600">
          Total Transactions: <span className="font-bold text-gray-900">{transactions.length}</span>
        </p>
        <button
          onClick={onExport}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          📥 Export Converted CSV
        </button>
      </div>
    </div>
  )
}

