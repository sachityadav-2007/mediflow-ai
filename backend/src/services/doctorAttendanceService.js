const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const prisma = require('../config/db');
const { getIO } = require('../config/socket');
const { createNotification, notifyAdmins } = require('./notificationService');

const JWT_SECRET = process.env.JWT_SECRET || 'mediflow_ai_jwt_secret_dev_key';

/**
 * Doctor QR Attendance & Hospital Presence Service
 */

/**
 * 1. Admin: Generate Hospital Attendance QR Code
 * @param {Object} params
 * @param {string} params.location - e.g. "Main Hospital OPD Suite", "MediFlow West Wing - Block A"
 * @param {number} [params.validityMinutes=60] - Expiration duration in minutes
 * @param {Object} params.adminUser - Authenticated Admin
 */
const generateHospitalQR = async ({ location, validityMinutes = 60, adminUser }) => {
  if (!location || !location.trim()) {
    throw new Error('Hospital check-in location is required (e.g. OPD Suite 101, Cardio Block).');
  }

  const validMins = Math.max(5, Math.min(1440, Number(validityMinutes) || 60)); // 5 mins to 24h
  const now = new Date();
  const expiresAt = new Date(now.getTime() + validMins * 60 * 1000);

  // Generate unique cryptographic identifier
  const nonce = crypto.randomBytes(8).toString('hex');
  const code = `HOSP-QR-${Date.now()}-${nonce}`;

  // Cryptographically signed JWT token with expiry & location claims
  const tokenPayload = {
    code,
    location: location.trim(),
    type: 'HOSPITAL_DOCTOR_ATTENDANCE',
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const signedToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: `${validMins}m`,
  });

  // Generate Base64 PNG QR code
  const qrDataUrl = await QRCode.toDataURL(signedToken, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a', // Deep slate navy
      light: '#ffffff',
    },
  });

  // Store QR code record in PostgreSQL
  const qrRecord = await prisma.hospitalQRCode.create({
    data: {
      code,
      signedToken,
      location: location.trim(),
      validityMinutes: validMins,
      expiresAt,
      createdById: adminUser.id,
      isActive: true,
    },
  });

  // Broadcast real-time event to Admin consoles
  const io = getIO();
  if (io) {
    io.emit('hospital_qr_created', {
      id: qrRecord.id,
      location: qrRecord.location,
      expiresAt: qrRecord.expiresAt,
    });
  }

  return {
    qrCode: qrRecord,
    signedToken,
    qrDataUrl,
    validityMinutes: validMins,
    expiresAt,
    location: qrRecord.location,
  };
};

/**
 * 2. Admin: Revoke Hospital QR Code
 */
const revokeHospitalQR = async ({ codeId, adminUser }) => {
  if (!codeId) throw new Error('QR Code ID or code is required to revoke.');

  const qrRecord = await prisma.hospitalQRCode.findFirst({
    where: {
      OR: [{ id: codeId }, { code: codeId }],
    },
  });

  if (!qrRecord) {
    throw new Error('Hospital QR code not found.');
  }

  if (!qrRecord.isActive) {
    return {
      success: true,
      message: 'QR code was already revoked or inactive.',
      qrCode: qrRecord,
    };
  }

  const updated = await prisma.hospitalQRCode.update({
    where: { id: qrRecord.id },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revokedBy: adminUser.id,
    },
  });

  const io = getIO();
  if (io) {
    io.emit('hospital_qr_revoked', {
      id: updated.id,
      code: updated.code,
      location: updated.location,
    });
  }

  return {
    success: true,
    message: `Hospital QR code for "${updated.location}" has been revoked successfully.`,
    qrCode: updated,
  };
};

/**
 * 3. Admin & Doctor: Fetch Active Hospital QR Codes
 */
