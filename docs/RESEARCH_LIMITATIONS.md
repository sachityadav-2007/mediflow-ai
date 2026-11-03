# MediFlow AI — Scientific Limitations, Assumptions & Research Governance

**Document Version:** 1.0.0  
**Research Governance:** Academic Transparency & Healthcare Software Safety  
**Subject:** Explicit Disclosure of Evaluation Scope, Simulation Assumptions, and Technical Constraints  

---

## 1. Explicit Disclosure of Simulation-Based Evaluation

In conformity with medical informatics research integrity guidelines (e.g., TRIPOD-AI and CONSORT-AI statements):

> [!CAUTION]
> **Primary Methodological Disclosure:**  
> The quantitative findings reported in this evaluation derive from a **rigorously calibrated, event-driven Monte Carlo simulation** ($N = 1,000$ patient encounters, 14 operational days, 9 specialists, Mulberry32 PRNG `SEED = 42`).  
> **MediFlow AI has not yet completed a prospective randomized controlled clinical trial (RCT) in an operational hospital facility.**  
> While parametric distributions (cancellations, doctor punctuality, consultation length) reflect empirical data from Indian tertiary hospital outpatient departments, simulated outcomes may not fully capture the qualitative complexity of real-world clinical environments.

---

## 2. Key Methodological Assumptions & Constraints

### 2.1 Parametric Distribution Assumptions
1. **Gaussian Arrival Jitter:** Patient arrival offsets were modeled as $\mathcal{N}(0, 7.5\text{ min})$. In physical hospital environments, public transit delays, registration counter bottlenecks, and parking delays frequently generate multi-modal, right-skewed arrival distributions.
2. **Lognormal Service Times:** Consultation times were modeled as lognormal with $\mu = 15.0$ minutes and $\sigma = 6.0$ minutes. While standard in healthcare operations literature, clinical consultations for multi-morbid geriatric patients or oncological reviews frequently exhibit heavy power-law tails ($S_i > 45$ minutes).
3. **Constant Daily Doctor Capacity:** The simulation assumed scheduled doctor shifts of 14 slots (7.0 clinical hours). In physical practice, physicians may be unexpectedly summoned for emergency surgeries, ICU consults, or medical collegiate teaching responsibilities.

### 2.2 Patient Behavioral & Compliance Dynamics
1. **Waitlist Responsiveness:** The simulation assumed that 100% of waitlisted patients notified upon slot cancellation accept the reallocated slot and arrive promptly. In real clinical workflows, patient response rates vary by:
   - Advance notice window (e.g., 2 hours vs 30 minutes).
   - Transit distance and geographical proximity to the hospital campus.
   - Socio-economic factors and digital literacy.
2. **No-Show Independence:** Cancellations were modeled as independent Bernoulli trials ($p = 0.160$). In reality, weather events (monsoon storms), public holidays, and transport strikes create correlated, non-independent mass no-show clusters.

---

## 3. Technical & Environmental Infrastructure Boundaries

### 3.1 Network & Device Dependencies
- **Browser Camera Permissions (HTTPS Mandate):** Real-time doctor QR check-in and patient token verification depend upon `navigator.mediaDevices.getUserMedia()`, which modern web browsers strictly restrict to secure HTTPS origins or `localhost`. Deployments lacking valid SSL certificates will encounter camera permission lockouts.
- **WebSocket Transport Stability:** Real-time queue updates rely on Socket.IO. While an HTTP long-polling fallback exists, aggressive hospital corporate firewalls or transient cellular dead zones can delay live waiting room status broadcasts.
- **Hardware Integration for RFID:** The RFID simulator validates software workflows, but physical hardware deployment requires dedicated USB/Ethernet card readers (e.g., RC522 or HID Omnikey) paired with local native daemon drivers.

### 3.2 Database Transaction Boundaries
- **Concurrency & Double Booking Defense:** MediFlow AI employs strict PostgreSQL database transactions (`prisma.$transaction`) with compound unique constraints (`[doctorId, date, startTime]`). While this guarantees zero double booking under concurrent load, high write contention on popular slots requires managed connection pooling (e.g., PgBouncer) in enterprise production clusters.

---

## 4. Algorithmic Boundaries & Model Scope

1. **Non-Preemptive Queuing Disciplinary Limitation:** MediFlow AI implements Non-Preemptive Head-of-Line (HOL) priority queuing. Once a routine consultation begins, it is never terminated mid-consultation when an emergency patient arrives. In catastrophic clinical emergencies (e.g., cardiac arrest in the waiting room), physical clinical triage mandates immediate clinical preemption.
2. **Heuristic vs Machine Learning Inference:** The waiting time estimator relies on deterministic queuing velocity equations. While this eliminates GPU requirements and hallucination risks, it lacks the contextual adaptability of deep recurrent or transformer-based sequence models that can ingest multi-variable diagnostic codes and laboratory turnaround times.

---

## 5. Roadmap for Formal Prospective Clinical Validation

To transition MediFlow AI from simulated research validation to accredited hospital deployment, the following progressive evaluation phases are required:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Clinical Translation Roadmap                         │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Institutional Review Board (IRB) / Ethics Committee Approval  │
│ Phase 2: Retrospective EHR Cross-Validation on Historical OPD Logs     │
│ Phase 3: "Shadow Mode" Silent Deployment in 2 Outpatient Specialty OPDs│
│ Phase 4: Non-Randomized Pilot Study (1 Single Department: Cardiology)  │
│ Phase 5: Multi-Center Stepped-Wedge Cluster Randomized Controlled Trial │
└────────────────────────────────────────────────────────────────────────┘
```
This structured roadmap ensures patient safety, regulatory compliance, and clinical efficacy before full hospital network deployment.

