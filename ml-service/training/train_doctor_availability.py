"""
MediFlow AI 2.0 — Training Pipeline for Doctor Availability & Delay Prediction
Model 2: Compares Baseline DummyClassifier vs LogisticRegression vs RandomForestClassifier.
Evaluates Precision, Recall, F1-score, and ROC-AUC under class-imbalanced healthcare conditions.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

from app.core.config import settings
from training.data_loader import chronological_split, generate_dev_pipeline_dataset

def build_feature_preprocessor():
    categorical_features = ["department", "day_of_week"]
    numeric_features = ["hour_of_day"]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("num", StandardScaler(), numeric_features)
        ]
    )
    return preprocessor

def evaluate_classifier(name: str, model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else y_pred
    
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    try:
        auc = float(roc_auc_score(y_test, y_prob))
    except Exception:
        auc = 0.5
        
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    return {
        "model_name": name,
        "precision": round(prec, 3),
        "recall": round(rec, 3),
        "f1_score": round(f1, 3),
        "roc_auc": round(auc, 3),
        "confusion_matrix": cm
    }

def train_doctor_availability_pipeline(use_synthetic: bool = True):
    print("===================================================================")
    print("  MediFlow AI 2.0 — Training Model 2: Doctor Availability & Delay  ")
    print("===================================================================")
    
    # 1. Load Data
    if use_synthetic:
        print("ℹ️ Using SYNTHETIC_DEVELOPMENT_PIPELINE dataset (N=1,000) for pipeline verification.")
        df = generate_dev_pipeline_dataset("doctor_availability", n_samples=1000, seed=42)
        dataset_type = "SYNTHETIC_DEVELOPMENT_PIPELINE"
    else:
        raise NotImplementedError("Real production database contains only 17 doctor attendance logs.")

    # 2. Chronological Split
    train_df, val_df, test_df = chronological_split(df, time_col="timestamp", train_ratio=0.70, val_ratio=0.15)
    print(f"✓ Split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")

    feature_cols = ["department", "day_of_week", "hour_of_day"]
    target_avail = "is_available"
    target_delay = "is_delayed"

    X_train_full = pd.concat([train_df[feature_cols], val_df[feature_cols]], ignore_index=True)
    y_avail_full = pd.concat([train_df[target_avail], val_df[target_avail]], ignore_index=True)
    y_delay_full = pd.concat([train_df[target_delay], val_df[target_delay]], ignore_index=True)
    
    X_test = test_df[feature_cols]
    y_avail_test = test_df[target_avail]
    y_delay_test = test_df[target_delay]

    # 3. Availability Baseline (Most Frequent)
    avail_baseline = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("classifier", DummyClassifier(strategy="most_frequent"))
    ])
    avail_baseline.fit(X_train_full, y_avail_full)
    baseline_metrics = evaluate_classifier("DummyClassifier (Most Frequent)", avail_baseline, X_test, y_avail_test)
    print(f"📊 Baseline Availability: F1={baseline_metrics['f1_score']}, AUC={baseline_metrics['roc_auc']}")

    # 4. Availability Candidate: Logistic Regression
    lr_avail = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("classifier", LogisticRegression(class_weight="balanced", random_state=42))
    ])
    lr_avail.fit(X_train_full, y_avail_full)
    lr_metrics = evaluate_classifier("LogisticRegression", lr_avail, X_test, y_avail_test)
    print(f"📊 Candidate 1 (Logistic): F1={lr_metrics['f1_score']}, AUC={lr_metrics['roc_auc']}")

    # 5. Availability Candidate: Random Forest Classifier
    rf_avail = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("classifier", RandomForestClassifier(n_estimators=100, max_depth=6, class_weight="balanced", random_state=42))
    ])
    rf_avail.fit(X_train_full, y_avail_full)
    rf_metrics = evaluate_classifier("RandomForestClassifier", rf_avail, X_test, y_avail_test)
    print(f"📊 Candidate 2 (RF): F1={rf_metrics['f1_score']}, AUC={rf_metrics['roc_auc']}")

    # 6. Train Delay Classifier (Random Forest)
    rf_delay = Pipeline([
        ("preprocessor", build_feature_preprocessor()),
        ("classifier", RandomForestClassifier(n_estimators=100, max_depth=6, class_weight="balanced", random_state=42))
    ])
    rf_delay.fit(X_train_full, y_delay_full)
    delay_metrics = evaluate_classifier("RandomForestClassifier (Delay)", rf_delay, X_test, y_delay_test)
    print(f"📊 Delay Model (RF): F1={delay_metrics['f1_score']}, AUC={delay_metrics['roc_auc']}")

    # 7. Package Dual Predictor Artifact
    best_avail_pipe = rf_avail if rf_metrics["roc_auc"] >= lr_metrics["roc_auc"] else lr_avail
    best_avail_metrics = rf_metrics if rf_metrics["roc_auc"] >= lr_metrics["roc_auc"] else lr_metrics
    
    availability_bundle = {
        "availability_model": best_avail_pipe,
        "delay_model": rf_delay,
        "features": feature_cols,
        "version": "1.0.0-dev"
    }

    settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    model_artifact_path = settings.ARTIFACTS_DIR / "doctor_availability_model.joblib"
    joblib.dump(availability_bundle, model_artifact_path)
    print(f"✓ Saved doctor availability & delay bundle to: {model_artifact_path}")

    # 8. Model Registry Entry
    model_metadata = {
        "model_name": "doctor_availability_and_delay",
        "target_variable": "is_available, is_delayed",
        "model_family": best_avail_metrics["model_name"],
        "version": "1.0.0-dev",
        "status": "IMPLEMENTED_BUT_INSUFFICIENT_DATA",
        "training_date": datetime.utcnow().isoformat() + "Z",
        "dataset_type": dataset_type,
        "dataset_size": len(df),
        "date_range": "2026-09-01 to 2026-10-31",
        "features": feature_cols,
        "baseline_algorithm": "DummyClassifier(strategy='most_frequent')",
        "baseline_metrics": baseline_metrics,
        "model_metrics": {
            "availability": best_avail_metrics,
            "delay": delay_metrics
        },
        "artifact_path": str(model_artifact_path.relative_to(settings.BASE_DIR)),
        "insufficient_data_reason": "Database currently contains only 17 doctor attendance records (minimum statistical threshold: >= 100 verified logs per clinician).",
        "prospective_collection_plan": "QR check-in/check-out workflow will log each clinical shift. Model will retrain when sample size reaches N >= 500."
    }

    return model_metadata

if __name__ == "__main__":
    train_doctor_availability_pipeline(use_synthetic=True)

