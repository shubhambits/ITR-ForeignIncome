#!/usr/bin/env python3
import csv
import json
import os
import urllib.request
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / 'public' / 'data'
SBI_RATES_FILE = DATA_DIR / 'sbi-rates.csv'
SBI_RATES_URL = 'https://raw.githubusercontent.com/sahilgupta/sbi-fx-ratekeeper/main/csv_files/SBI_REFERENCE_RATES_USD.csv'


def fetch_url(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode('utf-8')


def parse_sbi_csv(csv_text: str) -> dict:
    rows = csv_text.splitlines()
    reader = csv.DictReader(rows, skipinitialspace=True)
    rates = {}
    for row in reader:
        date_value = row.get('DATE') or row.get('Date') or row.get('date')
        rate_str = row.get('TT BUY') or row.get('TT Buy') or row.get('TT Buy Rate')
        if not date_value or not rate_str:
            continue

        date = date_value.split()[0].strip()
        try:
            rate = float(rate_str)
        except (TypeError, ValueError):
            continue

        if rate <= 0:
            continue

        rates[date] = rate
    return rates


def save_rates(rates: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(SBI_RATES_FILE, 'w') as f:
        f.write('date,rate\n')
        for date in sorted(rates.keys(), reverse=True):
            f.write(f'{date},{rates[date]}\n')


def main():
    print('Fetching SBI FX rates...')
    csv_text = fetch_url(SBI_RATES_URL)
    rates = parse_sbi_csv(csv_text)
    save_rates(rates)
    print(f'✓ Saved {len(rates)} SBI rates to {SBI_RATES_FILE}')


if __name__ == '__main__':
    main()
