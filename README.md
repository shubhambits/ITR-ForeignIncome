# ITR Foreign Income Converter

A React + Vite application for converting US Foreign Income (Dividends & Stock Grants/RSUs) to INR using historical SBI TT Buy rates for Indian Income Tax Return (ITR) reporting.

## 🎯 Features

### 💵 Foreign Income Converter
- **Automatic SBI FX Rate Fetching**: Loads reference rates from the SBI FX RateKeeper repository
- **Smart Rate Matching**: Finds the appropriate exchange rate for the previous calendar month's last working day
- **Multiple Transaction Types**: Supports Dividends and Stock Grants (RSU/ESPP)
- **Drag & Drop CSV Upload**: Easy file upload with format validation
- **Real-time Conversion**: Instantly converts transactions to INR
- **Summary Dashboard**: Aggregate statistics for gross income, taxes, and net amounts
- **CSV Export**: Export converted transactions for ITR filing

### 📊 Stock Grants & Schedule FA
- **Historical Stock Price Fetching**: Integrates with Alpha Vantage API for real-time historical stock data
- **Schedule FA Generation**: Automatically formats stock holdings data for ITR Schedule FA filing
- **Multi-Point Valuation**: Calculates acquisition value, peak value, and closing balance
- **Flexible Data Entry**: Upload CSV or manually enter stock grant data
- **Asset Tracking**: Complete foreign assets documentation with company details and valuations

### 🌐 General
- **GitHub Pages Deployment**: Pre-configured for automatic deployment
- **Tabbed Interface**: Seamless navigation between Foreign Income and Stock Grants sections

## 📋 Tech Stack

- **React 18+** - UI Framework
- **Vite** - Fast build tool
- **Tailwind CSS** - Styling
- **PapaParse** - CSV parsing and generation
- **GitHub Actions** - CI/CD deployment

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173` (or another port if 5173 is busy).

### 3. Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### 4. Preview Production Build

```bash
npm run preview
```

## 📊 CSV Format

### Foreign Income CSV
Your input CSV must have the following columns:

| Column | Format | Example | Required |
|--------|--------|---------|----------|
| Date | YYYY-MM-DD or DD/MM/YYYY | 2026-03-15 | ✅ |
| Type | Dividend or Stock Grant | Dividend | ✅ |
| GrossUSD | Decimal number | 1000.00 | ✅ |
| TaxUSD | Decimal number | 150.00 | ✅ |
| Description | Any text | Apple Inc. Quarterly Dividend | ✅ |

See `sample_input.csv` for an example.

### Stock Grants (Schedule FA) CSV
For Schedule FA reporting of stock holdings:

| Column | Format | Example | Required |
|--------|--------|---------|----------|
| Date | YYYY-MM-DD or DD/MM/YYYY | 2026-01-15 | ✅ |
| Stock | Ticker symbol | AAPL | ✅ |
| Quantity | Number | 100 | ✅ |
| Company | Company name | Apple Inc. | ❌ |
| CompanyAddress | Street address | 1 Apple Park Way | ❌ |
| CompanyZIP | ZIP code | 95014 | ❌ |
| GrossUSD | Decimal number | 5000.00 | ❌ |
| ProceedsUSD | Decimal number | 0.00 | ❌ |
| Description | Any text | RSU Vesting Q1 2026 | ❌ |

See `sample_stock_grants.csv` for an example.

**Note:** You can also manually enter stock grant details one at a time using the form in the Stock Grants section.

## 📈 Stock Grants & Schedule FA

The app includes a dedicated section for tracking and reporting foreign stock holdings for ITR Schedule FA filing.

### Features

- **Historical Stock Price Fetching**: Uses Alpha Vantage API to fetch real-time historical stock prices
- **Multi-Point Valuation**: Calculates three key valuations:
  1. **Initial Value**: Stock price on acquisition date × quantity
  2. **Peak Value**: Highest stock price during the reporting period × quantity
  3. **Closing Balance**: Stock price on period end date × quantity
- **Manual & Bulk Entry**: Upload multiple stock grants via CSV or add them one-by-one
- **Complete Asset Tracking**: Includes company details, addresses, and transaction amounts

### Getting Started with Stock Grants

1. **Get an Alpha Vantage API Key**:
   - Visit [Alpha Vantage](https://www.alphavantage.co/api/) and sign up for a free API key
   - Free tier: 5 requests per minute, unlimited daily requests with daily cap

2. **Create a local env file**:
   - Copy `.env.example` to `.env.local`
   - Set `ALPHA_VANTAGE_API_KEY=your_key_here`

3. **Seed stock price data locally**:
   - Run `python scripts/fetch_stock_prices.py`
   - Confirm historical price JSON files are created under `public/data/stocks/`

> Note: The frontend app reads cached stock price data from `public/data/stocks/`. The API key is only required by the local fetch script or GitHub workflow.

4. **Upload Your Stock Data**:
   - Click on the "Stock Grants - Schedule FA" tab
   - Upload a CSV file or manually add stock grants

5. **Generate Schedule FA**:
   - Set your financial period end date
   - Click "Generate Schedule FA"
   - The app reads cached stock data and calculates valuations

6. **Export Results**:
   - Click "Export Schedule FA (CSV)" to download the formatted data
   - Use the CSV for ITR filing

### Schedule FA Output Columns

The generated Schedule FA includes all required fields for ITR-2 filing:

- Country Name and Code
- Name of entity
- Address of entity
- ZIP Code
- Nature of entity
- Date of acquiring the interest
- Initial value of the investment
- Peak value of investment during the Period
- Closing balance
- Total gross amount paid/credited with respect to the holding during the period
- Total gross proceeds from sale or redemption of investment during the period

## 💡 How It Works

### Rate Matching Algorithm (Foreign Income)

1. For a transaction on date `D`, the app finds the **last working day of the previous calendar month**
   - Example: Transaction on 2026-03-15 → Look for rates in February 2026
2. The app searches backward **up to 10 days** from that date to find an available SBI TT Buy rate
3. If found, that rate is used for conversion; otherwise, an error is indicated

### Calculation Logic (Foreign Income)

For each transaction:

```
Gross (INR) = GrossUSD × Matched TT Buy Rate
Tax (INR) = TaxUSD × Matched TT Buy Rate
Net (USD) = GrossUSD - TaxUSD
Net (INR) = Gross (INR) - Tax (INR)
```

### Stock Valuation Logic (Stock Grants)

For each stock holding, the app:
1. Fetches historical daily prices from Alpha Vantage for the stock symbol
2. Finds the closest price on or before the acquisition date
3. Searches for the peak price between acquisition date and period end date
4. Finds the closing price on the period end date
5. Multiplies each price by the quantity held to determine valuations

## 🌐 Deployment to GitHub Pages

### Prerequisites

- GitHub repository with this code
- Your repository must be public or have appropriate permissions

### Automatic Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Triggers on every push to the `main` branch
2. Installs dependencies
3. Builds the project with Vite
4. Deploys to GitHub Pages

To enable automatic deployment:

1. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. In your GitHub repository, go to **Settings → Pages**
3. Ensure the deployment source is set to "GitHub Actions"
4. The workflow will automatically deploy on the next push

Your app will be live at: `https://<your-username>.github.io/<repository-name>/`

