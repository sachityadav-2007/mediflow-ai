# MediFlow AI — Dataset Specification & Data Governance Framework

**Document Version:** 1.0.0  
**Research Benchmark Horizon:** 14 Operational Days  
**Total Patient Cohort:** $N = 1,000$ Simulated Clinical Encounters  
**Data Repository Output:** `data/benchmark_results.csv`, `data/research_evaluation_data.json`  

---

## 1. Dataset Origin & Scientific Integrity Disclosure

In accordance with strict clinical AI research governance standards:
- **Synthetic Monte Carlo Generation:** All empirical experimental results reported in this benchmark evaluation derive from a calibrated, stochastic Monte Carlo event-driven simulation of an urban tertiary hospital outpatient department.
- **No Real Patient Identifiable Data (PHI):** Zero Protected Health Information (PHI) or Personally Identifiable Information (PII) from genuine hospital EHR systems was utilized, satisfying the compliance mandates of the Health Insurance Portability and Accountability Act (HIPAA) and India's Digital Information Security in Healthcare Act (DISHA).
- **Hospital Parameter Calibration:** The parametric distributions governing arrival jitter, cancellation probabilities, clinician unpunctuality, and consultation lengths were empirically calibrated against published operational studies of outpatient clinics in major urban Indian hospitals (e.g., AIIMS, PGI Chandigarh, and Apollo Outpatient Clinics).

---

## 2. Dataset Schema & Feature Dictionary

The experimental dataset comprises $N = 1,000$ discrete patient appointment records tracked across four independent queuing systems.

| Feature Name | Data Type | Permissible Range / Enum | Description | Queuing Role |
|:---|:---|:---|:---|:---|
| `patientId` | String (UUIDv4) | 36 characters | Unique synthetic identifier for the simulated patient | Identifier |
| `simulatedDay` | Integer | $1 \le \text{Day} \le 14$ | The operational calendar day within the 2-week observation window | Temporal coordinate |
| `doctorId` | String (UUIDv4) | 36 characters | Identifier of the assigned clinical specialist consultant | Server index |
| `doctorName` | String | e.g., "Dr. Rajesh Sharma" | Name of the specialist physician | Clinician profile |
| `department` | String (Enum) | 9 Medical Departments | Clinical specialty (Cardiology, Orthopedics, Pediatrics, etc.) | Clinic category |
| `priority` | String (Enum) | `EMERGENCY`, `URGENT`, `ROUTINE` | Clinical triage category assigned at scheduling/reception | Queue priority weight |
| `scheduledSlot` | String (Time) | `09:00` to `16:00` | Designated 30-minute nominal appointment window | Scheduled arrival time |
| `actualArrivalOffset`| Float (Minutes) | $[-15.0, +30.0]$ | Discrepancy between scheduled time and physical arrival | Arrival jitter ($\Delta a_i$) |
| `consultationDuration`| Float (Minutes) | $[5.0, 45.0]$ | Net service time inside consultation chamber | Service time ($S_i$) |
| `isCancelled` | Boolean | `true` / `false` | Indicates whether patient cancelled prior to consultation | Attrition indicator |
| `waitlistOrigin` | Boolean | `true` / `false` | Indicates whether slot was allocated via waitlist backfilling | Reallocation flag |
| `waitingTime_SysA` | Float (Minutes) | $\ge 0.0$ | Time spent in waiting room under System A (Baseline FCFS) | Primary outcome variable |
| `waitingTime_SysB` | Float (Minutes) | $\ge 0.0$ | Time spent in waiting room under System B (AI-Assisted) | Primary outcome variable |
| `waitingTime_SysC` | Float (Minutes) | $\ge 0.0$ | Time spent in waiting room under System C (Presence-Aware) | Primary outcome variable |
| `waitingTime_SysD` | Float (Minutes) | $\ge 0.0$ | Time spent in waiting room under System D (Integrated MediFlow) | Primary outcome variable |
| `predictedWait_SysD`| Float (Minutes) | $\ge 0.0$ | MediFlow AI queue velocity predicted waiting time | Model estimation |

---

## 3. Stochastic Generation Distributions & Mathematical Modeling

All synthetic clinical variables were generated using a deterministic Mulberry32 pseudo-random number generator (`SEED = 42`) applying the following statistical distributions:

### 3.1 Patient Arrival Jitter ($\Delta a_i$)
Patients rarely arrive exactly at their scheduled appointment minute. We model arrival offset $\Delta a_i$ as a normal distribution centered at nominal appointment time:

$$\Delta a_i \sim \mathcal{N}(\mu = 0.0\text{ min}, \; \sigma = 7.5\text{ min})$$

Where $\Delta a_i < 0$ represents early arrival (e.g., patient arrives 10 minutes early) and $\Delta a_i > 0$ represents late arrival. Arriving patients are immediately logged into the waiting room.

