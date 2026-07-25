import React from 'react'

export default function Header({ 
  ratesLoaded, 
  cacheLoaded, 
  cacheLoading, 
  stocksCount = 0, 
  ratesCount = 0,
  onReloadCache 
}) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-6 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">ITR Foreign Income Converter</h1>
            <p className="text-blue-100 mt-1">Convert US Dividends & Stock Grants to INR using historical SBI TT Buy rates</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
              cacheLoading 
                ? 'bg-yellow-500 text-white animate-pulse' 
                : cacheLoaded || ratesLoaded
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
            }`}>
              {cacheLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Reloading Cache...</span>
                </>
              ) : cacheLoaded || ratesLoaded ? (
                <>
                  <span>✓ Local Cache Ready</span>
                  <span className="text-xs bg-green-700 px-2 py-0.5 rounded-full font-normal">
                    {ratesCount ? `${ratesCount} Rates` : 'Rates'} | {stocksCount} Stocks
                  </span>
                </>
              ) : (
                <span>⚠️ Cache Error</span>
              )}
            </div>

            {onReloadCache && (
              <button
                onClick={onReloadCache}
                disabled={cacheLoading}
                title="Reload local cache with info stored for SBI rates and stocks"
                className="px-3 py-2 bg-blue-700 hover:bg-blue-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-blue-400"
              >
                <span>↻</span>
                <span>Reload Cache</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
