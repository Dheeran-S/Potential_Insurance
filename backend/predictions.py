from pathlib import Path
import json
import joblib
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "fraud_detection_voting_model.pkl"

def _expected_columns_from_model(model):
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)
    return None

def _load_expected_columns_fallback():
    cols_path = BASE_DIR / "columns.json"
    if cols_path.exists():
        try:
            with cols_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "columns" in data and isinstance(data["columns"], list):
                return data["columns"]
        except Exception:
            pass
    return None

def predict_fraud(input_dict, model_path=MODEL_PATH):
    model = joblib.load(model_path)
    input_df = pd.DataFrame([input_dict])
    expected_cols = _expected_columns_from_model(model)
    if expected_cols is None:
        expected_cols = _load_expected_columns_fallback() or list(input_df.columns)
    for col in expected_cols:
        if col not in input_df.columns:
            input_df[col] = 0
    input_df = input_df[expected_cols]
    proba = model.predict_proba(input_df)[0][1] * 10
    _ = model.predict(input_df)[0]
    print("\n--- Fraud Prediction Result ---")
    print(f"Predicted Label: {'Fraudulent' if proba >= 0.5 else 'Not Fraudulent'}")
    print(f"Confidence (Fraud Probability): {proba:.1f}")
    print("--------------------------------")
    return 1 if proba >= 0.5 else 0
