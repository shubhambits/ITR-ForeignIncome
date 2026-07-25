import React from 'react'
import Papa from 'papaparse'

export default function StockGrantsTable({ grants, onRemove, onClearAll }) {
  const handleExport = () => {
    if (grants.length === 0) {
      alert('No stock grants to export')
      return
    }

    const columns = [
      'Date',
      'Stock',
      'Quantity',
      'Company',
      'CompanyAddress',
      'CompanyZIP',
      'GrossUSD',
      'ProceedsUSD'
    ]

    const exportData = grants.map(grant => {
      const row = {}
      columns.forEach(col => {
        row[col] = grant[col] ?? ''
      })
      return row
    })

    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `Stock_Grants_Entries_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!grants || grants.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden my-6">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Added Stock Grants Entries ({grants.length})</h3>
          <p className="text-xs text-gray-500">Entries added via CSV upload or manual entry</p>
        </div>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
          >
            Clear All Entries
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Stock</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Quantity</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Company</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Company Address</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">ZIP</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Gross USD</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Proceeds USD</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grants.map((grant, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{idx + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">{grant.Date}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">{grant.Stock}</td>
                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{grant.Quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{grant.Company || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{grant.CompanyAddress || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{grant.CompanyZIP || '-'}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono font-medium">
                  {grant.GrossUSD ? `$${parseFloat(grant.GrossUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 font-mono font-medium">
                  {grant.ProceedsUSD ? `$${parseFloat(grant.ProceedsUSD).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  {onRemove && (
                    <button
                      onClick={() => onRemove(idx)}
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
          Total added entries: <span className="font-bold text-gray-900">{grants.length}</span>
        </p>
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          📥 Export Added Entries (CSV)
        </button>
      </div>
    </div>
  )
}

