import pandas as pd
import os
import glob

def search_asin(asin):
    excel_files = glob.glob("data/xlsx/*.xlsx")
    for f in excel_files:
        try:
            df = pd.read_excel(f)
            # Find any column that might contain ASIN
            for col in df.columns:
                if df[col].astype(str).str.contains(asin).any():
                    print(f"Found {asin} in {f} | Column: {col}")
        except Exception as e:
            print(f"Error reading {f}: {e}")

if __name__ == "__main__":
    search_asin("B0BJZ9GT1J")