### 3.2 Consultation Duration ($S_i$)
Clinical consultation lengths exhibit significant positive skewness (long right tail representing complex surgical consultations, ECG reviews, or multi-morbid discussions). We model consultation duration using a lognormal distribution truncated to the interval $[5.0, 45.0]$ minutes:

$$S_i = \exp\left(\mu_{\ln} + \sigma_{\ln} \cdot Z\right), \quad Z \sim \mathcal{N}(0, 1)$$

$$\mu_{\ln} = \ln(15.0) - \frac{0.38^2}{2} \approx 2.636, \quad \sigma_{\ln} = 0.38$$

- **Theoretical Mean:** $15.0$ minutes
- **Standard Deviation:** $\approx 6.0$ minutes
- **Empirical Minimum:** $5.0$ minutes
- **Empirical Maximum:** $45.0$ minutes

### 3.3 Patient Cancellation & No-Show Probability ($p_{\text{cancel}}$)
Based on national outpatient attendance surveys indicating a $14\%–18\%$ no-show rate in urban public and private hospital clinics:

$$p_{\text{cancel}} = 0.160 \quad (16.0\%)$$

For every scheduled slot, a uniform random variable $U_i \sim \mathcal{U}(0, 1)$ is sampled. If $U_i < 0.160$, the appointment is cancelled.
- In System A and System C, this slot remains vacant (idle doctor capacity).
- In System B, walk-in rebooking fills $47.9\%$ of cancelled slots.
- In System D, the Smart Waitlist Triage engine immediately matches and notifies the top-ranked waitlisted patient, achieving $100\%$ slot recovery.

### 3.4 Clinician Unpunctuality & Absence Probabilities
Physicians in tertiary care centers frequently manage inpatient ward rounds or emergency surgeries before outpatient clinics.
- **Doctor Delay Probability:** $p_{\text{late}} = 0.150$ ($15\%$ chance per operational day).
- **Lateness Duration:** Sampled from a uniform distribution:
  $$\Delta t_{\text{delay}} \sim \mathcal{U}(10.0, \; 45.0\text{ minutes})$$
- **Unscheduled Doctor Absence:** $p_{\text{absent}} = 0.050$ ($5\%$ probability of whole-day clinic cancellation due to emergency on-call duties).

### 3.5 Triage Priority Hierarchy
Patients entering the outpatient department are categorized into three distinct clinical priority tiers:
1. **Emergency / Acute Complication ($\mathcal{P}_1$, $10\%$):** Severe chest pain, acute dyspnea, hypertensive crisis, acute trauma. Dispatched with top priority.
2. **Urgent / Sub-acute ($\mathcal{P}_2$, $25\%$):** Uncontrolled fever, post-operative wound discharge, acute pain requiring prompt attention.
3. **Routine / Stable Follow-up ($\mathcal{P}_3$, $65\%$):** Chronic medication refills, routine diabetic checkups, elective physical assessments.

---

## 4. Cohort Partitioning & Statistical Summary

The table below summarizes the patient cohort distribution across clinical departments over the 14-day observation window:

| Department | Assigned Specialist | Total Encounters | Emergency ($P_1$) | Urgent ($P_2$) | Routine ($P_3$) | Mean Duration (min) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **Cardiology** | Dr. Rajesh Sharma | 118 | 14 | 31 | 73 | 15.3 |
| **Pediatrics** | Dr. Ananya Patel | 112 | 10 | 28 | 74 | 14.8 |
| **Orthopedics** | Dr. Vikram Malhotra | 109 | 11 | 27 | 71 | 15.1 |
| **Dermatology** | Dr. Priya Nair | 114 | 9 | 26 | 79 | 14.6 |
| **Neurology** | Dr. Amit Verma | 110 | 12 | 29 | 69 | 15.7 |
| **General Medicine**| Dr. Sunita Rao | 115 | 13 | 30 | 72 | 15.0 |
| **Oncology** | Dr. Rohan Kulkarni | 108 | 12 | 27 | 69 | 15.5 |
| **Nephrology** | Dr. Neha Deshmukh | 107 | 10 | 25 | 72 | 15.2 |
| **Urology** | Dr. Arjun Mehta | 107 | 9 | 27 | 71 | 14.9 |
| **Total / Overall** | **9 Consultants** | **1,000** | **100 (10.0%)** | **250 (25.0%)** | **650 (65.0%)** | **15.12** |

---

## 5. Data Governance, Integrity Verification & Reproducibility

1. **Storage Integrity:** Raw benchmark data is committed directly to source control in:
   - `data/benchmark_results.csv`: Comma-delimited tabular rows for all 1,000 patients.
   - `data/research_evaluation_data.json`: Fully structured hierarchical JSON payload with statistical moments, confidence intervals, and hypothesis test outputs.
2. **Data Pipeline Immutability:** Generated datasets are treated as immutable read-only evaluation benchmarks. No production database tables were dropped or overwritten during evaluation.
3. **Zero Data Leakage:** Waiting time prediction models evaluate only features available strictly *before* consultation admission (i.e., queue position, doctor presence state, and historical departmental duration).

