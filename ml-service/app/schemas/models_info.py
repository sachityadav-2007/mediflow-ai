"""
MediFlow AI 2.0 — Pydantic Schemas for Model Registry & Governance
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ModelMetadata(BaseModel):
    model_name: str
    target_variable: str
    model_family: str
    version: str
    status: str = Field(..., description="'IMPLEMENTED_AND_TRAINED' | 'IMPLEMENTED_BUT_INSUFFICIENT_DATA'")
    training_date: Optional[str] = None
    dataset_type: str = Field(..., description="'PRODUCTION_HISTORICAL' | 'SYNTHETIC_DEVELOPMENT_PIPELINE' | 'NONE'")
    dataset_size: int = 0
    date_range: Optional[str] = None
    features: List[str] = []
    baseline_algorithm: str
    baseline_metrics: Dict[str, Any] = {}
    model_metrics: Dict[str, Any] = {}
    artifact_path: Optional[str] = None
    insufficient_data_reason: Optional[str] = None
    prospective_collection_plan: Optional[str] = None

class ModelRegistryResponse(BaseModel):
    system_version: str = "2.0.0"
    total_models: int = 4
    models: Dict[str, ModelMetadata]
    governance_notes: List[str]

