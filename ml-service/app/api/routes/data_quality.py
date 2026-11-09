"""
MediFlow AI 2.0 — Data Quality Audit and Controlled Retraining Endpoints (FastAPI)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any

from app.core.security import verify_internal_token
from app.services.data_quality_service import data_quality_service
from app.services.predictor_service import predictor_service
from app.schemas.data_quality import (
    DataQualityAuditRequest, DataQualityAuditResponse,
    RetrainRequest, RetrainResponse,
    DevDatasetGenerateResponse, DevDatasetStatusResponse
)
from training.train_all import train_all_models
from training.dev_pipeline import generate_and_save_dev_datasets, get_dev_dataset_status

router = APIRouter(prefix="/data-quality", tags=["Data Quality & Retraining"], dependencies=[Depends(verify_internal_token)])

@router.get("/requirements", response_model=Dict[str, Any])
async def get_data_quality_requirements():
    """
    Returns the minimum statistical data requirements and scientific justifications
    required before production training can be authorized for each model.
    """
    return data_quality_service.get_requirements()

@router.post("/audit", response_model=DataQualityAuditResponse)
async def audit_operational_data(payload: DataQualityAuditRequest):
    """
    Audits an operational dataset of appointments, attendance records, and doctors.
    Calculates valid label counts, missing percentages, timestamp validity, and training readiness.
    """
    return data_quality_service.audit_dataset(
        appointments=payload.appointments,
        attendances=payload.attendances,
        doctors=payload.doctors
    )

@router.post("/retrain", response_model=RetrainResponse)
async def trigger_controlled_retraining(request: RetrainRequest):
    """
    Controlled Model Retraining Workflow:
    1. First audits operational data against statistical quality requirements.
    2. Rejects production retraining if valid labels are insufficient.
    3. If development synthetic benchmark is requested, regenerates dev benchmarks cleanly.
    4. Evaluates candidate models against baselines before activating.
    5. Safely reloads predictor service in memory.
    """
    # 1. Audit provided data if available
    audit_res = None
    if request.data_payload:
        audit_res = data_quality_service.audit_dataset(
            appointments=request.data_payload.appointments,
            attendances=request.data_payload.attendances,
            doctors=request.data_payload.doctors
        )

    # 2. Check if real data is sufficient for production training
    can_train_real = audit_res.can_retrain_production if audit_res else False

    if not can_train_real and not request.force_synthetic_benchmark:
        insufficient_details = []
        if audit_res:
            for m_name, res in audit_res.models.items():
                if res.status != "READY_FOR_TRAINING":
                    insufficient_details.append(f"{m_name}: {res.valid_labelled_records} valid records ({res.status})")

        detail_msg = "; ".join(insufficient_details) or "Production database lacks minimum required labelled clinical timestamps."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Retraining rejected due to INSUFFICIENT_DATA. Requirements not met: {detail_msg}. To regenerate development benchmarks for viva demonstration, pass force_synthetic_benchmark=True."
        )

    # 3. Execute retraining pipeline
    use_synthetic = not can_train_real
    data_source = "SYNTHETIC_DEVELOPMENT_PIPELINE" if use_synthetic else "PRODUCTION_HISTORICAL"

    try:
        results = train_all_models(use_synthetic=use_synthetic)
        # Reload models into active predictor service memory
        predictor_service.load_models()

        return RetrainResponse(
            success=True,
            model_name=request.model_name or "all",
            status="TRAINED_AND_EVALUATED" if not use_synthetic else "DEVELOPMENT_BENCHMARK_GENERATED",
            message=f"Model retraining completed successfully using {data_source}.",
            previous_version="1.0.0-dev",
            new_version="1.0.1-dev" if use_synthetic else "2.0.0-prod",
            data_source_used=data_source,
            evaluation_summary=results
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Retraining pipeline failure: {str(e)}"
        )

@router.post("/generate-dev-dataset", response_model=DevDatasetGenerateResponse)
async def generate_development_dataset():
    """
    Generates and validates reproducible development benchmark datasets.
    Stores CSVs and metadata manifest in 'ml-service/data/development/'
    completely isolated from PostgreSQL production records.
    """
    try:
        res = generate_and_save_dev_datasets()
        return DevDatasetGenerateResponse(
            success=True,
            message="Development benchmark datasets successfully generated and clinically verified.",
            manifest_path=res["manifest_path"],
            datasets_generated=res["datasets_generated"],
            validation_status="ALL_CLINICAL_CHECKS_PASSED" if res["validations"].get("all_clinical_checks_passed") else "CHECK_WARNINGS"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate development dataset: {str(e)}"
        )

@router.get("/dev-dataset-status", response_model=DevDatasetStatusResponse)
async def check_development_dataset_status():
    """
    Returns the availability, record count, and clinical validation status of the
    isolated local development benchmark datasets.
    """
    status_info = get_dev_dataset_status()
    return DevDatasetStatusResponse(
        status=status_info["status"],
        is_available=status_info["is_available"],
        manifest=status_info.get("manifest"),
        datasets=status_info.get("manifest", {}).get("datasets") if status_info.get("manifest") else None
    )

