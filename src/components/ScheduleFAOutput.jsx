import React, { useState } from 'react'
import Papa from 'papaparse'

export default function ScheduleFAOutput({ data, isLoading }) {
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [modalRowIndex, setModalRowIndex] = useState(null)

  const toggleRow = (idx) => {
    const next = new Set(expandedRows)
    if (next.has(idx)) {
      next.delete(idx)
    } else {
      next.add(idx)
    }
    setExpandedRows(next)
  }

  const handleExport = () => {
    if (data.length === 0) {
      alert('No data to export')
      return
    }

    const columns = [
      'Country Name and Code',
      'Name of entity',
      'Address of entity',
      'ZIP Code',
      'Nature of entity',
      'Date of acquiring the interest',
      'Initial value of the investment',
      'Peak value of investment during the Period',
      'Closing balance',
      'Total gross amount paid/credited with respect to the holding during the period',
      'Total gross proceeds from sale or redemption of investment during the period'
    ]

    const exportData = data.map((row) => {
      const filtered = {}
      columns.forEach((col) => {
        filtered[col] = row[col] !== undefined && row[col] !== null ? row[col] : '0'
      })
      return filtered
    })

    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = `Schedule_FA_${new Date().toISOString().split('T')[0]}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <p className="text-gray-500">Upload stock grants to generate Schedule FA output.</p>
      </div>
    )
  }

  const modalRow = modalRowIndex !== null ? data[modalRowIndex] : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Schedule FA Report (Values in INR)</h3>
          <p className="text-xs text-gray-500">Amounts converted to INR using SBI TT Buy Rate of the last working day of previous month from event date</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600">Entity</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600">Acquired Date</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600 text-right">Initial Value (INR)</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600 text-right">Peak Value (INR)</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600 text-right">Closing Balance (INR)</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600 text-right">Gross Credited (INR)</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-gray-600 text-right">Proceeds (INR)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const grossCreditedINR = parseInt(row['Total gross amount paid/credited with respect to the holding during the period'], 10) || 0
              const breakdown = row['Dividend Breakdown'] || []
              const hasBreakdown = breakdown.length > 0

              return (
                <React.Fragment key={idx}>
                  <tr className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(idx)}>
                    <td className="px-4 py-3 text-xs text-gray-400">{expandedRows.has(idx) ? '▼' : '▶'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row['Name of entity']}</td>
                    <td className="px-4 py-3 text-gray-600">{row['Date of acquiring the interest']}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-semibold font-mono">
                      ₹{parseInt(row['Initial value of the investment'], 10).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold font-mono">
                      ₹{parseInt(row['Peak value of investment during the Period'], 10).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-700 font-semibold font-mono">
                      ₹{parseInt(row['Closing balance'], 10).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setModalRowIndex(idx)
                        }}
                        className={`font-semibold font-mono underline decoration-dotted underline-offset-4 ${
                          grossCreditedINR > 0 ? 'text-amber-700 hover:text-amber-900' : 'text-gray-500'
                        }`}
                        title={hasBreakdown ? `Click to view dividend payout breakdown (${breakdown.length} payouts)` : 'Gross Credited'}
                      >
                        ₹{grossCreditedINR.toLocaleString('en-IN')}
                        {hasBreakdown && <span className="ml-1 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-normal">🔍</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-semibold font-mono">
                      ₹{parseInt(row['Total gross proceeds from sale or redemption of investment during the period'], 10).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  {expandedRows.has(idx) && (
                    <tr className="bg-blue-50 border-b border-gray-200">
                      <td colSpan="8" className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4">
                          <Info label="Entity" value={row['Name of entity']} />
                          <Info label="Country" value={row['Country Name and Code']} />
                          <Info label="Address" value={row['Address of entity']} />
                          <Info label="ZIP Code" value={row['ZIP Code']} />
                          <Info label="Nature of Entity" value={row['Nature of entity']} />
                          <Info label="Stock Symbol" value={row['Stock Symbol']} />
                          <Info label="Quantity" value={row['Quantity']} />
                          <Info label="Grant SBI Rate" value={`₹${row['SBI Rate']} (as on ${row['SBI Rate Date']})`} />
                          {row['Sale Date'] && row['Sale Date'] !== 'N/A' && (
                            <>
                              <Info label="Sale Date" value={row['Sale Date']} />
                              <Info label="Sale SBI Rate" value={`₹${row['Sale SBI Rate']} (as on ${row['Sale SBI Rate Date']})`} />
                            </>
                          )}
                          <Info label="Initial Price (USD)" value={`$${row['Initial Price USD']}`} />
                          <Info label="Peak Price (USD)" value={`$${row['Peak Price USD']}`} />
                          <Info label="Closing Price (USD)" value={`$${row['Closing Price USD']}`} />
                          <Info label="Initial Value (INR)" value={`₹${parseInt(row['Initial value of the investment'], 10).toLocaleString('en-IN')}`} />
                          <Info label="Peak Value (INR)" value={`₹${parseInt(row['Peak value of investment during the Period'], 10).toLocaleString('en-IN')}`} />
                          <Info label="Closing Balance (INR)" value={`₹${parseInt(row['Closing balance'], 10).toLocaleString('en-IN')}`} />
                          <Info label="Gross Credited (USD)" value={`$${row['Gross USD'] || '0.00'}`} />
                          <Info label="Gross Credited (INR)" value={`₹${grossCreditedINR.toLocaleString('en-IN')}`} />
                          <Info label="Sale Proceeds (INR)" value={`₹${parseInt(row['Total gross proceeds from sale or redemption of investment during the period'], 10).toLocaleString('en-IN')}`} />
                        </div>

                        {/* Inline Dividend Breakdown Table if available */}
                        {hasBreakdown ? (
                          <div className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm mt-3">
                            <h4 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
                              <span>📊 Dividend Payout Breakdown for {row['Stock Symbol']}</span>
                              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                                {breakdown.length} payout(s)
                              </span>
                            </h4>
                            <BreakdownTable breakdown={breakdown} />
                          </div>
                        ) : (
                          <div className="bg-white rounded-lg p-3 border border-gray-200 text-xs text-gray-500">
                            No individual dividend payouts recorded during this holding period.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer export */}
      <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">Total holdings: <strong>{data.length}</strong></p>
        <button
          type="button"
          onClick={handleExport}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-5 py-2.5 font-semibold text-sm shadow-sm transition flex items-center gap-2"
        >
          📥 Export Schedule FA (CSV)
        </button>
      </div>

      {/* Verification Modal */}
      {modalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Gross Credited Calculation & Verification
                </h3>
                <p className="text-sm text-gray-600">
                  Stock: <strong>{modalRow['Stock Symbol']}</strong> ({modalRow['Name of entity']}) | Quantity: <strong>{modalRow['Quantity']} shares</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalRowIndex(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div>
                <span className="text-xs text-amber-800 uppercase font-semibold">Total Gross (USD)</span>
                <p className="text-lg font-bold text-amber-950 font-mono">${modalRow['Gross USD'] || '0.00'}</p>
              </div>
              <div>
                <span className="text-xs text-amber-800 uppercase font-semibold">Total Gross Credited (INR)</span>
                <p className="text-lg font-bold text-amber-950 font-mono">₹{parseInt(modalRow['Total gross amount paid/credited with respect to the holding during the period'], 10).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {modalRow['Dividend Breakdown'] && modalRow['Dividend Breakdown'].length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Detailed Dividend Payout List</h4>
                <BreakdownTable breakdown={modalRow['Dividend Breakdown']} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No ex-dividend payouts were recorded for {modalRow['Stock Symbol']} between acquisition date ({modalRow['Date of acquiring the interest']}) and period end date.</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalRowIndex(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold text-sm shadow-sm"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-white p-3 border border-gray-200">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-gray-900 mt-1 font-semibold">{value || '-'}</p>
    </div>
  )
}

function BreakdownTable({ breakdown }) {
  const totalUSD = breakdown.reduce((acc, b) => acc + (b.divUSD || 0), 0)
  const totalINR = breakdown.reduce((acc, b) => acc + (b.divINR || 0), 0)

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-xs text-left">
        <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
          <tr>
            <th className="px-3 py-2">Ex-Dividend Date</th>
            <th className="px-3 py-2 text-right">Div/Share (USD)</th>
            <th className="px-3 py-2 text-right">Quantity</th>
            <th className="px-3 py-2 text-right">Total (USD)</th>
            <th className="px-3 py-2 text-right">SBI Rate (INR)</th>
            <th className="px-3 py-2 text-right">Total (INR)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {breakdown.map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{item.date}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-700">${item.divPerShare.toFixed(4)}</td>
              <td className="px-3 py-2 text-right font-mono text-gray-700">{item.quantity}</td>
              <td className="px-3 py-2 text-right font-mono text-amber-700 font-semibold">${item.divUSD.toFixed(2)}</td>
              <td className="px-3 py-2 text-right font-mono text-blue-700">₹{item.sbiRate.toFixed(2)} <span className="text-[10px] text-gray-400">({item.rateDate})</span></td>
              <td className="px-3 py-2 text-right font-mono text-green-700 font-semibold">₹{item.divINR.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t border-gray-300 font-bold text-gray-900">
          <tr>
            <td colSpan="3" className="px-3 py-2 text-right">Sum Total:</td>
            <td className="px-3 py-2 text-right font-mono text-amber-900">${totalUSD.toFixed(2)}</td>
            <td className="px-3 py-2 text-right">-</td>
            <td className="px-3 py-2 text-right font-mono text-green-900">₹{totalINR.toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
