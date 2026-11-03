"""
MediFlow AI 2.0 — Data Loading, Chronological Splitting, and Feature Engineering
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any
from pathlib import Path
from app.core.config import settings

def chronological_split(df: pd.DataFrame, time_col: str, train_ratio: float = 0.70, val_ratio: float = 0.15) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Performs strict chronological splitting on time-series/time-dependent records.
    Guarantees zero future-to-past data leakage.
    """
    df_sorted = df.sort_values(by=time_col).reset_index(drop=True)
    n = len(df_sorted)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))
    
    train_df = df_sorted.iloc[:train_end].copy()
    val_df = df_sorted.iloc[train_end:val_end].copy()
    test_df = df_sorted.iloc[val_end:].copy()
    
    return train_df, val_df, test_df

def generate_dev_pipeline_dataset(dataset_type: str, n_samples: int = 1000, seed: int = 42) -> pd.DataFrame:
    """
    Generates clearly designated development pipeline datasets to test and verify
    feature engineering, model training algorithms, baseline comparisons, and serialization.
    
    CRITICAL COMPLIANCE NOTICE:
    This dataset is strictly labeled 'SYNTHETIC_DEVELOPMENT_PIPELINE'.
    It is never represented as genuine production hospital data.
    """
    np.random.seed(seed)
    base_date = pd.Timestamp("2026-09-01")
    
    departments = [
        "Cardiology", "Pediatrics", "Orthopedics", "Dermatology", 
        "Neurology", "General Medicine", "Oncology", "Nephrology", "Urology"
    ]
    doctors = [f"DOC-{dept[:3].upper()}-{i+1:02d}" for i, dept in enumerate(departments)]
    priorities = ["EMERGENCY", "HIGH", "MEDIUM", "LOW"]
    priority_weights = [0.10, 0.20, 0.50, 0.20]
    
    if dataset_type == "waiting_time":
        records = []
        for i in range(n_samples):
            day_offset = int(i / (n_samples / 60))
            appt_time = base_date + pd.Timedelta(days=day_offset, hours=9 + (i % 8), minutes=(i % 4) * 15)
            dept = np.random.choice(departments)
            doc = doctors[departments.index(dept)]
            prio = np.random.choice(priorities, p=priority_weights)
            queue_len = np.random.poisson(lam=3.5)
            
            # Ground-truth simulation: wait time = queue * avg_duration + delay_jitter - priority_discount
            prio_discount = {"EMERGENCY": 12.0, "HIGH": 6.0, "MEDIUM": 0.0, "LOW": -5.0}[prio]
            noise = np.random.normal(0, 4.0)
            wait_time = max(2.0, (queue_len * 12.0) - prio_discount + noise + (5.0 if appt_time.hour >= 14 else 0.0))
            
            records.append({
                "appointment_id": f"DEV-APT-{i+1:05d}",
                "timestamp": appt_time,
                "doctor_id": doc,
                "department": dept,
                "day_of_week": appt_time.day_name().upper(),
                "hour_of_day": appt_time.hour,
                "queue_length_ahead": queue_len,
                "priority_level": prio,
                "actual_waiting_time_minutes": round(wait_time, 2),
                "dataset_provenance": "SYNTHETIC_DEVELOPMENT_PIPELINE"
            })
        return pd.DataFrame(records)
        
    elif dataset_type == "doctor_availability":
        records = []
        for i in range(n_samples):
            day_offset = int(i / (n_samples / 60))
            date_time = base_date + pd.Timedelta(days=day_offset, hours=9 + (i % 8))
            dept = np.random.choice(departments)
            doc = doctors[departments.index(dept)]
            
            # Doctor reliability features
            is_monday = 1 if date_time.day_name() == "Monday" else 0
            is_early_morning = 1 if date_time.hour == 9 else 0
            
            # Probability of presence (base 88%, lower on Mondays/mornings)
            prob_present = 0.88 - (0.10 * is_monday) - (0.05 * is_early_morning)
            is_present = int(np.random.random() < prob_present)
            
            # Probability of arrival delay (>15 min)
            prob_delay = 0.18 + (0.15 * is_monday) + (0.10 * is_early_morning) if is_present else 0.0
            is_delayed = int(np.random.random() < prob_delay)
            
            records.append({
                "record_id": f"DEV-AVAIL-{i+1:05d}",
                "timestamp": date_time,
                "doctor_id": doc,
                "department": dept,
                "day_of_week": date_time.day_name().upper(),
                "hour_of_day": date_time.hour,
                "is_available": is_present,
                "is_delayed": is_delayed,
                "dataset_provenance": "SYNTHETIC_DEVELOPMENT_PIPELINE"
            })
        return pd.DataFrame(records)

    elif dataset_type == "appointment_duration":
        records = []
        base_durations = {
            "Cardiology": 22.0, "Pediatrics": 18.0, "Orthopedics": 20.0, "Dermatology": 12.0,
            "Neurology": 25.0, "General Medicine": 15.0, "Oncology": 28.0, "Nephrology": 20.0, "Urology": 18.0
        }
        for i in range(n_samples):
            day_offset = int(i / (n_samples / 60))
            appt_time = base_date + pd.Timedelta(days=day_offset, hours=9 + (i % 8))
            dept = np.random.choice(departments)
            doc = doctors[departments.index(dept)]
            prio = np.random.choice(priorities, p=priority_weights)
            
            base = base_durations[dept]
            prio_factor = 1.3 if prio in ["EMERGENCY", "HIGH"] else 1.0
            duration = max(5.0, np.random.lognormal(mean=np.log(base * prio_factor), sigma=0.25))
            
            records.append({
                "appointment_id": f"DEV-DUR-{i+1:05d}",
                "timestamp": appt_time,
                "doctor_id": doc,
                "department": dept,
                "day_of_week": appt_time.day_name().upper(),
                "hour_of_day": appt_time.hour,
                "priority_level": prio,
                "actual_duration_minutes": round(duration, 2),
                "dataset_provenance": "SYNTHETIC_DEVELOPMENT_PIPELINE"
            })
        return pd.DataFrame(records)

    elif dataset_type == "department_demand":
        # Daily appointment counts per department over 120 days
        records = []
        for d_idx in range(120):
            cur_date = base_date + pd.Timedelta(days=d_idx)
            is_weekend = 1 if cur_date.dayofweek in [5, 6] else 0
            
            for dept in departments:
                base_demand = {"General Medicine": 35, "Pediatrics": 25, "Cardiology": 20}.get(dept, 15)
                # Seasonality + weekend drop + random noise
                day_factor = 0.35 if is_weekend else (1.2 if cur_date.dayofweek == 0 else 1.0)
                mean_count = base_demand * day_factor
                actual_count = int(np.random.poisson(lam=mean_count))
                
                records.append({
                    "date": cur_date.strftime("%Y-%m-%d"),
                    "timestamp": cur_date,
                    "department": dept,
                    "day_of_week": cur_date.day_name().upper(),
                    "day_of_month": cur_date.day,
                    "month": cur_date.month,
                    "is_weekend": is_weekend,
                    "appointment_count": actual_count,
                    "dataset_provenance": "SYNTHETIC_DEVELOPMENT_PIPELINE"
                })
        return pd.DataFrame(records)
    
    raise ValueError(f"Unknown dataset_type: {dataset_type}")

