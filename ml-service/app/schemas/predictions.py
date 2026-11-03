"""
MediFlow AI 2.0 — Pydantic Schemas for Model Requests and Predictions
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# -----------------------------------------------------------------------------
# 1. Patient Waiting Time
# -----------------------------------------------------------------------------
class WaitingTimeRequest(BaseModel):
    doctor_id: str = Field(..., description="Unique Doctor ID")
    department: Optional[str] = Field("General Medicine", description="Clinical Department")
    day_of_week: Optional[str] = Field("MONDAY", description="Day of Week (MONDAY..SUNDAY)")
    hour_of_day: Optional[int] = Field(10, ge=0, le=23, description="Hour of appointment (0..23)")
    queue_length_ahead: Optional[int] = Field(0, ge=0, description="Active patients waiting ahead")
    priority_level: Optional[str] = Field("MEDIUM", description="Triage priority: EMERGENCY, HIGH, MEDIUM, LOW")
    doctor_attendance_status: Optional[str] = Field("AVAILABLE", description="Current doctor presence state")

class ModelEvaluationMetrics(BaseModel):
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2: Optional[float] = None

class WaitingTimeResponse(BaseModel):
    predicted_wait_minutes: Optional[float] = None
    model_version: Optional[str] = None
    status: str = Field(..., description="'available' | 'insufficient_data' | 'baseline_heuristic' | 'error'")
    explanation: List[str] = []
    evaluation: Optional[ModelEvaluationMetrics] = None
    source: str = "ml-service"

# -----------------------------------------------------------------------------
# 2. Doctor Availability & Delay
# -----------------------------------------------------------------------------
class DoctorAvailabilityRequest(BaseModel):
    doctor_id: str = Field(..., description="Unique Doctor ID")
    date: str = Field(..., description="Date (YYYY-MM-DD)")
    start_time: str = Field(..., description="Scheduled slot start time (HH:MM)")
    day_of_week: Optional[str] = Field(None, description="Day of Week")
    department: Optional[str] = Field(None, description="Clinical Department")

class DoctorAvailabilityResponse(BaseModel):
    availability_probability: Optional[float] = None
    delay_probability: Optional[float] = None
    status: str = Field(..., description="'available' | 'insufficient_data' | 'baseline_heuristic' | 'error'")
    model_version: Optional[str] = None
    explanation: List[str] = []
    source: str = "ml-service"

# -----------------------------------------------------------------------------
# 3. Consultation Duration
# -----------------------------------------------------------------------------
class AppointmentDurationRequest(BaseModel):
    doctor_id: str = Field(..., description="Unique Doctor ID")
    department: str = Field(..., description="Clinical Department")
    day_of_week: Optional[str] = Field("MONDAY", description="Day of week")
    hour_of_day: Optional[int] = Field(10, ge=0, le=23, description="Hour of appointment")
    priority_level: Optional[str] = Field("MEDIUM", description="Clinical triage level")

class AppointmentDurationResponse(BaseModel):
    predicted_duration_minutes: Optional[float] = None
    model_version: Optional[str] = None
    status: str = Field(..., description="'available' | 'insufficient_data' | 'baseline_heuristic' | 'error'")
    explanation: List[str] = []
    source: str = "ml-service"

# -----------------------------------------------------------------------------
# 4. Department Demand Forecasting
# -----------------------------------------------------------------------------
class DepartmentDemandRequest(BaseModel):
    department: str = Field(..., description="Clinical Department name")
    horizon_days: int = Field(7, ge=1, le=30, description="Forecast horizon in days")

class DailyDemandPoint(BaseModel):
    date: str
    day_of_week: str
    predicted_appointment_count: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None

class DepartmentDemandResponse(BaseModel):
    department: str
    forecast: List[DailyDemandPoint] = []
    model_version: Optional[str] = None
    status: str = Field(..., description="'available' | 'insufficient_data' | 'baseline_heuristic' | 'error'")
    evaluation_status: str
    source: str = "ml-service"

