# MediFlow AI 2.0 — Independent Machine Learning Service

**Service Port:** 5002  
**Framework:** Python 3.13 + FastAPI + Scikit-learn + Pandas + NumPy + Joblib  
**Architecture:** Microservice integrated with Express.js backend via internal token authentication  

---

## 1. Overview
The MediFlow AI ML Service provides four decoupled machine learning pipelines:
1. **Patient Waiting-Time Prediction** (`POST /predict/waiting-time`): Regression estimates grounded in queue velocity and priority class.
2. **Doctor Availability & Delay Prediction** (`POST /predict/doctor-availability`): Dual classifier estimating presence likelihood and arrival delay probability.
3. **Consultation Duration Prediction** (`POST /predict/appointment-duration`): Specialty and clinical complexity regression estimator.
4. **Department Demand Forecasting** (`POST /predict/department-demand`): 7-day multi-step rolling demand forecast.

---

## 2. API Endpoints

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---:|
| `GET` | `/health` | Health probe and artifact load status | No |
| `POST`| `/predict/waiting-time` | Predict patient waiting time | `X-Internal-Token` |
| `POST`| `/predict/doctor-availability` | Predict clinician presence & delay | `X-Internal-Token` |
| `POST`| `/predict/appointment-duration` | Predict consultation duration | `X-Internal-Token` |
| `POST`| `/predict/department-demand` | 7-day department appointment demand | `X-Internal-Token` |
| `GET` | `/models/status` | Active model versions and status | `X-Internal-Token` |
| `GET` | `/models/evaluation` | Full comparative baseline evaluation metrics | `X-Internal-Token` |

---

## 3. Running the Service

### Installation:
```bash
pip install -r requirements.txt
```

### Training & Model Registration:
```bash
PYTHONPATH=. python training/train_all.py
```

### Running the API Server:
```bash
PYTHONPATH=. python app/main.py
# Or with uvicorn:
uvicorn app.main:app --host 0.0.0.0 --port 5002
```

### Running Unit & Integration Tests:
```bash
PYTHONPATH=. pytest tests/
```

