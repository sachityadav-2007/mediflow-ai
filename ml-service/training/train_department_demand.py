"""
MediFlow AI 2.0 — Training Pipeline for Department Demand Forecasting
Model 4: Compares 7-Day Moving Average Baseline vs Time-Series Regressor with Lag Features.
Evaluates MAE, RMSE, and WAPE across future 7-day forecast horizons.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error

from app.core.config import settings
from training.data_loader import chronological_split, generate_dev_pipeline_dataset

def build_demand_feature_pipeline():
    categorical_features = ["department", "day_of_week"]
    numeric_features = ["day_of_month", "month", "is_weekend", "lag_1", "lag_7", "rolling_mean_7"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("num", StandardScaler(), numeric_features)
        ]
    )
    return preprocessor

def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    df_sorted = df.sort_values(by=["department", "timestamp"]).copy()
    
    df_sorted["lag_1"] = df_sorted.groupby("department")["appointment_count"].shift(1)
    df_sorted["lag_7"] = df_sorted.groupby("department")["appointment_count"].shift(7)
    df_sorted["rolling_mean_7"] = df_sorted.groupby("department")["appointment_count"].shift(1).rolling(7).mean()
    
    # Backfill earliest rows cleanly
    df_sorted = df_sorted.dropna().reset_index(drop=True)
    return df_sorted

def calculate_wape(y_true, y_pred) -> float:
    total_true = np.sum(y_true)
    if total_true == 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / total_true)

def train_department_demand_pipeline(use_synthetic: bool = True):
    print("===================================================================")
    print("  MediFlow AI 2.0 — Training Model 4: Department Demand Forecast   ")
    print("===================================================================")
    
    # 1. Load Data
    if use_synthetic:
        print("ℹ️ Using SYNTHETIC_DEVELOPMENT_PIPELINE dataset (120 days) for pipeline verification.")
        raw_df = generate_dev_pipeline_dataset("department_demand", seed=42)
        dataset_type = "SYNTHETIC_DEVELOPMENT_PIPELINE"
    else:
        raise NotImplementedError("Production database has only 16 days of booking history across 9 departments.")

    # 2. Engineer Time-Series Lag Features
    df = create_lag_features(raw_df)
    print(f"✓ Engineered lag features. Feasible modeling rows: {len(df)}")

    # 3. Chronological Split (Last 14 days reserved for test evaluation)
    train_df, val_df, test_df = chronological_split(df, time_col="timestamp", train_ratio=0.75, val_ratio=0.10)
    print(f"✓ Split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    feature_cols = ["department", "day_of_week", "day_of_month", "month", "is_weekend", "lag_1", "lag_7", "rolling_mean_7"]
    target_col = "appointment_count"

    X_train_full = pd.concat([train_df[feature_cols], val_df[feature_cols]], ignore_index=True)
    y_train_full = pd.concat([train_df[target_col], val_df[target_col]], ignore_index=True)

    X_test = test_df[feature_cols]
    y_test = test_df[target_col]

    # 4. Moving-Average Baseline (uses rolling_mean_7 directly)
    baseline_pred = test_df["rolling_mean_7"].values
    base_mae = float(mean_absolute_error(y_test, baseline_pred))
    base_rmse = float(np.sqrt(mean_squared_error(y_test, baseline_pred)))
    base_wape = calculate_wape(y_test.values, baseline_pred)
    baseline_metrics = {
        "model_name": "7-Day Moving Average Baseline",
        "mae": round(base_mae, 3),
        "rmse": round(base_rmse, 3),
        "wape": round(base_wape, 4)
    }
    print(f"📊 Baseline (7-Day MA): MAE={baseline_metrics['mae']}, RMSE={baseline_metrics['rmse']}, WAPE={baseline_metrics['wape']}")

    # 5. Candidate: Time-Series Random Forest Regressor
    rf_pipe = Pipeline([
        ("preprocessor", build_demand_feature_pipeline()),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42))
    ])
    rf_pipe.fit(X_train_full, y_train_full)
    
    rf_pred = rf_pipe.predict(X_test)
    rf_mae = float(mean_absolute_error(y_test, rf_pred))
    rf_rmse = float(np.sqrt(mean_squared_error(y_test, rf_pred)))
    rf_wape = calculate_wape(y_test.values, rf_pred)
    rf_metrics = {
        "model_name": "RandomForestRegressor (Time-Series Lag)",
        "mae": round(rf_mae, 3),
        "rmse": round(rf_rmse, 3),
        "wape": round(rf_wape, 4)
    }
    print(f"📊 Candidate (RF Lag): MAE={rf_metrics['mae']}, RMSE={rf_metrics['rmse']}, WAPE={rf_metrics['wape']}")

    # 6. Serialize Artifacts
    settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_artifact_path = settings.ARTIFACTS_DIR / "department_demand_model.joblib"
    joblib.dump(rf_pipe, model_artifact_path)
    print(f"✓ Saved department demand model to: {model_artifact_path}")

    # 7. Model Registry Entry
    model_metadata = {
        "model_name": "department_demand_forecast",
        "target_variable": "daily_appointment_count",
        "model_family": "RandomForestRegressor (Time-Series Lag)",
        "version": "1.0.0-dev",
        "status": "IMPLEMENTED_BUT_INSUFFICIENT_DATA",
        "training_date": datetime.utcnow().isoformat() + "Z",
        "dataset_type": dataset_type,
        "dataset_size": len(raw_df),
        "date_range": "120 continuous operational days",
        "features": feature_cols,
        "baseline_algorithm": "7-Day Moving Average Baseline",
        "baseline_metrics": baseline_metrics,
        "model_metrics": rf_metrics,
        "artifact_path": str(model_artifact_path.relative_to(settings.BASE_DIR)),
        "insufficient_data_reason": "Production database currently contains only 16 days of booking history across 9 departments (requires >= 60 days to compute autoregressive seasonal lags without NaN dropouts).",
        "prospective_collection_plan": "Historical bookings accumulate automatically as appointments are scheduled. Moving average baseline provides interim operational insight."
    }

    return model_metadata

if __name__ == "__main__":
    train_department_demand_pipeline(use_synthetic=True)

