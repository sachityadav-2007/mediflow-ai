-- =============================================================================
-- MediFlow AI — Essential PostgreSQL Queries for Viva & Live Demonstration
-- =============================================================================

-- 1. View all registered users and their assigned roles
SELECT id, name, email, role, phone, "createdAt" 
FROM users 
ORDER BY "createdAt" DESC;

-- 2. View all doctors with their specialization, room, and live clinical presence
SELECT 
  u.name AS doctor_name, 
  d.specialization, 
  d.department, 
  d.experience || ' years' AS experience,
  '₹' || d."consultationFee" AS fee, 
  d."currentPresence",
  d."roomNumber"
FROM doctors d
JOIN users u ON d."userId" = u.id
ORDER BY u.name ASC;

-- 3. View live doctor presence audit logs
SELECT 
  u.name AS doctor_name, 
  p.status, 
  p."detectionMethod", 
  p.timestamp 
FROM "presence_logs" p
JOIN doctors d ON p."doctorId" = d.id
JOIN users u ON d."userId" = u.id
ORDER BY p.timestamp DESC
LIMIT 10;

-- 4. View active appointments with patient and doctor details
SELECT 
  a."appointmentNumber", 
  pu.name AS patient_name, 
  du.name AS doctor_name, 
  s."slotDate", 
  s."startTime", 
  a.status, 
  a.priority
FROM appointments a
JOIN patients p ON a."patientId" = p.id
JOIN users pu ON p."userId" = pu.id
JOIN doctors d ON a."doctorId" = d.id
JOIN users du ON d."userId" = du.id
JOIN "appointment_slots" s ON a."slotId" = s.id
ORDER BY s."slotDate" DESC, s."startTime" ASC;

-- 5. View smart waitlist triage queue ranked by priority score
SELECT 
  w.id,
  pu.name AS patient_name, 
  du.name AS doctor_name, 
  w.priority AS medical_priority, 
  w."clinicalUrgency", 
  w."priorityScore", 
  w.status, 
  w."joinedAt"
FROM waitlists w
JOIN patients p ON w."patientId" = p.id
JOIN users pu ON p."userId" = pu.id
JOIN doctors d ON w."doctorId" = d.id
JOIN users du ON d."userId" = du.id
ORDER BY w."priorityScore" DESC, w."joinedAt" ASC;