### Manual Deployment

To manually deploy:

```bash
npm run build
# Deploy the dist/ folder to your hosting service
```

## 📁 Project Structure

```
ITR-ForeignIncome/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions workflow
├── src/
│   ├── components/
│   │   ├── Header.jsx              # Top header with status
│   │   ├── SummaryCards.jsx        # Aggregate statistics
│   │   ├── UploadZone.jsx          # Drag & drop upload
│   │   ├── DataTable.jsx           # Transaction table
│   │   ├── StockGrantsUpload.jsx   # Stock grants form & upload
│   │   └── ScheduleFAOutput.jsx    # Schedule FA results table
│   ├── pages/
│   │   └── StockGrantsPage.jsx     # Stock grants main page
│   ├── utils/
│   │   ├── fxRateUtils.js          # FX rate logic
│   │   └── stockPriceUtils.js      # Stock price & valuation logic
│   ├── App.jsx                     # Main app with tabbed navigation
│   ├── main.jsx                    # Entry point
│   └── index.css                   # Tailwind CSS
├── index.html                      # HTML template
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.js               # PostCSS configuration
├── package.json                    # Dependencies
├── .gitignore                      # Git ignore rules
├── public/
│   └── data/                       # Cached market data served by the app
├── sample_input.csv                # Example foreign income CSV
├── sample_stock_grants.csv         # Example stock grants CSV
└── README.md                       # This file
```

## 🧠 Cached Market Data

The app loads stored market data from `public/data/`.
- `public/data/sbi-rates.json`: SBI TT Buy exchange rates
- `public/data/stocks/<SYMBOL>.json`: historical stock prices for each ticker

A scheduled GitHub Actions workflow updates these files automatically.

## 🔌 External Data Sources

