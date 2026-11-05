"""
MediFlow AI 2.0 — Training Pipeline for Consultation Duration Prediction
Model 3: Compares Baseline DummyRegressor vs RandomForestRegressor vs GradientBoostingRegressor.
Evaluates MAE, RMSE, and R2 on chronological test split.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from pathlib import Path

from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.core.config import settings
from training.data_loader import chronological_split, generate_dev_pipeline_dataset

def build_feature_preprocessor():
    categorical_features = ["department", "day_of_week", "priority_level"]
    numeric_features = ["hour_of_day"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("num", StandardScaler(), numeric_features)
        ]
    )
    return preprocessor

def evaluate_regressor(name: str, model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))
    return {
        "model_name": name,
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 4)
    }

def train_appointment_duration_pipeline(use_synthetic: bool = True):
    print("===================================================================")
    print("  MediFlow AI 2.0 — Training Model 3: Consultation Duration        ")
    print("===================================================================")
    
    # 1. Load Data
    if use_synthetic:
        print("ℹ️ Using SYNTHETIC_DEVELOPMENT_PIPELINE dataset (N=1,000) for pipeline verification.")
        df = generate_dev_pipeline_dataset("appointment_duration", n_samples=1000, seed=42)
        dataset_type = "SYNTHETIC_DEVELOPMENT_PIPELINE"
    else:
        raise NotImplementedError("Real production database lacks consultation completion timestamps.")

    # 2. Chronological Split
    train_df, val_df, test_df = chronological_split(df, time_col="timestamp", train_ratio=0.70, val_ratio=0.15)
    print(f"✓ Split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    feature_cols = ["department", "day_of_week", "hour_of_day", "priority_level"]
    target_col = "actual_duration_minutes"

    X_train_full = pd.concat([train_df[feature_cols], val_df[feature_cols]], ignore_index=True)
    y_train_full = pd.concat([train_df[target_col], val_df[target_col]], ignore_index=True)
    
    X_test = test_df[feature_cols]
    y_test = test_df[target_col]

    # 3. Baseline Model (Dummy Median Regressor)
    baseline_pipe = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("regressor", DummyRegressor(strategy="median"))
    ])
    baseline_pipe.fit(X_train_full, y_train_full)
    baseline_metrics = evaluate_regressor("DummyRegressor (Median)", baseline_pipe, X_test, y_test)
    print(f"📊 Baseline (Median): MAE={baseline_metrics['mae']}, RMSE={baseline_metrics['rmse']}, R2={baseline_metrics['r2']}")

    # 4. Candidate 1: Random Forest Regressor
    rf_pipe = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("regressor", RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42))
    ])
    rf_pipe.fit(X_train_full, y_train_full)
    rf_metrics = evaluate_regressor("RandomForestRegressor", rf_pipe, X_test, y_test)
    print(f"📊 Candidate 1 (RF): MAE={rf_metrics['mae']}, RMSE={rf_metrics['rmse']}, R2={rf_metrics['r2']}")

    # 5. Candidate 2: Gradient Boosting Regressor
    gb_pipe = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("regressor", GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08, random_state=42))
    ])
    gb_pipe.fit(X_train_full, y_train_full)
    gb_metrics = evaluate_regressor("GradientBoostingRegressor", gb_pipe, X_test, y_test)
    print(f"📊 Candidate 2 (GB): MAE={gb_metrics['mae']}, RMSE={gb_metrics['rmse']}, R2={gb_metrics['r2']}")

    # 6. Champion Model Selection
    best_pipe = rf_pipe if rf_metrics["r2"] >= gb_metrics["r2"] else gb_pipe
    best_metrics = rf_metrics if rf_metrics["r2"] >= gb_metrics["r2"] else gb_metrics
    print(f"🏆 Champion Model: {best_metrics['model_name']} (R2={best_metrics['r2']})")

    # 7. Serialize Artifacts
    settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_artifact_path = settings.ARTIFACTS_DIR / "appointment_duration_model.joblib"
    joblib.dump(best_pipe, model_artifact_path)
    print(f"✓ Saved consultation duration model to: {model_artifact_path}")

    # 8. Model Registry Entry
    model_metadata = {
        "model_name": "appointment_duration",
        "target_variable": "actual_duration_minutes",
        "model_family": best_metrics["model_name"],
        "version": "1.0.0-dev",
        "status": "IMPLEMENTED_BUT_INSUFFICIENT_DATA",
        "training_date": datetime.now(timezone.utc).isoformat() + "Z",
        "dataset_type": dataset_type,
        "dataset_size": len(df),
        "date_range": "2026-09-01 to 2026-10-31",
        "features": feature_cols,
        "baseline_algorithm": "DummyRegressor(strategy='median')",
        "baseline_metrics": baseline_metrics,
        "model_metrics": best_metrics,
        "artifact_path": str(model_artifact_path.relative_to(settings.BASE_DIR)),
        "insufficient_data_reason": "Production database currently lacks consultation completion timestamps (consultationCompletedAt).",
        "prospective_collection_plan": "Prisma schema enhanced with consultationStartedAt & consultationCompletedAt to capture actual duration on each completed visit."
    }

    return model_metadata

if __name__ == "__main__":
    train_appointment_duration_pipeline(use_synthetic=True)

