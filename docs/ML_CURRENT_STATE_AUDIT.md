# MediFlow AI 2.0 — Machine Learning Current State Audit
**Document ID:** `docs/ML_CURRENT_STATE_AUDIT.md`  
**Date:** November 2026  
**Auditor:** Senior ML Engineer & Data Architect  
**Status:** Complete & Approved  

---

## 1. Executive Summary

This audit evaluates the genuine data-readiness, model provenance, and operational viability of the four Machine Learning pipelines in MediFlow AI 2.0. In strict accordance with healthcare software governance and academic integrity, this audit distinguishes between **development pipeline verification** and **real-world production model validity**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               MASTER ML AUDIT SUMMARY TABLE                                      │
├──────────────────────────────┬────────────────────────────┬──────────────────┬───────────────────┤
│ MODEL PIPELINE               │ PROVENANCE CLASSIFICATION  │ REAL DATA LABELS │ PRODUCTION CLAIM? │
├──────────────────────────────┼────────────────────────────┼──────────────────┼───────────────────┤
│ 1. Patient Waiting-Time      │ SYNTHETIC_DEV_PIPELINE     │ 0 valid pairs    │ NO (INSUFFICIENT) │
│ 2. Doctor Availability/Delay │ SYNTHETIC_DEV_PIPELINE     │ 29 raw logs (<100│ NO (INSUFFICIENT) │
│ 3. Consultation Duration     │ SYNTHETIC_DEV_PIPELINE     │ 0 valid pairs    │ NO (INSUFFICIENT) │
│ 4. Department Demand         │ SYNTHETIC_DEV_PIPELINE     │ 18 days (<60d)   │ NO (INSUFFICIENT) │
└──────────────────────────────┴────────────────────────────┴──────────────────┴───────────────────┘
```

---

## 2. Model-by-Model Deep Dive

### 2.1 Model 1: Patient Waiting-Time Regressor
* **Target Variable:** `actual_waiting_time_minutes = consultationStartedAt - checkedInAt`.
* **Current Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
* **Dataset Source:** `SYNTHETIC_DEVELOPMENT_PIPELINE` ($N = 1,000$ simulated records, dated 2026-09-01 to 2026-10-31).
* **Available Features:** `department`, `day_of_week`, `hour_of_day`, `queue_length_ahead`, `priority_level`.
* **Database Reality:**
  * Total database appointments: **101**.
  * Appointments with `checkedInAt`: **0**.
  * Appointments with `consultationStartedAt`: **0**.
  * Valid labelled pairs: **0**.
* **Reason for Missing Data:** Migration `20261103210000_add_prospective_consultation_timestamps` introduced `checkedInAt` and `consultationStartedAt`. Preexisting historical appointments in the seed database were created before these columns existed and therefore have `null` timestamps.
* **Evaluation Validity:** Development test metrics ($R^2 = 0.9489$, $\text{MAE} = 3.86$ min vs Dummy Baseline $\text{MAE} = 17.16$ min) prove algorithm compilation, pipeline execution, and baseline comparison. **They do not represent real hospital accuracy.**
* **Production Policy:** Model returns advisory estimates explicitly tagged with `source: ml-service` and `status: IMPLEMENTED_BUT_INSUFFICIENT_DATA`.

### 2.2 Model 2: Doctor Availability & Delay Classifier
* **Target Variable:** Binary presence probability (`is_available`) and arrival delay probability (`is_delayed` defined as check-in $> 15$ min past scheduled slot start).
* **Current Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
* **Dataset Source:** `SYNTHETIC_DEVELOPMENT_PIPELINE` ($N = 1,000$).
* **Available Features:** `department`, `day_of_week`, `hour_of_day`.
* **Database Reality:**
  * Total `doctor_attendances` records: **29**.
  * Doctors in database: **9** (average $3.2$ logs per doctor).
  * Minimum statistical threshold for clinician reliability modeling: $\ge 100$ verified attendance events per doctor across diverse days and shift times.
* **Evaluation Validity:** Development test metrics ($F_1 = 0.773$, $\text{ROC-AUC} = 0.504$) reflect synthetic dev distribution.
* **Production Policy:** All availability estimations remain non-binding. Actual hospital slot booking relies strictly on doctor working schedules and live QR attendance check-ins.

### 2.3 Model 3: Consultation Duration Regressor
* **Target Variable:** `actual_duration_minutes = consultationCompletedAt - consultationStartedAt`.
* **Current Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
* **Dataset Source:** `SYNTHETIC_DEVELOPMENT_PIPELINE` ($N = 1,000$).
* **Available Features:** `department`, `day_of_week`, `hour_of_day`, `priority_level`.
* **Database Reality:**
  * Total completed appointments: **2**.
  * Valid pairs with both `consultationStartedAt` and `consultationCompletedAt`: **0** (historical completed appointments lack timestamps).
* **Evaluation Validity:** Development test metrics ($R^2 = 0.5463$, $\text{MAE} = 4.09$ min vs Dummy Baseline $\text{MAE} = 6.34$ min) prove gradient boosting pipeline efficacy.
* **Production Policy:** Doctors configure default slot durations (e.g., 30 minutes in `Doctor.consultationDuration`). ML predictions provide optional clinical workload estimates without altering booking calendars.

### 2.4 Model 4: Department Demand Forecaster
* **Target Variable:** Daily appointment bookings per clinical department (`daily_appointment_count`).
* **Current Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
* **Dataset Source:** `SYNTHETIC_DEVELOPMENT_PIPELINE` (120 continuous days).
* **Available Features:** `department`, `day_of_week`, `day_of_month`, `month`, `is_weekend`, `lag_1`, `lag_7`, `rolling_mean_7`.
* **Database Reality:**
  * Total operational dates in database: **18 calendar days** (2026-10-31 to 2026-11-18).
  * Total appointments: **101** across 9 departments ($\approx 0.6$ to $2$ bookings per department per day).
  * Autoregressive modeling requires at least **60 continuous operational days** to compute 7-day rolling means and seasonal lags without severe data dropout.
* **Evaluation Validity:** Development test metrics ($\text{WAPE} = 23.23\%$, $\text{MAE} = 3.63$ vs 7-day Moving Average $\text{WAPE} = 39.51\%$) demonstrate the advantage of lag features on simulated series.
* **Production Policy:** Interim operational capacity uses historical weekday averages; ML forecasts remain advisory.

---

## 3. Data Governance & Ethical Integrity Conclusions

1. **No Fake Historical Records:** The system strictly refuses to backfill the database with synthetic completed timestamps. Fake backfilling would corrupt future genuine retraining.
2. **Transparent Registry:** `ml-service/artifacts/model_registry.json` explicitly documents `dataset_type: SYNTHETIC_DEVELOPMENT_PIPELINE` and `status: IMPLEMENTED_BUT_INSUFFICIENT_DATA`.
3. **Controlled Retraining Required:** Automatic retraining upon every booking is prohibited. Retraining must follow an audited workflow initiated by authorized administrators once real data thresholds are met.