### SBI FX Reference Rates (Foreign Income)
The application fetches SBI FX Reference Rates from:
```
https://raw.githubusercontent.com/sahilgupta/sbi-fx-ratekeeper/main/csv_files/SBI_REFERENCE_RATES_USD.csv
```
Credits: [SBI FX RateKeeper](https://github.com/sahilgupta/sbi-fx-ratekeeper)

### Alpha Vantage Stock Prices (Stock Grants)
Historical stock prices are cached from Alpha Vantage into `public/data/stocks/`.
```
https://www.alphavantage.co/query
```
- **Free Tier**: 5 requests per minute, unlimited daily calls with daily caps
- **Sign Up**: [Alpha Vantage API](https://www.alphavantage.co/api/)
- **Documentation**: Supports 20+ years of historical daily data

## ⚠️ Important Notes for ITR Reporting

### Foreign Income (Dividends & Withholding Tax)
1. **Rate Dates**: Ensure the matched rate dates are from the correct previous month as per IT return filing rules
2. **Documentation**: Maintain records of:
   - Original transaction dates and amounts
   - Matched exchange rate dates and rates
   - Converted INR amounts
   - Source of exchange rates (SBI TT Buy)
3. **Tax Compliance**: Consult with a tax professional to ensure compliance with current Indian tax regulations
4. **Schedule USD (Countries in List 2)**: Report with Schedule USD as per applicable tax rules

### Stock Grants & Schedule FA (Foreign Assets)
1. **Eligibility**: Schedule FA must be filed if you hold any foreign assets
2. **Reporting Threshold**: As per current rules, Schedule FA is mandatory for all filers
3. **Stock Price Accuracy**: 
   - The app uses Alpha Vantage's historical data which is generally accurate
   - Verify critical prices against official stock exchange records
   - Peak price calculation uses closing prices; adjust if needed based on intra-day values
4. **Documentation**:
   - Maintain records of acquisition documents (offer letters, grant agreements)
   - Keep stock confirmations and brokerage statements
   - Store API fetch records for audit trail
5. **Fair Value on Reporting Date**:
   - Closing balance should reflect fair value on the last day of the reporting period
   - Use exchange rates for USD-INR conversions if converting to INR (separately)
6. **CGT Considerations**:
   - Initial value used for Schedule FA may differ from cost price for capital gains calculation
   - Maintain separate records for capital gains reporting
7. **Professional Advice**: Consult a tax professional about:
   - Appropriate valuation methods for your situation
   - TDS/WHT implications on stock sales
   - Any exemptions or special treatment applicable to your case

## 🐛 Troubleshooting

### Rates not loading
- Check your internet connection
- Ensure the SBI FX RateKeeper repository is accessible
- Check browser console for errors (F12)

### Stock prices not fetching
- **Invalid API Key**: Verify your Alpha Vantage API key is correct and active
- **Rate Limit**: Free tier has 5 requests/minute. Wait and retry if exceeded
- **Invalid Ticker**: Ensure the stock symbol is correct (e.g., AAPL, MSFT)
- **Market Holidays**: No data available for weekends and holidays
- **Data Gap**: Historical data may not be complete for recently listed stocks

### CSV not uploading
- Verify the file has correct column names
- Ensure date format is YYYY-MM-DD or DD/MM/YYYY
- Check that all required columns are present

### Stock Grant data not processing
- Verify all stock symbols are valid US ticker symbols
- Ensure dates are in correct format
- Check that API key is valid and has available quota
- Try uploading one stock at a time to isolate issues

### Deployment issues
- Verify GitHub token permissions
- Check GitHub Actions logs for errors
- Ensure `main` branch is correctly configured

## 📝 API Key Management

### Alpha Vantage API Key
- **Get Key**: [Sign up at Alpha Vantage](https://www.alphavantage.co/api/)
- **Free Tier Limits**: 5 requests per minute
- **Local config**: copy `.env.example` to `.env.local` and set `ALPHA_VANTAGE_API_KEY`
- **Best Practice**: Store safely, don't commit to version control
- **Rate Limiting**: The stock fetch script respects Alpha Vantage limits and pauses between symbols
- **Note**: The frontend app reads cached data from `public/data/stocks/`; the key is used only by the local/GitHub fetch script

## 📄 License

This project is open source and available for personal use.

## 📧 Support

For issues or questions, please open an issue on the GitHub repository.

---

**Last Updated**: July 25, 2026
**Version**: 1.1.0
**Latest Changes**: Added Stock Grants & Schedule FA module with Alpha Vantage integration
