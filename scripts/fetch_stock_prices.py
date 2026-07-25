#!/usr/bin/env python3
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


def fetch_url(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode('utf-8')


def load_config() -> dict:
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f'Config file not found: {CONFIG_FILE}')
    return json.loads(CONFIG_FILE.read_text())


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


def save_stock(symbol: str, prices: list):
    import csv
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    STOCKS_DIR.mkdir(parents=True, exist_ok=True)
    
    file_path = STOCKS_DIR / f'{symbol}.csv'
    with open(file_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['date', 'open', 'high', 'low', 'close', 'dividend'])
        writer.writeheader()
        writer.writerows(prices)
    
    return file_path


def fetch_stock(symbol: str) -> list:
    if API_KEY == 'demo':
        raise RuntimeError('ALPHA_VANTAGE_API_KEY environment variable is not set')
    url = f'{ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY_ADJUSTED&symbol={symbol}&outputsize=full&apikey={API_KEY}'
    raw = fetch_url(url)
    data = json.loads(raw)
    if 'Error Message' in data:
        raise ValueError(data['Error Message'])
    if 'Note' in data:
        raise RuntimeError(data['Note'])
    return parse_daily_series(data)


def main():
    if API_KEY == 'demo':
        print('⚠ ALPHA_VANTAGE_API_KEY is not set; skipping stock price fetch.')
        return

    config = load_config()
    stocks = config.get('stocks', {})
    if not stocks:
        raise ValueError('No stocks configured in config.json')

    for idx, symbol in enumerate(stocks.keys()):
        print(f'Fetching prices for {symbol}...')
        prices = fetch_stock(symbol)
        file_path = save_stock(symbol, prices)
        print(f'✓ Saved {len(prices)} prices for {symbol} to {file_path}')
        if idx < len(stocks) - 1:
            time.sleep(12)
