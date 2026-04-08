#!/usr/bin/env python3
"""Create test_data/testdatadefaults.xlsx with default values."""

from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = REPO_ROOT / "test_data" / "testdatadefaults.xlsx"

ROWS = [
    ("param", "value", "description"),
    ("maker_username", "admin", "Maker login username"),
    ("maker_password", "admin", "Maker login password"),
    ("checker_username", "checker", "Checker login username"),
    ("checker_password", "chscker@123", "Checker login password"),
    ("sector_options", "Technology,Financials", "Pick one when not specified"),
    ("ticker_technology", "AAPL,MSFT,NVDA", "Valid tickers for Technology sector"),
    ("ticker_financials", "JPM,BAC,V", "Valid tickers for Financials sector"),
    ("quantity_min", "1", "Min quantity for generated trades"),
    ("quantity_max", "500", "Max quantity for generated trades"),
    ("account_type_options", "Cash,Margin", "Pick one when not specified"),
    ("time_in_force_default", "Day Order", "Default unless GTC specified"),
]


def main() -> None:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "defaults"
    for r, row in enumerate(ROWS, start=1):
        for c, val in enumerate(row, start=1):
            ws.cell(row=r, column=c, value=val)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUTPUT)
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
