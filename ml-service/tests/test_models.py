"""
Test Machine Learning Predictor Service and Inference
"""

from app.services.predictor_service import predictor_service
from app.schemas.predictions import (
    WaitingTimeRequest, DoctorAvailabilityRequest,
    AppointmentDurationRequest, DepartmentDemandRequest
)

def test_waiting_time_inference():
    req = WaitingTimeRequest(
        doctor_id="test-doc-01",
        department="Cardiology",
        day_of_week="MONDAY",
        hour_of_day=11,
        queue_length_ahead=4,
        priority_level="HIGH"
    )
    res = predictor_service.predict_waiting_time(req)
    assert res.status in ["IMPLEMENTED_BUT_INSUFFICIENT_DATA", "available"]
    assert res.predicted_wait_minutes is not None
    assert res.predicted_wait_minutes >= 2.0
    assert len(res.explanation) > 0

def test_doctor_availability_inference():
    req = DoctorAvailabilityRequest(
        doctor_id="test-doc-02",
        date="2026-11-09",
        start_time="10:00",
        department="Pediatrics"
    )
    res = predictor_service.predict_doctor_availability(req)
    assert res.status in ["IMPLEMENTED_BUT_INSUFFICIENT_DATA", "available"]
    assert 0.0 <= res.availability_probability <= 1.0
    assert 0.0 <= res.delay_probability <= 1.0

def test_duration_inference():
    req = AppointmentDurationRequest(
        doctor_id="test-doc-03",
        department="Oncology",
        day_of_week="WEDNESDAY",
        hour_of_day=14,
        priority_level="EMERGENCY"
    )
    res = predictor_service.predict_appointment_duration(req)
    assert res.status in ["IMPLEMENTED_BUT_INSUFFICIENT_DATA", "available"]
    assert res.predicted_duration_minutes is not None
    assert res.predicted_duration_minutes >= 5.0

def test_department_demand_inference():
    req = DepartmentDemandRequest(
        department="Cardiology",
        horizon_days=7
    )
    res = predictor_service.predict_department_demand(req)
    assert len(res.forecast) == 7
    assert res.forecast[0].predicted_appointment_count > 0