const getActiveHospitalQRCodes = async () => {
  const now = new Date();
  let qrs = await prisma.hospitalQRCode.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: now },
    },
    include: {
      _count: {
        select: {
          attendances: true,
          scanEvents: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Auto-provision an active hospital OPD gate if none exists or all expired
  if (qrs.length === 0) {
    try {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const adminId = admin ? admin.id : 'system-admin';
      await generateHospitalQR({
        location: 'Main Hospital OPD Suite - Ground Floor',
        validityMinutes: 480, // 8-hour shift coverage
        adminUser: { id: adminId },
      });

      qrs = await prisma.hospitalQRCode.findMany({
        where: {
          isActive: true,
          expiresAt: { gt: now },
        },
        include: {
          _count: {
            select: {
              attendances: true,
              scanEvents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (provisionErr) {
      console.warn('Notice: Auto-provisioning active hospital QR code skipped:', provisionErr.message);
    }
  }

  return Promise.all(
    qrs.map(async (qr) => {
      let qrDataUrl = null;
      try {
        qrDataUrl = await QRCode.toDataURL(qr.signedToken, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 280,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
      } catch (qrErr) {
        // QR rendering failure fallback
      }

      return {
        id: qr.id,
        code: qr.code,
        location: qr.location,
        validityMinutes: qr.validityMinutes,
        expiresAt: qr.expiresAt,
        createdAt: qr.createdAt,
        isActive: qr.isActive,
        totalCheckIns: qr._count?.attendances || 0,
        totalScans: qr._count?.scanEvents || 0,
        signedToken: qr.signedToken,
        qrDataUrl,
      };
    })
  );
};

/**
 * 4. Doctor: Process QR Check-In
 * @param {Object} params
 * @param {string} params.token - Scanned hospital QR token
 * @param {Object} params.doctorUser - Authenticated user from req.user
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 */
const processDoctorCheckIn = async ({ token, doctorUser, ipAddress, userAgent }) => {
  if (!token || !token.trim()) {
    throw new Error('Hospital QR code token is required for doctor check-in.');
  }

  // 1. Role-based verification: strictly enforce DOCTOR role
  if (!doctorUser || doctorUser.role !== 'DOCTOR') {
    // Record unauthorized audit attempt
    await prisma.qRScanAudit.create({
      data: {
        userId: doctorUser?.id || 'unknown',
        userRole: doctorUser?.role || 'PATIENT',
        location: 'Hospital Gate / OPD',
        action: 'CHECK_IN',
        status: 'FAILED',
        failureReason: 'Unauthorized role: only doctors can check in for attendance',
        ipAddress,
        userAgent,
      },
    });
    throw new Error('Unauthorized: Only certified doctors can register hospital clinical attendance.');
  }

  // 2. Resolve Doctor profile from database using authenticated server identity
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUser.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found for authenticated account.');
  }

  // 3. Decode & Verify JWT Signature
  let decoded = null;
  try {
    decoded = jwt.verify(token.trim(), JWT_SECRET);
  } catch (err) {
    // Record failed audit
    await prisma.qRScanAudit.create({
      data: {
        userId: doctorUser.id,
        userRole: 'DOCTOR',
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: 'Unknown / Invalid QR',
        action: 'CHECK_IN',
        status: err.name === 'TokenExpiredError' ? 'EXPIRED' : 'FAILED',
        failureReason: err.message,
        ipAddress,
        userAgent,
      },
    });

    if (err.name === 'TokenExpiredError') {
      throw new Error('This hospital check-in QR code has expired. Please ask administration for a fresh code.');
    }
    throw new Error('Invalid QR code signature. Please scan an authentic hospital attendance QR.');
  }

  if (decoded.type !== 'HOSPITAL_DOCTOR_ATTENDANCE') {
    throw new Error('Invalid QR type. Expected hospital doctor attendance token.');
  }

  // 4. Verify QR record in database
  const qrRecord = await prisma.hospitalQRCode.findUnique({
    where: { code: decoded.code },
  });

  if (!qrRecord) {
    throw new Error('Hospital QR code identifier not found in the registry.');
  }

  const now = new Date();

  // Check revocation
  if (!qrRecord.isActive || qrRecord.revokedAt) {
    await prisma.qRScanAudit.create({
      data: {
        qrCodeId: qrRecord.id,
        userId: doctorUser.id,
        userRole: 'DOCTOR',
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: qrRecord.location,
        action: 'CHECK_IN',
        status: 'REVOKED',
        failureReason: 'Hospital QR code has been revoked by admin',
        ipAddress,
        userAgent,
      },
    });
    throw new Error('This hospital QR code has been revoked by hospital administration.');
  }

  // Check expiration
  if (qrRecord.expiresAt < now) {
    await prisma.qRScanAudit.create({
      data: {
        qrCodeId: qrRecord.id,
        userId: doctorUser.id,
        userRole: 'DOCTOR',
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: qrRecord.location,
        action: 'CHECK_IN',
        status: 'EXPIRED',
        failureReason: 'Hospital QR code has expired',
        ipAddress,
        userAgent,
      },
    });
    throw new Error('This hospital QR code has expired. Please ask administration to regenerate.');
  }

  // 5. Anti-Duplicate / Anti-Replay Prevention
  // Check if doctor is already checked in with an active ongoing session
  const activeSession = await prisma.doctorAttendance.findFirst({
    where: {
      doctorId: doctor.id,
      status: 'CHECKED_IN',
    },
    orderBy: { checkInTime: 'desc' },
  });

  if (activeSession) {
    const checkInTimeFormatted = new Date(activeSession.checkInTime).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    await prisma.qRScanAudit.create({
      data: {
        qrCodeId: qrRecord.id,
        userId: doctorUser.id,
        userRole: 'DOCTOR',
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: qrRecord.location,
        action: 'CHECK_IN',
        status: 'REPLAY_REJECTED',
        failureReason: `Already checked in at ${activeSession.location} at ${checkInTimeFormatted}`,
        ipAddress,
        userAgent,
      },
    });

    throw new Error(
      `Duplicate check-in rejected: Dr. ${doctor.user.name} is already checked in at "${activeSession.location}" (since ${checkInTimeFormatted}). Please check out first before checking in again.`
    );
  }

  // 6. Atomic Transaction: Record Attendance, Update Doctor Presence & Audit Log
  const result = await prisma.$transaction(async (tx) => {
    // A. Create Attendance record
    const attendance = await tx.doctorAttendance.create({
      data: {
        doctorId: doctor.id,
        qrCodeId: qrRecord.id,
        location: qrRecord.location,
        checkInTime: now,
        status: 'CHECKED_IN',
        checkInMethod: 'QR_SCAN',
        notes: `Checked in via Hospital QR at ${qrRecord.location}`,
      },
    });

    // B. Update Doctor live presence to PRESENT
    const updatedDoctor = await tx.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'PRESENT' },
      include: { user: { select: { name: true, email: true } } },
    });

    // C. Record PresenceLog
    await tx.presenceLog.create({
      data: {
        doctorId: doctor.id,
        status: 'PRESENT',
        detectionMethod: 'QR_SCAN',
        notes: `Verified QR attendance check-in at ${qrRecord.location}`,
        timestamp: now,
      },
    });

    // D. Record QRScanAudit
    await tx.qRScanAudit.create({
      data: {
        qrCodeId: qrRecord.id,
        userId: doctorUser.id,
        userRole: 'DOCTOR',
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: qrRecord.location,
        action: 'CHECK_IN',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    return { attendance, doctor: updatedDoctor };
  });

  // 7. Event-Driven Real-Time Updates via Socket.IO
  const io = getIO();
  if (io) {
    // Notify all patients and dashboards that doctor is PRESENT
    io.emit('doctor_status_changed', {
      doctorId: doctor.id,
      presenceStatus: 'PRESENT',
      doctorName: doctor.user.name,
      location: qrRecord.location,
    });

    // Notify admin attendance monitoring console
    io.emit('doctor_attendance_updated', {
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      action: 'CHECK_IN',
      location: qrRecord.location,
      checkInTime: now,
      attendanceId: result.attendance.id,
    });
  }

  // 8. Dispatch In-App Notifications
  try {
    // Notify all hospital administrators of clinician physical check-in
    notifyAdmins({
      type: 'DOCTOR_CHECK_IN',
      title: 'Doctor Shift Check-In',
      message: `Dr. ${doctor.user.name} checked in at ${qrRecord.location}. Status updated to PRESENT.`,
      metadata: {
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: qrRecord.location,
        checkInTime: now,
        attendanceId: result.attendance.id,
      },
    }).catch((err) => console.warn('Admin check-in notification notice:', err.message));

    // Notify doctor
    if (doctor.userId) {
      createNotification({
        userId: doctor.userId,
        type: 'DOCTOR_CHECK_IN',
        title: 'Hospital Shift Started',
        message: `Welcome Dr. ${doctor.user.name}. You are checked in at ${qrRecord.location}. Status is now PRESENT.`,
        metadata: {
          location: qrRecord.location,
          checkInTime: now,
          attendanceId: result.attendance.id,
        },
      }).catch((err) => console.warn('Doctor check-in notification notice:', err.message));
    }
  } catch (notifErr) {
    console.warn('Doctor check-in notification dispatch skipped:', notifErr.message);
  }

  return {
    success: true,
    message: `Attendance confirmed: Welcome Dr. ${doctor.user.name}! Status updated to PRESENT.`,
    attendance: result.attendance,
    currentPresence: 'PRESENT',
    location: qrRecord.location,
    checkInTime: now,
  };
};

/**
 * 5. Doctor: Process Checkout
 * @param {Object} params
 * @param {Object} params.doctorUser
 * @param {string} [params.notes]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 */
const processDoctorCheckOut = async ({ doctorUser, notes, ipAddress, userAgent }) => {
  if (!doctorUser || doctorUser.role !== 'DOCTOR') {
    throw new Error('Unauthorized: Only doctors can check out of hospital attendance.');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUser.id },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found.');
  }

  // Find active ongoing check-in session
  const activeSession = await prisma.doctorAttendance.findFirst({
    where: {
      doctorId: doctor.id,
      status: 'CHECKED_IN',
    },
    orderBy: { checkInTime: 'desc' },
  });

  if (!activeSession) {
    throw new Error(`Dr. ${doctor.user.name} does not have an active check-in session to check out from.`);
  }

  const now = new Date();
  const checkInDate = new Date(activeSession.checkInTime);
  const durationMs = Math.max(0, now.getTime() - checkInDate.getTime());
  const durationMinutes = Math.max(0, Math.round(durationMs / 60000));

  // Atomic Transaction: Update Attendance, Doctor Presence to OFFLINE, Log Audit
  const result = await prisma.$transaction(async (tx) => {
    // A. Update Attendance record
    const updatedAttendance = await tx.doctorAttendance.update({
      where: { id: activeSession.id },
      data: {
        checkOutTime: now,
        durationMinutes,
        status: 'CHECKED_OUT',
        checkOutMethod: 'QR_SCAN',
        notes: notes ? `${activeSession.notes || ''} | Checkout: ${notes}` : activeSession.notes,
      },
    });

    // B. Set Doctor Presence to OFFLINE
    const updatedDoctor = await tx.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'OFFLINE' },
    });

    // C. Record PresenceLog
    await tx.presenceLog.create({
      data: {
        doctorId: doctor.id,
        status: 'OFFLINE',
        detectionMethod: 'QR_SCAN',
        notes: `Doctor checked out from ${activeSession.location}. Working duration: ${durationMinutes} mins`,
        timestamp: now,
      },
    });

    // D. Record QRScanAudit
    await tx.qRScanAudit.create({
      data: {
        qrCodeId: activeSession.qrCodeId,
        userId: doctorUser.id,
        userRole: 'DOCTOR',
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        location: activeSession.location,
        action: 'CHECK_OUT',
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    return { updatedAttendance, updatedDoctor };
  });

  // Real-Time Socket.IO broadcasts
  const io = getIO();
  if (io) {
    io.emit('doctor_status_changed', {
      doctorId: doctor.id,
      presenceStatus: 'OFFLINE',
      doctorName: doctor.user.name,
    });

    io.emit('doctor_attendance_updated', {
      doctorId: doctor.id,
      doctorName: doctor.user.name,
      action: 'CHECK_OUT',
      durationMinutes,
      checkOutTime: now,
    });
  }

  // Dispatch In-App Notifications
  try {
    // Notify all administrators of doctor checkout
    notifyAdmins({
      type: 'DOCTOR_CHECK_OUT',
      title: 'Doctor Shift Completed',
      message: `Dr. ${doctor.user.name} checked out. Shift duration: ${durationMinutes} minute(s). Status is now OFFLINE.`,
      metadata: {
        doctorId: doctor.id,
        doctorName: doctor.user.name,
        durationMinutes,
        checkOutTime: now,
      },
    }).catch((err) => console.warn('Admin check-out notification notice:', err.message));

    // Notify doctor
    if (doctor.userId) {
      createNotification({
        userId: doctor.userId,
        type: 'DOCTOR_CHECK_OUT',
        title: 'Hospital Shift Ended',
        message: `Shift completed successfully. Total duration: ${durationMinutes} minute(s). Status updated to OFFLINE.`,
        metadata: {
          durationMinutes,
          checkOutTime: now,
        },
      }).catch((err) => console.warn('Doctor check-out notification notice:', err.message));
    }
  } catch (notifErr) {
    console.warn('Doctor check-out notification dispatch skipped:', notifErr.message);
  }

  return {
    success: true,
    message: `Checkout successful! Session duration: ${durationMinutes} minute(s). Status updated to OFFLINE.`,
    attendance: result.updatedAttendance,
    durationMinutes,
    checkOutTime: now,
    currentPresence: 'OFFLINE',
  };
};

/**
 * Helper: Auto-expire any active attendance sessions older than 12 hours
 * Ensures no stale attendance sessions remain permanently open.
 */
const autoExpireStaleSessions = async (doctorId = null) => {
  const thresholdTime = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const where = {
    status: 'CHECKED_IN',
    checkInTime: { lt: thresholdTime },
  };
  if (doctorId) where.doctorId = doctorId;

  try {
    const staleSessions = await prisma.doctorAttendance.findMany({
      where,
      include: { doctor: true },
    });

    for (const session of staleSessions) {
      const checkInDate = new Date(session.checkInTime);
      const durationMinutes = Math.min(720, Math.max(0, Math.round((Date.now() - checkInDate.getTime()) / 60000)));
      await prisma.$transaction([
        prisma.doctorAttendance.update({
          where: { id: session.id },
          data: {
            status: 'AUTO_CLOSED',
            checkOutTime: new Date(checkInDate.getTime() + 12 * 60 * 60 * 1000),
            durationMinutes,
            checkOutMethod: 'MANUAL',
            notes: `${session.notes || ''} | [Auto-closed by system: 12-hour shift threshold reached]`.trim(),
          },
        }),
        prisma.doctor.update({
          where: { id: session.doctorId },
          data: { currentPresence: 'OFFLINE' },
        }),
        prisma.presenceLog.create({
          data: {
            doctorId: session.doctorId,
            status: 'OFFLINE',
            detectionMethod: 'MANUAL',
            notes: 'System auto-expired stale shift exceeding 12 hours',
          },
        }),
      ]);
    }
  } catch (err) {
    console.warn('Notice: Error auto-expiring stale sessions:', err.message);
  }
};

/**
 * 6. Doctor: Get Current Attendance Status & Today's History
 */
const getDoctorMyAttendance = async (doctorUser) => {
  if (!doctorUser || doctorUser.role !== 'DOCTOR') {
    throw new Error('Unauthorized: Doctor authentication required.');
  }

  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUser.id },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  if (!doctor) {
    throw new Error('Doctor profile not found.');
  }

  // Auto-expire any stale sessions exceeding 12 hours
  await autoExpireStaleSessions(doctor.id);

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  // Active session
  let activeSession = await prisma.doctorAttendance.findFirst({
    where: {
      doctorId: doctor.id,
      status: 'CHECKED_IN',
    },
    include: { qrCode: true },
    orderBy: { checkInTime: 'desc' },
  });

  // Authoritative presence synchronization:
  // If no active check-in exists today, presence must not contradict as PRESENT/AVAILABLE
  if (!activeSession && (doctor.currentPresence === 'PRESENT' || doctor.currentPresence === 'AVAILABLE')) {
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'OFFLINE' },
    });
    doctor.currentPresence = 'OFFLINE';
  } else if (activeSession && doctor.currentPresence === 'OFFLINE') {
    // If active session exists but doctor record was marked OFFLINE, restore to PRESENT
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { currentPresence: 'PRESENT' },
    });
    doctor.currentPresence = 'PRESENT';
  }

  // Today's total sessions
  const todaySessions = await prisma.doctorAttendance.findMany({
    where: {
      doctorId: doctor.id,
      checkInTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { checkInTime: 'desc' },
  });

  const totalMinutesToday = todaySessions.reduce(
    (acc, s) => acc + (s.durationMinutes || 0),
    0
  );

  return {
    success: true,
    doctor: {
      id: doctor.id,
      name: doctor.user.name,
      specialization: doctor.specialization,
      department: doctor.department,
      roomNumber: doctor.roomNumber,
      currentPresence: doctor.currentPresence,
    },
    isCheckedIn: !!activeSession,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          location: activeSession.location,
          checkInTime: activeSession.checkInTime,
          checkInMethod: activeSession.checkInMethod,
        }
      : null,
    todaySessions,
    totalMinutesToday,
  };
};

/**
 * 7. Admin & Doctor: Attendance History
 */
const getAttendanceHistory = async ({ user, doctorId, date, location, page = 1, limit = 20 }) => {
  const where = {};

  // If Doctor: force scope to only their own records
  if (user.role === 'DOCTOR') {
    const doc = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doc) throw new Error('Doctor profile not found.');
    where.doctorId = doc.id;
  } else if (doctorId) {
    // If Admin and specific doctor requested
    where.doctorId = doctorId;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    where.checkInTime = { gte: start, lte: end };
  }

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));

  const [total, records] = await Promise.all([
    prisma.doctorAttendance.count({ where }),
    prisma.doctorAttendance.findMany({
      where,
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        qrCode: {
          select: { code: true, location: true },
        },
      },
      orderBy: { checkInTime: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return {
    success: true,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    records: records.map((r) => ({
      id: r.id,
      doctorId: r.doctorId,
      doctorName: r.doctor?.user?.name || 'Unknown Doctor',
      specialization: r.doctor?.specialization,
      department: r.doctor?.department,
      location: r.location,
      checkInTime: r.checkInTime,
      checkOutTime: r.checkOutTime,
      durationMinutes: r.durationMinutes,
      status: r.status,
      checkInMethod: r.checkInMethod,
      notes: r.notes,
    })),
  };
};

/**
 * 8. Admin: Get QR Scan Activity Audit Logs
 */
const getQRScanActivity = async ({ limit = 50 }) => {
  const l = Math.max(1, Math.min(200, Number(limit) || 50));
  const logs = await prisma.qRScanAudit.findMany({
    orderBy: { timestamp: 'desc' },
    take: l,
  });

  return {
    success: true,
    total: logs.length,
    logs,
  };
};

/**
 * 9. Basic Presence Analytics for Administrators
 * Computes live presence summary:
 * - totalDoctors: all registered clinicians
 * - presentDoctors: doctors currently PRESENT or AVAILABLE
 * - inConsultationDoctors: doctors currently IN_CONSULTATION or BUSY
 * - offDutyDoctors: doctors currently OFFLINE, AWAY, ON_BREAK, or ON_LEAVE
 */
const getPresenceAnalytics = async () => {
  const [totalDoctors, presentDoctors, inConsultationDoctors, offDutyDoctors] =
    await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({
        where: { currentPresence: { in: ['PRESENT', 'AVAILABLE'] } },
      }),
      prisma.doctor.count({
        where: { currentPresence: { in: ['IN_CONSULTATION', 'BUSY'] } },
      }),
      prisma.doctor.count({
        where: {
          currentPresence: { in: ['OFFLINE', 'AWAY', 'ON_BREAK', 'ON_LEAVE'] },
        },
      }),
    ]);

  return {
    success: true,
    data: {
      totalDoctors,
      presentDoctors,
      inConsultationDoctors,
      offDutyDoctors,
      timestamp: new Date().toISOString(),
    },
  };
};

module.exports = {
  generateHospitalQR,
  revokeHospitalQR,
  getActiveHospitalQRCodes,
  processDoctorCheckIn,
  processDoctorCheckOut,
  getDoctorMyAttendance,
  getAttendanceHistory,
  getQRScanActivity,
  getPresenceAnalytics,
};

