"""
MediFlow AI 2.0 — Master Orchestration Script for Training All ML Pipelines
Generates model artifacts, benchmarks baselines, and compiles model_registry.json.
"""

import json
from pathlib import Path
from app.core.config import settings

from training.train_waiting_time import train_waiting_time_pipeline
from training.train_doctor_availability import train_doctor_availability_pipeline
from training.train_appointment_duration import train_appointment_duration_pipeline
from training.train_department_demand import train_department_demand_pipeline

def train_and_register_all():
    print("=======================================================================")
    print("  MediFlow AI 2.0 — Master Training & Model Governance Suite           ")
    print("=======================================================================\n")

    registry = {
        "system_version": "2.0.0",
        "description": "MediFlow AI 2.0 Production & Development Model Registry",
        "models": {},
        "governance_notes": [
            "All model pipelines are evaluated against explicit empirical baselines using chronological splits.",
            "Development pipeline verification uses clearly marked SYNTHETIC_DEVELOPMENT_PIPELINE datasets.",
            "Production status for waiting time, duration, availability, and multi-step demand is set to IMPLEMENTED_BUT_INSUFFICIENT_DATA due to lack of historical check-in/completion timestamps in the initial database.",
            "Predictions in clinical production are strictly advisory and never override clinician absence or booking conflict validations."
        ]
    }

    # 1. Waiting Time
    m1 = train_waiting_time_pipeline(use_synthetic=True)
    registry["models"]["patient_waiting_time"] = m1

    # 2. Doctor Availability
    m2 = train_doctor_availability_pipeline(use_synthetic=True)
    registry["models"]["doctor_availability_and_delay"] = m2

    # 3. Consultation Duration
    m3 = train_appointment_duration_pipeline(use_synthetic=True)
    registry["models"]["appointment_duration"] = m3

    # 4. Department Demand
    m4 = train_department_demand_pipeline(use_synthetic=True)
    registry["models"]["department_demand_forecast"] = m4

    # Save Registry
    settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(settings.REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)

    print(f"\n✓ Master Model Registry exported to: {settings.REGISTRY_PATH}")
    print("=======================================================================")
    print("  All 4 Machine Learning Pipelines Successfully Trained & Registered   ")
    print("=======================================================================")

if __name__ == "__main__":
    train_and_register_all()

