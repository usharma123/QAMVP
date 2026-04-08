"""
Locator writer — write crawl results to locators_generated.xlsx.

One sheet per page, columns: element_name, xpath, tier.
The `tier` column (1/2/3) shows locator stability at a glance:
  1 = data-testid (most stable)
  2 = id attribute
  3 = structural (aria-label, text, tag+type) — fragile
"""

from __future__ import annotations

from pathlib import Path


def write_locators_xlsx(
    locators: dict[str, list[dict]],
    path: Path,
) -> None:
    """Write {sheet_name: [{element_name, xpath, tier}, ...]} to an xlsx file.

    Creates one sheet per key. Columns: element_name, xpath, tier.
    Overwrites the file if it already exists.
    """
    import openpyxl

    wb = openpyxl.Workbook()
    # Remove the default empty sheet
    default_sheet = wb.active
    if default_sheet is not None:
        wb.remove(default_sheet)

    for sheet_name, rows in locators.items():
        ws = wb.create_sheet(title=sheet_name)
        ws.append(["element_name", "xpath", "tier"])
        for row in rows:
            ws.append([
                row.get("element_name", ""),
                row.get("xpath", ""),
                row.get("tier", ""),
            ])

    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    wb.close()
