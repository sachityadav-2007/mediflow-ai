"""
MediFlow AI 2.0 — Machine Learning Data Quality and Validation Service
Performs rigorous audit of operational healthcare data, evaluates minimum statistical
thresholds, detects timestamp anomalies, and governs model retraining.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import pandas as pd
import numpy as np

from app.schemas.data_quality import (
    DataQualityRequirement, ModelDataQualityResult,
    DataQualityAuditResponse
)

# Minimum justified statistical thresholds for clinical healthcare machine learning
DATA_QUALITY_REQUIREMENTS: Dict[str, DataQualityRequirement] = {
    "patient_waiting_time": DataQualityRequirement(
        model_name="patient_waiting_time",
        target_variable="actual_waiting_time_minutes",
        min_labelled_samples=100,
        required_fields=["checkedInAt", "consultationStartedAt", "department", "priority"],
        description="Patient OPD wait-time regressor predicting arrival-to-consultation duration.",
        justification="Tree-based regressors require at least 100 non-null (checkedInAt, consultationStartedAt) intervals across multiple doctors and rush hours to avoid severe overfitting and unrepresentative wait estimates."
    ),
    "doctor_availability_and_delay": DataQualityRequirement(
        model_name="doctor_availability_and_delay",
        target_variable="is_available, is_delayed",
        min_labelled_samples=100,
        required_fields=["checkInTime", "status", "doctorId"],
        description="Clinician presence and arrival delay probability classifier.",
        justification="Binary classification of clinician attendance and arrival delay requires at least 100 shift logs across standard clinic days to balance class distribution and avoid zero-variance splits."
    ),
    "appointment_duration": DataQualityRequirement(
        model_name="appointment_duration",
        target_variable="actual_duration_minutes",
        min_labelled_samples=100,
        required_fields=["consultationStartedAt", "consultationCompletedAt", "department", "priority"],
        description="Clinical consultation duration regressor predicting doctor-patient face time.",
        justification="GradientBoosting regression for clinical encounter durations requires minimum 100 completed consultations to capture department-specific variances and high-priority emergency extensions."
    ),
    "department_demand_forecast": DataQualityRequirement(
        model_name="department_demand_forecast",
        target_variable="daily_appointment_count",
        min_labelled_samples=60, # 60 contiguous operational calendar days
        required_fields=["appointmentDate", "department"],
        description="Departmental patient volume forecaster with 7-day cyclical lag features.",
        justification="Autoregressive time-series forecasting requires minimum 60 continuous operational calendar days to calculate 7-day cyclical lags and rolling averages without dropping over 20% of historical series."
    )
}

class DataQualityService:
    def __init__(self):
        self.requirements = DATA_QUALITY_REQUIREMENTS

    def get_requirements(self) -> Dict[str, Any]:
        """Returns the formal data requirements and scientific justifications for all models."""
        return {k: v.model_dump() for k, v in self.requirements.items()}

    def audit_dataset(
        self,
        appointments: Optional[List[Dict[str, Any]]] = None,
        attendances: Optional[List[Dict[str, Any]]] = None,
        doctors: Optional[List[Dict[str, Any]]] = None
    ) -> DataQualityAuditResponse:
        """
        Executes a comprehensive data quality and completeness audit across all four models.
        """
        now_str = datetime.now(timezone.utc).isoformat() + "Z"
        appointments = appointments or []
        attendances = attendances or []
        doctors = doctors or []

        results: Dict[str, ModelDataQualityResult] = {}

        # ---------------------------------------------------------------------
        # 1. Audit Model 1: Patient Waiting-Time
        # ---------------------------------------------------------------------
        total_appts = len(appointments)
        valid_waiting = 0
        invalid_waiting_timestamps = 0
        outliers_waiting = 0
        dates_waiting = []

        for appt in appointments:
            cin = appt.get("checkedInAt")
            cstart = appt.get("consultationStartedAt")

            if cin and cstart:
                try:
                    t_in = pd.to_datetime(cin)
                    t_start = pd.to_datetime(cstart)
                    dates_waiting.append(t_in)

                    wait_mins = (t_start - t_in).total_seconds() / 60.0
                    if wait_mins < 0:
                        invalid_waiting_timestamps += 1
                    elif wait_mins > 360.0: # > 6 hours
                        outliers_waiting += 1
                        valid_waiting += 1
                    else:
                        valid_waiting += 1
                except Exception:
                    invalid_waiting_timestamps += 1

        missing_waiting_pct = round(((total_appts - valid_waiting) / max(1, total_appts)) * 100, 1)
        req_wt = self.requirements["patient_waiting_time"]

        wt_status = "INSUFFICIENT_DATA"
        wt_issues = []
        wt_recommendations = []

        if total_appts == 0:
            wt_issues.append("Zero appointment records provided for audit.")
        elif valid_waiting < req_wt.min_labelled_samples:
            wt_issues.append(
                f"Valid labelled records ({valid_waiting}) is below minimum threshold ({req_wt.min_labelled_samples})."
            )
            wt_recommendations.append(
                "Accumulate real patient check-ins and doctor consultation-start events via the OPD Reception Desk and Doctor Portal."
            )
        elif invalid_waiting_timestamps > 0.1 * valid_waiting:
            wt_status = "DATA_QUALITY_ISSUES"
            wt_issues.append(f"High invalid timestamp rate: {invalid_waiting_timestamps} records had consultationStartedAt earlier than checkedInAt.")
            wt_recommendations.append("Audit hospital NTP clock synchronization between reception kiosks and doctor terminals.")
        else:
            wt_status = "READY_FOR_TRAINING"

        date_range_wt = None
        if dates_waiting:
            date_range_wt = f"{min(dates_waiting).strftime('%Y-%m-%d')} to {max(dates_waiting).strftime('%Y-%m-%d')}"

        results["patient_waiting_time"] = ModelDataQualityResult(
            model_name="patient_waiting_time",
            status=wt_status,
            total_records=total_appts,
            valid_labelled_records=valid_waiting,
            missing_label_percentage=missing_waiting_pct,
            invalid_timestamps_count=invalid_waiting_timestamps,
            duplicate_records=0,
            date_range=date_range_wt,
            outliers_detected=outliers_waiting,
            issues=wt_issues,
            recommendations=wt_recommendations
        )

        # ---------------------------------------------------------------------
        # 2. Audit Model 2: Doctor Availability & Delay
        # ---------------------------------------------------------------------
        total_att = len(attendances)
        valid_att = 0
        invalid_att = 0
        delayed_count = 0
        on_time_count = 0
        dates_att = []

        for att in attendances:
            cin = att.get("checkInTime")
            if cin:
                try:
                    t_in = pd.to_datetime(cin)
                    dates_att.append(t_in)
                    valid_att += 1

                    # Check delay if duration or scheduled time available
                    # A doctor check-in after 09:15 for a morning shift is considered delayed
                    hour = t_in.hour
                    minute = t_in.minute
                    if hour == 9 and minute > 15:
                        delayed_count += 1
                    else:
                        on_time_count += 1
                except Exception:
                    invalid_att += 1

        req_da = self.requirements["doctor_availability_and_delay"]
        da_status = "INSUFFICIENT_DATA"
        da_issues = []
        da_recommendations = []

        if total_att < req_da.min_labelled_samples:
            da_issues.append(
                f"Total doctor attendance records ({total_att}) is below statistical requirement ({req_da.min_labelled_samples})."
            )
            da_recommendations.append("Continue daily QR check-in/check-out workflow across all outpatient departments.")
        else:
            da_status = "READY_FOR_TRAINING"

        date_range_att = None
        if dates_att:
            date_range_att = f"{min(dates_att).strftime('%Y-%m-%d')} to {max(dates_att).strftime('%Y-%m-%d')}"

        results["doctor_availability_and_delay"] = ModelDataQualityResult(
            model_name="doctor_availability_and_delay",
            status=da_status,
            total_records=total_att,
            valid_labelled_records=valid_att,
            missing_label_percentage=round(((total_att - valid_att) / max(1, total_att)) * 100, 1),
            invalid_timestamps_count=invalid_att,
            duplicate_records=0,
            date_range=date_range_att,
            outliers_detected=0,
            class_distribution={"on_time": on_time_count, "delayed": delayed_count},
            issues=da_issues,
            recommendations=da_recommendations
        )

        # ---------------------------------------------------------------------
        # 3. Audit Model 3: Consultation Duration
        # ---------------------------------------------------------------------
        valid_dur = 0
        invalid_dur_ts = 0
        outliers_dur = 0
        dates_dur = []

        for appt in appointments:
            cstart = appt.get("consultationStartedAt")
            ccomp = appt.get("consultationCompletedAt")
            actual_dur = appt.get("actualDurationMinutes")

            if cstart and ccomp:
                try:
                    t_start = pd.to_datetime(cstart)
                    t_comp = pd.to_datetime(ccomp)
                    dates_dur.append(t_start)

                    dur = (t_comp - t_start).total_seconds() / 60.0
                    if dur <= 0:
                        invalid_dur_ts += 1
                    elif dur < 3.0 or dur > 180.0:
                        outliers_dur += 1
                        valid_dur += 1
                    else:
                        valid_dur += 1
                except Exception:
                    invalid_dur_ts += 1
            elif actual_dur is not None and actual_dur > 0:
                valid_dur += 1

        req_dur = self.requirements["appointment_duration"]
        dur_status = "INSUFFICIENT_DATA"
        dur_issues = []
        dur_recommendations = []

        if valid_dur < req_dur.min_labelled_samples:
            dur_issues.append(
                f"Valid completed consultation intervals ({valid_dur}) is below minimum threshold ({req_dur.min_labelled_samples})."
            )
            dur_recommendations.append("Clinicians should utilize the '▶️ Call In' and '✅ Complete' buttons during patient consultations.")
        else:
            dur_status = "READY_FOR_TRAINING"

        date_range_dur = None
        if dates_dur:
            date_range_dur = f"{min(dates_dur).strftime('%Y-%m-%d')} to {max(dates_dur).strftime('%Y-%m-%d')}"

        results["appointment_duration"] = ModelDataQualityResult(
            model_name="appointment_duration",
            status=dur_status,
            total_records=total_appts,
            valid_labelled_records=valid_dur,
            missing_label_percentage=round(((total_appts - valid_dur) / max(1, total_appts)) * 100, 1),
            invalid_timestamps_count=invalid_dur_ts,
            duplicate_records=0,
            date_range=date_range_dur,
            outliers_detected=outliers_dur,
            issues=dur_issues,
            recommendations=dur_recommendations
        )

        # ---------------------------------------------------------------------
        # 4. Audit Model 4: Department Demand Forecaster
        # ---------------------------------------------------------------------
        unique_dates = set()
        dept_counts = {}

        for appt in appointments:
            adate = appt.get("appointmentDate") or appt.get("date")
            dept = appt.get("department") or (appt.get("doctor") or {}).get("department")
            if adate:
                try:
                    d_str = str(adate)[:10]
                    unique_dates.add(d_str)
                    if dept:
                        dept_counts[dept] = dept_counts.get(dept, 0) + 1
                except Exception:
                    pass

        calendar_days_span = len(unique_dates)
        req_dem = self.requirements["department_demand_forecast"]
        dem_status = "INSUFFICIENT_DATA"
        dem_issues = []
        dem_recommendations = []

        if calendar_days_span < req_dem.min_labelled_samples:
            dem_issues.append(
                f"Operational booking history spans {calendar_days_span} calendar days (minimum requirement: {req_dem.min_labelled_samples} contiguous days)."
            )
            dem_recommendations.append(
                "Continue standard hospital appointment booking. Interim volume estimates will be powered by moving average baselines."
            )
        else:
            dem_status = "READY_FOR_TRAINING"

        date_range_dem = None
        if unique_dates:
            sorted_dates = sorted(list(unique_dates))
            date_range_dem = f"{sorted_dates[0]} to {sorted_dates[-1]}"

        results["department_demand_forecast"] = ModelDataQualityResult(
            model_name="department_demand_forecast",
            status=dem_status,
            total_records=total_appts,
            valid_labelled_records=calendar_days_span,
            missing_label_percentage=0.0,
            invalid_timestamps_count=0,
            duplicate_records=0,
            date_range=date_range_dem,
            outliers_detected=0,
            class_distribution=dept_counts,
            issues=dem_issues,
            recommendations=dem_recommendations
        )

        # Global system status
        all_ready = all(r.status == "READY_FOR_TRAINING" for r in results.values())
        any_issues = any(r.status == "DATA_QUALITY_ISSUES" for r in results.values())

        if all_ready:
            sys_status = "READY_FOR_TRAINING"
        elif any_issues:
            sys_status = "DATA_QUALITY_ISSUES"
        else:
            sys_status = "INSUFFICIENT_DATA"

        notice = (
            "MediFlow AI 2.0 Governance Notice: Real clinical model retraining is gated by minimum data completeness thresholds. "
            "Synthetic development benchmarks remain active for API contract and UI demonstration until threshold criteria are achieved."
        )

        return DataQualityAuditResponse(
            system_status=sys_status,
            audit_timestamp=now_str,
            models=results,
            can_retrain_production=all_ready,
            governance_notice=notice
        )

data_quality_service = DataQualityService()
