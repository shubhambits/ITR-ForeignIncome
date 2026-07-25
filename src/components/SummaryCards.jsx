import React from 'react'
import { formatCurrency } from '../utils/fxRateUtils'

export default function SummaryCards({ transactions }) {
  const calculateTotals = () => {
    return transactions.reduce((acc, txn) => {
      acc.totalGrossUSD += parseFloat(txn.GrossUSD) || 0
      acc.totalGrossINR += txn.grossINR || 0
      acc.totalTaxUSD += parseFloat(txn.TaxUSD) || 0
      acc.totalTaxINR += txn.taxINR || 0
      acc.totalNetUSD += txn.netUSD || 0
      acc.totalNetINR += txn.netINR || 0
      if (txn.rate) {
        acc.validRatesCount += 1
        acc.sumRates += txn.rate
      }
      return acc
    }, {
      totalGrossUSD: 0,
      totalGrossINR: 0,
      totalTaxUSD: 0,
      totalTaxINR: 0,
      totalNetUSD: 0,
      totalNetINR: 0,
      validRatesCount: 0,
      sumRates: 0
    })
  }

  const totals = calculateTotals()
  const avgRate = totals.totalGrossUSD > 0 
    ? (totals.totalGrossINR / totals.totalGrossUSD) 
    : (totals.validRatesCount > 0 ? totals.sumRates / totals.validRatesCount : 0)

  const Card = ({ title, icon, value1Label, value1, value2Label, value2, singleValue, singleLabel }) => (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 border-l-4 border-l-blue-600">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          {singleValue !== undefined ? (
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-blue-700">{singleValue}</p>
              <p className="text-xs text-gray-500 mt-1">{singleLabel}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              <div>
                <p className="text-xs text-gray-400 font-medium">{value1Label}</p>
                <p className="text-lg font-bold text-gray-900 font-mono">${formatCurrency(value1)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{value2Label}</p>
                <p className="text-lg font-bold text-blue-600 font-mono">₹{formatCurrency(value2)}</p>
              </div>
            </div>
          )}
        </div>
        <div className="text-2xl p-2 bg-blue-50 rounded-lg">{icon}</div>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      <Card
        title="Avg Conversion Rate"
        icon="💱"
        singleValue={avgRate > 0 ? `₹${formatCurrency(avgRate, 4)}` : '-'}
        singleLabel="Effective SBI TT Buy Rate per USD"
      />
      <Card
        title="Total Gross Income"
        icon="💰"
        value1Label="USD"
        value1={totals.totalGrossUSD}
        value2Label="INR (Converted)"
        value2={totals.totalGrossINR}
      />
      <Card
        title="Total Tax Withheld"
        icon="📊"
        value1Label="USD"
        value1={totals.totalTaxUSD}
        value2Label="INR (Converted)"
        value2={totals.totalTaxINR}
      />
      <Card
        title="Total Net Received"
        icon="💵"
        value1Label="USD"
        value1={totals.totalNetUSD}
        value2Label="INR (Converted)"
        value2={totals.totalNetINR}
      />
    </div>
  )
}

