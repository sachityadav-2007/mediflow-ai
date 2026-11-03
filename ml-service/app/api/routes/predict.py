"""
MediFlow AI 2.0 — Model Prediction Routes (FastAPI)
Exposes POST endpoints for all four ML pipelines, protected by internal token auth.
"""

from fastapi import APIRouter, Depends
from app.core.security import verify_internal_token
from app.services.predictor_service import predictor_service
from app.schemas.predictions import (
    WaitingTimeRequest, WaitingTimeResponse,
    DoctorAvailabilityRequest, DoctorAvailabilityResponse,
    AppointmentDurationRequest, AppointmentDurationResponse,
    DepartmentDemandRequest, DepartmentDemandResponse
)

router = APIRouter(prefix="/predict", tags=["Predictions"], dependencies=[Depends(verify_internal_token)])

@router.post("/waiting-time", response_model=WaitingTimeResponse)
async def predict_waiting_time(request: WaitingTimeRequest):
    """
    Model 1: Predict expected patient waiting time in minutes.
    """
    return predictor_service.predict_waiting_time(request)

@router.post("/doctor-availability", response_model=DoctorAvailabilityResponse)
async def predict_doctor_availability(request: DoctorAvailabilityRequest):
    """
    Model 2: Estimate doctor presence and delay probabilities.
    """
    return predictor_service.predict_doctor_availability(request)

@router.post("/appointment-duration", response_model=AppointmentDurationResponse)
async def predict_appointment_duration(request: AppointmentDurationRequest):
    """
    Model 3: Predict expected consultation duration in minutes.
    """
    return predictor_service.predict_appointment_duration(request)

@router.post("/department-demand", response_model=DepartmentDemandResponse)
async def predict_department_demand(request: DepartmentDemandRequest):
    """
    Model 4: Forecast daily appointment demand across 7-day future horizon.
    """
    return predictor_service.predict_department_demand(request)

