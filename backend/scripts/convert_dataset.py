"""Convert the source Excel dataset to CSV (optional convenience).

Run: `python -m scripts.convert_dataset`
"""

import os


def convert(
    src: str = "data/raw/dyeing_dataset.xlsx",
    dst: str = "data/raw/dyeing_dataset.csv",
) -> None:
    import pandas as pd

    if not os.path.exists(src):
        print(f"Source not found: {src}")
        return
    pd.read_excel(src).to_csv(dst, index=False)
    print(f"Wrote {dst}")


if __name__ == "__main__":
    convert()
