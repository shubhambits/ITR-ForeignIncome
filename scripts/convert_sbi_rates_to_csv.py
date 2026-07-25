#!/usr/bin/env python3
"""Convert existing SBI rates JSON file to CSV format."""
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / 'public' / 'data'


def convert_sbi_rates_to_csv():
    json_file = DATA_DIR / 'sbi-rates.json'
    
    if not json_file.exists():
        print(f'SBI rates file not found: {json_file}')
        return

    try:
        data = json.loads(json_file.read_text())
        csv_file = DATA_DIR / 'sbi-rates.csv'
        
        # Write CSV: date,rate
        with open(csv_file, 'w') as f:
            f.write('date,rate\n')
            for date in sorted(data['ratesUSD'].keys(), reverse=True):
                rate = data['ratesUSD'][date]
                f.write(f'{date},{rate}\n')
        
        print(f'✓ sbi-rates.json → sbi-rates.csv ({len(data["ratesUSD"])} rows)')
    except Exception as e:
        print(f'✗ Failed to convert SBI rates: {e}')


if __name__ == '__main__':
    convert_sbi_rates_to_csv()
    print('Conversion complete!')
