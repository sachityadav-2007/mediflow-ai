# MediFlow AI 2.0 — Machine Learning Data Requirements & Validation Standards
**Document ID:** `docs/ML_DATA_REQUIREMENTS.md`  
**Version:** 2.0.0  
**Scope:** Clinical Data Pipeline, Label Generation, and Gating Thresholds  
**Status:** Approved & Enforced  

---

## 1. Overview & Data Ethics

In hospital operational intelligence, predictive models influence human healthcare schedules. Training machine learning models on incomplete, assumed, or synthetic data while claiming production accuracy violates healthcare safety standards. 

MediFlow AI 2.0 enforces **strict data collection gating**:
- A model will **never** be trained on production data until the database satisfies documented statistical thresholds.
- The system automatically audits operational records and labels data status as `READY_FOR_TRAINING`, `INSUFFICIENT_DATA`, or `DATA_QUALITY_ISSUES`.

---

## 2. Model Minimum Data Requirements

| Model Pipeline | Target Variable | Minimum Threshold | Required Fields | Scientific Justification |
| :--- | :--- | :--- | :--- | :--- |
| **1. Patient Waiting-Time** | `actual_waiting_time_minutes` | $\ge 100$ valid pairs | `checkedInAt`, `consultationStartedAt`, `department`, `priority` | High-variance tree regressors require at least 100 non-null arrival-to-consultation intervals across multiple doctors, shift hours, and triage tiers to avoid severe bias toward single-clinic bottlenecks. |
| **2. Doctor Availability & Delay** | `is_available`, `is_delayed` | $\ge 100$ shift logs | `checkInTime`, `status`, `doctorId` | Binary classification of clinician attendance and arrival delay requires at least 100 shift records across weekdays and times to balance class distribution ($F_1$ scoring) and avoid zero-variance splits. |
| **3. Consultation Duration** | `actual_duration_minutes` | $\ge 100$ valid pairs | `consultationStartedAt`, `consultationCompletedAt`, `department`, `priority` | Clinical encounter face-time is log-normally distributed. Minimum 100 records are required to capture specialty-specific variances (e.g. 15 min General Medicine vs 35 min Oncology). |
| **4. Department Demand** | `daily_appointment_count` | $\ge 60$ continuous days | `appointmentDate`, `department` | Autoregressive lag features (`lag_1`, `lag_7`, `rolling_mean_7`) require at least 60 contiguous operational calendar days without dropping $> 20\%$ of data during differencing. |

---

## 3. Label Generation & Chronological Event Flow

```
[ APPOINTMENT BOOKED ]
        │  Stamps: appointmentDate, slot.startTime, createdAt
        ▼
[ PATIENT RECEPTION CHECK-IN ]
        │  Stamps: checkedInAt (Server-side UTC timestamp upon QR scan)
        ▼
[ DOCTOR CALLS IN PATIENT ]
        │  Stamps: consultationStartedAt (Doctor clicks 'Call In')
        │  Label 1 Created: actual_waiting_time = (consultationStartedAt - checkedInAt)
        ▼
[ DOCTOR COMPLETES ENCOUNTER ]
        │  Stamps: consultationCompletedAt (Doctor clicks 'Complete')
        │  Label 2 Created: actual_duration = (consultationCompletedAt - consultationStartedAt)
```

---

## 4. Anomaly Detection & Data Cleaning Rules

1. **Inverted Timestamps:**  
   If `consultationStartedAt < checkedInAt`, or `consultationCompletedAt < consultationStartedAt`, the record is flagged as `INVALID_TIMESTAMP` and excluded from training. If $> 10\%$ of records contain inverted timestamps, the data quality audit fails with `DATA_QUALITY_ISSUES`.
2. **Negative Durations:**  
   Calculated durations $\le 0$ minutes are physically impossible in clinical encounters and are automatically purged.
3. **Outlier Filtering:**  
   - Waiting time outliers: $> 360$ minutes ($> 6$ hours) indicate a patient who left without being recorded or a forgotten queue token.
   - Consultation duration outliers: $< 3$ minutes (accidental click) or $> 180$ minutes ($> 3$ hours) are flagged for administrative review.
4. **Data Leakage Elimination:**  
   All validation splits use strict chronological splits (70% Train, 15% Validation, 15% Test). Random k-fold shuffling is strictly prohibited for time-dependent clinical series.

