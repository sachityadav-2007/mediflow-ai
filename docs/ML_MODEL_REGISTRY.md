# MediFlow AI 2.0 — Machine Learning Model Registry & Governance
**Document ID:** `docs/ML_MODEL_REGISTRY.md`  
**Registry File:** `ml-service/artifacts/model_registry.json`  
**Version:** 2.0.0  
**Status:** Maintained & Governed  

---

## 1. Registry Architecture & Versioning Standards

The Model Registry is the single authoritative source of truth for all machine learning pipelines in MediFlow AI 2.0. It tracks model lineage, feature inputs, training timestamps, baseline comparisons, dataset provenance, and operational status.

### Status Enum Definitions
* **`DEVELOPMENT_ONLY`**: Experimental pipeline tested on development benchmarks only. Not approved for clinical decision support.
* **`INSUFFICIENT_DATA`**: Model architecture, serialization, and API contracts are fully implemented and verified, but the operational database lacks sufficient ground-truth labels for production training.
* **`TRAINED_AND_EVALUATED`**: Model trained on verified operational data ($N \ge 100$ or $\ge 60$ days) that demonstrated statistically significant improvement over naive baselines.
* **`RETIRED`**: Deprecated model replaced by an upgraded candidate.

---

## 2. Active Model Registry Inventory

### 2.1 Model 1: `patient_waiting_time`
* **Version:** `1.0.0-dev`
* **Active Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`
* **Dataset Type:** `SYNTHETIC_DEVELOPMENT_PIPELINE`
* **Artifact Binary:** `artifacts/waiting_time_model.joblib`
* **Features:** `department`, `day_of_week`, `hour_of_day`, `queue_length_ahead`, `priority_level`
* **Champion Model:** `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)`
* **Baseline Comparison:** `DummyRegressor(strategy='mean')`
* **Baseline Metrics:** $\text{MAE} = 17.165\text{ min}, \text{RMSE} = 21.945, R^2 = -0.0015$
* **Champion Metrics:** $\text{MAE} = 3.861\text{ min}, \text{RMSE} = 4.957, R^2 = 0.9489$

### 2.2 Model 2: `doctor_availability_and_delay`
* **Version:** `1.0.0-dev`
* **Active Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`
* **Dataset Type:** `SYNTHETIC_DEVELOPMENT_PIPELINE`
* **Artifact Binary:** `artifacts/doctor_availability_model.joblib`
* **Features:** `department`, `day_of_week`, `hour_of_day`
* **Champion Bundle:**
  - Availability: `RandomForestClassifier(n_estimators=100, class_weight='balanced')`
  - Delay: `RandomForestClassifier(n_estimators=100, class_weight='balanced')`
* **Baseline Comparison:** `DummyClassifier(strategy='most_frequent')`
* **Baseline Metrics:** $\text{Precision} = 0.853, \text{Recall} = 1.0, F_1 = 0.921, \text{ROC-AUC} = 0.50$
* **Champion Metrics:** $\text{Precision} = 0.857, \text{Recall} = 0.703, F_1 = 0.773, \text{ROC-AUC} = 0.504$

### 2.3 Model 3: `appointment_duration`
* **Version:** `1.0.0-dev`
* **Active Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`
* **Dataset Type:** `SYNTHETIC_DEVELOPMENT_PIPELINE`
* **Artifact Binary:** `artifacts/appointment_duration_model.joblib`
* **Features:** `department`, `day_of_week`, `hour_of_day`, `priority_level`
* **Champion Model:** `GradientBoostingRegressor(n_estimators=100, max_depth=4, learning_rate=0.08)`
* **Baseline Comparison:** `DummyRegressor(strategy='median')`
* **Baseline Metrics:** $\text{MAE} = 6.340\text{ min}, \text{RMSE} = 8.120, R^2 = -0.0120$
* **Champion Metrics:** $\text{MAE} = 4.090\text{ min}, \text{RMSE} = 5.210, R^2 = 0.5463$

### 2.4 Model 4: `department_demand_forecast`
* **Version:** `1.0.0-dev`
* **Active Status:** `IMPLEMENTED_BUT_INSUFFICIENT_DATA`
* **Dataset Type:** `SYNTHETIC_DEVELOPMENT_PIPELINE`
* **Artifact Binary:** `artifacts/department_demand_model.joblib`
* **Features:** `department`, `day_of_week`, `day_of_month`, `month`, `is_weekend`, `lag_1`, `lag_7`, `rolling_mean_7`
* **Champion Model:** `RandomForestRegressor (Time-Series Lag Features)`
* **Baseline Comparison:** `7-Day Moving Average Baseline`
* **Baseline Metrics:** $\text{WAPE} = 0.3951, \text{MAE} = 6.18, \text{RMSE} = 8.42$
* **Champion Metrics:** $\text{WAPE} = 0.2323, \text{MAE} = 3.63, \text{RMSE} = 4.89$

