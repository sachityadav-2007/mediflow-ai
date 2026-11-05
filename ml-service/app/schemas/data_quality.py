"""
MediFlow AI 2.0 — Pydantic Schemas for Data Quality, Validation, and Retraining Governance
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DataQualityRequirement(BaseModel):
    model_name: str
    target_variable: str
    min_labelled_samples: int
    required_fields: List[str]
    description: str
    justification: str

class ModelDataQualityResult(BaseModel):
    model_name: str
    status: str = Field(..., description="'READY_FOR_TRAINING' | 'INSUFFICIENT_DATA' | 'DATA_QUALITY_ISSUES'")
    total_records: int
    valid_labelled_records: int
    missing_label_percentage: float
    invalid_timestamps_count: int
    duplicate_records: int
    date_range: Optional[str] = None
    outliers_detected: int = 0
    class_distribution: Optional[Dict[str, int]] = None
    issues: List[str] = []
    recommendations: List[str] = []

class DataQualityAuditRequest(BaseModel):
    appointments: Optional[List[Dict[str, Any]]] = None
    attendances: Optional[List[Dict[str, Any]]] = None
    doctors: Optional[List[Dict[str, Any]]] = None

class DataQualityAuditResponse(BaseModel):
    system_status: str = Field(..., description="'READY_FOR_TRAINING' | 'INSUFFICIENT_DATA' | 'DATA_QUALITY_ISSUES'")
    audit_timestamp: str
    models: Dict[str, ModelDataQualityResult]
    can_retrain_production: bool
    governance_notice: str

class RetrainRequest(BaseModel):
    model_name: Optional[str] = Field("all", description="'all' or specific model name")
    force_synthetic_benchmark: bool = Field(False, description="Allow benchmarking with synthetic dev pipeline if real data is insufficient")
    data_payload: Optional[DataQualityAuditRequest] = None

class RetrainResponse(BaseModel):
    success: bool
    model_name: str
    status: str
    message: str
    previous_version: Optional[str] = None
    new_version: Optional[str] = None
    data_source_used: str
    evaluation_summary: Optional[Dict[str, Any]] = None

