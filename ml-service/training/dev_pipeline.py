"""
MediFlow AI 2.0 — Safe Development Data Pipeline Generator
Generates, validates, and stores reproducible development benchmark datasets
completely isolated from the PostgreSQL clinical production database.

CLINICAL & ETHICAL SAFETY NOTICE:
- All datasets produced by this pipeline carry explicit 'SYNTHETIC_DEVELOPMENT_PIPELINE' provenance.
- Datasets are stored in a dedicated local directory ('ml-service/data/development/') and NEVER
  pollute or overwrite production PostgreSQL records.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np

from training.data_loader import generate_dev_pipeline_dataset

DEV_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "development"

def validate_clinical_correlations(
    df_wt: pd.DataFrame,
    df_da: pd.DataFrame,
    df_dur: pd.DataFrame,
    df_dem: pd.DataFrame
) -> Dict[str, Any]:
    """
    Validates that synthetic development data faithfully mirrors realistic
    clinical and operational relationships before being approved for development benchmarks.
    """
    validations = {}

    # 1. Waiting Time: Queue length vs Actual Wait Time Correlation
    corr_queue = float(df_wt["queue_length_ahead"].corr(df_wt["actual_waiting_time_minutes"]))
    emergency_wait = float(df_wt[df_wt["priority_level"] == "EMERGENCY"]["actual_waiting_time_minutes"].mean())
    low_wait = float(df_wt[df_wt["priority_level"] == "LOW"]["actual_waiting_time_minutes"].mean())
    validations["waiting_time"] = {
        "queue_correlation": round(corr_queue, 3),
        "queue_correlation_valid": corr_queue > 0.70,
        "emergency_mean_wait": round(emergency_wait, 1),
        "low_priority_mean_wait": round(low_wait, 1),
        "priority_triage_valid": emergency_wait < low_wait,
    }

    # 2. Doctor Availability: Presence Rate & Monday Effect
    presence_rate = float(df_da["is_available"].mean())
    monday_avail = float(df_da[df_da["day_of_week"] == "MONDAY"]["is_available"].mean())
    other_avail = float(df_da[df_da["day_of_week"] != "MONDAY"]["is_available"].mean())
    validations["doctor_availability"] = {
        "overall_presence_rate": round(presence_rate, 3),
        "presence_rate_valid": 0.75 <= presence_rate <= 0.95,
        "monday_presence_rate": round(monday_avail, 3),
        "other_days_presence_rate": round(other_avail, 3),
        "delay_rate": round(float(df_da["is_delayed"].mean()), 3),
    }

    # 3. Appointment Duration: Specialty Complexity Differences
    mean_onco = float(df_dur[df_dur["department"] == "Oncology"]["actual_duration_minutes"].mean())
    mean_derm = float(df_dur[df_dur["department"] == "Dermatology"]["actual_duration_minutes"].mean())
    validations["appointment_duration"] = {
        "oncology_mean_duration": round(mean_onco, 1),
        "dermatology_mean_duration": round(mean_derm, 1),
        "specialty_variance_valid": mean_onco > mean_derm,
        "overall_mean_duration": round(float(df_dur["actual_duration_minutes"].mean()), 1),
    }

    # 4. Department Demand: Weekend Drop vs Weekday Volume
    weekend_vol = float(df_dem[df_dem["is_weekend"] == 1]["appointment_count"].mean())
    weekday_vol = float(df_dem[df_dem["is_weekend"] == 0]["appointment_count"].mean())
    validations["department_demand"] = {
        "weekend_mean_volume": round(weekend_vol, 1),
        "weekday_mean_volume": round(weekday_vol, 1),
        "weekend_drop_valid": weekend_vol < weekday_vol,
        "total_days_span": int(df_dem["date"].nunique()),
    }

    all_passed = (
        validations["waiting_time"]["queue_correlation_valid"] and
        validations["waiting_time"]["priority_triage_valid"] and
        validations["doctor_availability"]["presence_rate_valid"] and
        validations["appointment_duration"]["specialty_variance_valid"] and
        validations["department_demand"]["weekend_drop_valid"]
    )
    validations["all_clinical_checks_passed"] = all_passed
    return validations

def generate_and_save_dev_datasets(data_dir: Path = DEV_DATA_DIR, seed: int = 42) -> Dict[str, Any]:
    """
    Generates all 4 development pipeline datasets and writes them to the specified directory.
    Creates an explicit manifest file documenting provenance and verification metrics.
    """
    data_dir.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat() + "Z"

    # 1. Generate DataFrames
    df_wt = generate_dev_pipeline_dataset("waiting_time", n_samples=1000, seed=seed)
    df_da = generate_dev_pipeline_dataset("doctor_availability", n_samples=1000, seed=seed)
    df_dur = generate_dev_pipeline_dataset("appointment_duration", n_samples=1000, seed=seed)
    df_dem = generate_dev_pipeline_dataset("department_demand", seed=seed)

    # 2. Run Clinical Sanity & Correlation Validations
    validations = validate_clinical_correlations(df_wt, df_da, df_dur, df_dem)

    # 3. Export CSV files
    wt_path = data_dir / "dev_waiting_time.csv"
    da_path = data_dir / "dev_doctor_availability.csv"
    dur_path = data_dir / "dev_appointment_duration.csv"
    dem_path = data_dir / "dev_department_demand.csv"

    df_wt.to_csv(wt_path, index=False)
    df_da.to_csv(da_path, index=False)
    df_dur.to_csv(dur_path, index=False)
    df_dem.to_csv(dem_path, index=False)

    # 4. Construct Manifest
    manifest = {
        "pipeline_version": "2.0.0-dev",
        "pipeline_mode": "DEVELOPMENT_BENCHMARK",
        "data_provenance": "SYNTHETIC_DEVELOPMENT_PIPELINE",
        "is_synthetic": True,
        "is_production": False,
        "compliance_notice": (
            "NOTICE: Strictly isolated development & testing dataset. "
            "Must never be represented as real patient records or mixed into PostgreSQL production tables."
        ),
        "random_seed": seed,
        "generated_at": generated_at,
        "datasets": {
            "patient_waiting_time": {
                "file": "dev_waiting_time.csv",
                "sample_count": len(df_wt),
                "features": list(df_wt.columns),
                "target": "actual_waiting_time_minutes"
            },
            "doctor_availability_and_delay": {
                "file": "dev_doctor_availability.csv",
                "sample_count": len(df_da),
                "features": list(df_da.columns),
                "target": ["is_available", "is_delayed"]
            },
            "appointment_duration": {
                "file": "dev_appointment_duration.csv",
                "sample_count": len(df_dur),
                "features": list(df_dur.columns),
                "target": "actual_duration_minutes"
            },
            "department_demand_forecast": {
                "file": "dev_department_demand.csv",
                "sample_count": len(df_dem),
                "features": list(df_dem.columns),
                "target": "appointment_count"
            }
        },
        "total_development_records": len(df_wt) + len(df_da) + len(df_dur) + len(df_dem),
        "clinical_correlation_validations": validations
    }

    manifest_path = data_dir / "dataset_manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return {
        "success": True,
        "manifest_path": str(manifest_path),
        "datasets_generated": {
            "waiting_time": {"samples": len(df_wt), "path": str(wt_path)},
            "doctor_availability": {"samples": len(df_da), "path": str(da_path)},
            "appointment_duration": {"samples": len(df_dur), "path": str(dur_path)},
            "department_demand": {"samples": len(df_dem), "path": str(dem_path)},
        },
        "total_records": manifest["total_development_records"],
        "validations": validations,
    }

def get_dev_dataset_status(data_dir: Path = DEV_DATA_DIR) -> Dict[str, Any]:
    """
    Checks the status and availability of the local isolated development datasets.
    """
    manifest_path = data_dir / "dataset_manifest.json"
    if not manifest_path.exists():
        return {
            "status": "NOT_GENERATED",
            "is_available": False,
            "message": "Development datasets have not been generated yet.",
            "data_dir": str(data_dir),
            "manifest": None,
        }

    try:
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        return {
            "status": "ACTIVE_AND_VERIFIED",
            "is_available": True,
            "manifest_path": str(manifest_path),
            "generated_at": manifest.get("generated_at"),
            "total_development_records": manifest.get("total_development_records", 0),
            "manifest": manifest,
        }
    except Exception as e:
        return {
            "status": "CORRUPTED",
            "is_available": False,
            "error": str(e),
            "manifest": None,
        }

if __name__ == "__main__":
    result = generate_and_save_dev_datasets()
    print("Dev dataset generation result:")
    print(json.dumps(result, indent=2))
