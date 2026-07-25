#!/usr/bin/env python3
"""Convert existing JSON stock price files to CSV format."""
import json
import csv
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
STOCKS_DIR = ROOT_DIR / 'public' / 'data' / 'stocks'


def convert_json_to_csv():
    if not STOCKS_DIR.exists():
        print(f'No stocks directory found: {STOCKS_DIR}')
        return

    json_files = list(STOCKS_DIR.glob('*.json'))
    if not json_files:
        print('No JSON stock files found.')
        return

    for json_file in json_files:
        try:
            data = json.loads(json_file.read_text())
            csv_file = json_file.with_suffix('.csv')
            
            # Write CSV with prices only
            with open(csv_file, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['date', 'open', 'high', 'low', 'close'])
                writer.writeheader()
                writer.writerows(data['prices'])
            
            print(f'✓ {json_file.name} → {csv_file.name} ({len(data["prices"])} rows)')
        except Exception as e:
            print(f'✗ Failed to convert {json_file.name}: {e}')


if __name__ == '__main__':
    convert_json_to_csv()
    print('Conversion complete!')
