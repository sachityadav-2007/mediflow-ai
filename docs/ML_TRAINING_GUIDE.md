# MediFlow AI 2.0 — Machine Learning Training & Retraining Guide

**Document Version:** 2.0.0  
**Target Environment:** Python 3.13 / FastAPI Microservice (`ml-service/`)  
**Prerequisites:** Scikit-Learn 1.9+, Pandas 3.1+, NumPy 2.4+, Joblib 1.6+  

---

## 1. Directory Structure & Environment Setup

All Machine Learning training pipelines reside inside the `ml-service/` directory:

```bash
cd ml-service/

# Verify installed Python environment dependencies
pip install -r requirements.txt
```

---

## 2. Model Training Pipelines & Execution Commands

### 2.1 Pipeline 1: Patient Waiting-Time Prediction
- **Target:** Ground-truth patient waiting time ($W_i = \text{consultation\_start} - \text{check\_in}$).
- **Command:**
  ```bash
  PYTHONPATH=. python training/train_waiting_time.py
  ```
- **Execution Flow:**
  1. Ingests patient appointments with chronological order sorting.
  2. Applies `OneHotEncoder` to `department`, `day_of_week`, `priority_level` and `StandardScaler` to `queue_length_ahead`, `hour_of_day`.
  3. Trains `DummyRegressor(strategy='mean')` baseline.
  4. Trains `RandomForestRegressor` and `GradientBoostingRegressor`.
  5. Selects champion based on test $R^2$ and serializes pipeline to `artifacts/waiting_time_model.joblib`.

---

### 2.2 Pipeline 2: Doctor Availability & Arrival Delay Prediction
- **Target:** Dual classification ($P(\text{Available})$ and $P(\text{Delayed})$).
- **Command:**
  ```bash
  PYTHONPATH=. python training/train_doctor_availability.py
  ```
- **Execution Flow:**
  1. Computes clinician presence labels and lateness indicators ($>15$ minutes arrival delay).
  2. Evaluates `DummyClassifier` baseline.
  3. Fits class-balanced `LogisticRegression` and `RandomForestClassifier`.
  4. Compares Precision, Recall, $F_1$, and ROC-AUC.
  5. Bundles availability and delay models into `artifacts/doctor_availability_model.joblib`.

---

### 2.3 Pipeline 3: Consultation Duration Prediction
- **Target:** Empirical consultation length ($D_i = \text{consultation\_complete} - \text{consultation\_start}$).
- **Command:**
  ```bash
  PYTHONPATH=. python training/train_appointment_duration.py
  ```
- **Execution Flow:**
  1. Filters completed consultations and removes anomalous/cancelled visits.
  2. Evaluates `DummyRegressor(strategy='median')` baseline.
  3. Fits `RandomForestRegressor` and `GradientBoostingRegressor`.
  4. Saves best model pipeline to `artifacts/appointment_duration_model.joblib`.

---

### 2.4 Pipeline 4: Department Demand Forecasting
- **Target:** 7-Day forward appointment booking demand by clinical department.
- **Command:**
  ```bash
  PYTHONPATH=. python training/train_department_demand.py
  ```
- **Execution Flow:**
  1. Aggregates daily bookings per clinical department.
  2. Generates autoregressive lag features (`lag_1`, `lag_7`, `rolling_mean_7`).
  3. Benchmarks against 7-day rolling moving average baseline.
  4. Fits multi-feature time-series `RandomForestRegressor`.
  5. Computes WAPE and MAE, serializing to `artifacts/department_demand_model.joblib`.

---

### 2.5 Master Execution: Train & Register All Pipelines
To execute all four training pipelines sequentially and update `artifacts/model_registry.json`:

```bash
PYTHONPATH=. python training/train_all.py
```

---

## 3. Automated Retraining on Live Production Data

When the operational hospital database accumulates the required clinical event thresholds:
- Patient check-ins ($\text{checkedInAt}$): $\ge 500$ events.
- Completed consultations ($\text{consultationCompletedAt}$): $\ge 500$ events.
- Doctor verified QR attendance sessions: $\ge 100$ shifts per doctor.

### Retraining Protocol:
1. Export production dataset via database query script:
   ```bash
   node scripts/export_ml_training_data.js
   ```
2. Execute master retraining with production flag:
   ```bash
   PYTHONPATH=. python training/train_all.py --source=production
   ```
3. Restart or reload the FastAPI service:
   The FastAPI lifespan handler automatically re-reads `model_registry.json` and hot-reloads joblib artifacts with zero system downtime.

