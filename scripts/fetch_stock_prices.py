#!/usr/bin/env python3
import csv
import json
import os
import time
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / 'data'
CONFIG_FILE = DATA_DIR / 'config.json'
PUBLIC_DATA_DIR = ROOT_DIR / 'public' / 'data'
STOCKS_DIR = PUBLIC_DATA_DIR / 'stocks'
ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query'


def load_dotenv(env_path: Path) -> dict:
    if not env_path.exists():
        return {}
    env_data = {}
    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        key, value = stripped.split('=', 1)
        env_data[key.strip()] = value.strip().strip('"').strip("'")
    return env_data


def load_local_env():
    for env_file in [ROOT_DIR / '.env.local', ROOT_DIR / '.env']:
        env_vars = load_dotenv(env_file)
        for key, value in env_vars.items():
            os.environ.setdefault(key, value)


load_local_env()
API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', 'demo')


def load_config() -> dict:
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f'Config file not found: {CONFIG_FILE}')
    return json.loads(CONFIG_FILE.read_text())


def save_stock(symbol: str, prices: list):
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    STOCKS_DIR.mkdir(parents=True, exist_ok=True)

    file_path = STOCKS_DIR / f'{symbol}.csv'
    with open(file_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['date', 'open', 'high', 'low', 'close', 'dividend'])
        writer.writeheader()
        writer.writerows(prices)

    return file_path


# ---------------------------------------------------------------------------
# Yahoo Finance (primary source, no API key needed)
# ---------------------------------------------------------------------------

def fetch_from_yahoo(symbol: str) -> list:
    import yfinance as yf

    ticker = yf.Ticker(symbol)
    df = ticker.history(period='max', auto_adjust=False)
    if df.empty:
        raise ValueError(f'Yahoo Finance returned no data for {symbol}')

    prices = []
    for date_idx, row in df.iterrows():
        date_str = date_idx.strftime('%Y-%m-%d')
        dividend = float(row.get('Dividends', 0.0))
        prices.append({
            'date': date_str,
            'open': round(float(row['Open']), 4),
            'high': round(float(row['High']), 4),
            'low': round(float(row['Low']), 4),
            'close': round(float(row['Close']), 4),
            'dividend': dividend
        })

    prices.sort(key=lambda item: item['date'])
    return prices


# ---------------------------------------------------------------------------
# Alpha Vantage (fallback if Yahoo fails)
# ---------------------------------------------------------------------------

def fetch_url(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode('utf-8')


def parse_daily_series(data: dict) -> list:
    series = data.get('Time Series (Daily)')
    if series is None:
        raise ValueError('Missing time series data')
    prices = []
    for date, values in series.items():
        dividend = float(values.get('7. dividend amount', 0.0))
        prices.append({
            'date': date,
            'open': float(values['1. open']),
            'high': float(values['2. high']),
            'low': float(values['3. low']),
            'close': float(values['4. close']),
            'dividend': dividend
        })
    return sorted(prices, key=lambda item: item['date'])


def fetch_from_alpha_vantage(symbol: str) -> list:
    if API_KEY == 'demo':
        raise RuntimeError('ALPHA_VANTAGE_API_KEY not set')
    url = f'{ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY_ADJUSTED&symbol={symbol}&outputsize=full&apikey={API_KEY}'
    raw = fetch_url(url)
    data = json.loads(raw)
    if 'Error Message' in data:
        raise ValueError(data['Error Message'])
    if 'Note' in data:
        raise RuntimeError(data['Note'])
    return parse_daily_series(data)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def fetch_stock(symbol: str) -> list:
    try:
        print(f'  Trying Yahoo Finance for {symbol}...')
        prices = fetch_from_yahoo(symbol)
        print(f'  ✓ Yahoo Finance returned {len(prices)} rows')
        return prices
    except Exception as e:
        print(f'  ⚠ Yahoo Finance failed: {e}')

    try:
        print(f'  Falling back to Alpha Vantage for {symbol}...')
        prices = fetch_from_alpha_vantage(symbol)
        print(f'  ✓ Alpha Vantage returned {len(prices)} rows')
        return prices
    except Exception as e:
        print(f'  ⚠ Alpha Vantage failed: {e}')
        raise RuntimeError(f'All data sources failed for {symbol}')


def main():
    config = load_config()
    stocks = config.get('stocks', {})
    if not stocks:
        raise ValueError('No stocks configured in config.json')

    for idx, symbol in enumerate(stocks.keys()):
        print(f'Fetching prices for {symbol}...')
        try:
            prices = fetch_stock(symbol)
            file_path = save_stock(symbol, prices)
            print(f'✓ Saved {len(prices)} prices for {symbol} to {file_path}')
        except Exception as e:
            print(f'✗ Failed to fetch {symbol}: {e}')
        if idx < len(stocks) - 1:
            time.sleep(2)


if __name__ == '__main__':
    main()
