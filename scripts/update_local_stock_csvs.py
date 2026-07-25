#!/usr/bin/env python3
import csv
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
STOCKS_DIR = ROOT_DIR / 'public' / 'data' / 'stocks'

# Known quarterly ex-dividend dates and payout amounts (USD) for our cached stock set
DIVIDEND_HISTORY = {
    'MSFT': {
        # 2021
        '2021-08-18': 0.56, '2021-11-17': 0.62,
        # 2022
        '2022-02-16': 0.62, '2022-05-18': 0.62, '2022-08-17': 0.62, '2022-11-16': 0.68,
        # 2023
        '2023-02-15': 0.68, '2023-05-17': 0.68, '2023-08-16': 0.68, '2023-11-15': 0.75,
        # 2024
        '2024-02-14': 0.75, '2024-05-15': 0.75, '2024-08-21': 0.75, '2024-11-21': 0.83,
        # 2025
        '2025-02-19': 0.83, '2025-05-21': 0.83, '2025-08-20': 0.83, '2025-11-19': 0.90,
        # 2026
        '2026-02-18': 0.90, '2026-05-20': 0.90
    },
    'AAPL': {
        # 2021
        '2021-08-06': 0.22, '2021-11-05': 0.22,
        # 2022
        '2022-02-04': 0.22, '2022-05-06': 0.23, '2022-08-05': 0.23, '2022-11-04': 0.23,
        # 2023
        '2023-02-10': 0.23, '2023-05-12': 0.24, '2023-08-11': 0.24, '2023-11-10': 0.24,
        # 2024
        '2024-02-09': 0.24, '2024-05-10': 0.25, '2024-08-12': 0.25, '2024-11-08': 0.25,
        # 2025
        '2025-02-07': 0.25, '2025-05-09': 0.26, '2025-08-08': 0.26, '2025-11-07': 0.26,
        # 2026
        '2026-02-06': 0.26, '2026-05-08': 0.26
    },
    'ORCL': {
        # 2021
        '2021-10-12': 0.32,
        # 2022
        '2022-01-06': 0.32, '2022-04-07': 0.32, '2022-07-11': 0.32, '2022-10-11': 0.32,
        # 2023
        '2023-01-10': 0.32, '2023-04-11': 0.40, '2023-07-11': 0.40, '2023-10-10': 0.40,
        # 2024
        '2024-01-10': 0.40, '2024-04-10': 0.40, '2024-07-10': 0.40, '2024-10-10': 0.40,
        # 2025
        '2025-01-09': 0.40, '2025-04-09': 0.50, '2025-07-09': 0.50, '2025-10-09': 0.50,
        # 2026
        '2026-01-08': 0.50, '2026-04-08': 0.50
    },
    'GOOGL': {
        # 2024 (Alphabet started dividend in 2024)
        '2024-06-10': 0.20, '2024-09-09': 0.20, '2024-12-09': 0.20,
        # 2025
        '2025-03-10': 0.20, '2025-06-09': 0.20, '2025-09-08': 0.20, '2025-12-08': 0.20,
        # 2026
        '2026-03-09': 0.20, '2026-06-08': 0.20
    }
}


def update_csv_file(file_path: Path):
    symbol = file_path.stem
    div_map = DIVIDEND_HISTORY.get(symbol, {})

    with open(file_path, 'r', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    new_rows = []
    div_count = 0

    for row in rows:
        date = row['date']
        dividend = div_map.get(date, 0.0)
        if dividend > 0:
            div_count += 1
        new_rows.append({
            'date': date,
            'open': row['open'],
            'high': row['high'],
            'low': row['low'],
            'close': row['close'],
            'dividend': f'{dividend:.4f}' if dividend > 0 else '0.0'
        })

    with open(file_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['date', 'open', 'high', 'low', 'close', 'dividend'])
        writer.writeheader()
        writer.writerows(new_rows)

    print(f'✓ Updated {file_path.name}: {len(new_rows)} rows, {div_count} dividend payouts')


def main():
    if not STOCKS_DIR.exists():
        print(f'Stocks dir not found: {STOCKS_DIR}')
        return

    csv_files = sorted(STOCKS_DIR.glob('*.csv'))
    for csv_file in csv_files:
        update_csv_file(csv_file)


if __name__ == '__main__':
    main()
