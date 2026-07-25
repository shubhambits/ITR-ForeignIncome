import React from 'react'

export default function GrantsTable({ grants, onRemove }) {
  if (grants.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <h3 className="px-6 py-4 border-b border-gray-200 font-semibold text-gray-900">Added Stock Grants</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Stock</th>
              <th className="px-6 py-3">Quantity</th>
              <th className="px-6 py-3">Gross USD</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {grants.map((grant, idx) => (
              <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-3">{grant.Date}</td>
                <td className="px-6 py-3 font-medium">{grant.Stock}</td>
                <td className="px-6 py-3">{grant.Quantity}</td>
                <td className="px-6 py-3">{grant.GrossUSD ? `$${grant.GrossUSD}` : '-'}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => onRemove(idx)} className="text-red-600 hover:text-red-800 font-medium">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
