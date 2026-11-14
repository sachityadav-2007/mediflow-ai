const prisma = require('../config/db');
const { calculatePriorityScore, explainScore } = require('./priorityService');

/**
 * Admin Service — MediFlow AI Phase 8
 * Provides central hospital analytics, doctor oversight, patient directory,
 * appointment tracking, and smart waitlist monitoring for Hospital Administrators.
 */

// Valid appointment status enums from Prisma schema
const VALID_APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

// Valid waitlist status enums from Prisma schema
const VALID_WAITLIST_STATUSES = [
  'PENDING',
  'NOTIFIED',
  'ALLOCATED',
  'EXPIRED',
  'CANCELLED',
];

/**
 * 1. Get Hospital-wide Statistics
 * Aggregates live counts across doctors, patients, appointments, waitlist, and doctor presence.
 */
const getHospitalStats = async () => {
  const [
    totalDoctors,
    totalPatients,
    totalAppointments,
    activeAppointments,
    completedAppointments,
    cancelledAppointments,
    activeWaitlistEntries,
    doctorsPresent,
    doctorsBusy,
    doctorsAway,
    doctorsOffline,
  ] = await Promise.all([
    // Total Doctors
    prisma.doctor.count(),

    // Total Registered Patients
    prisma.patient.count(),

    // Total Appointments
    prisma.appointment.count(),

    // Active Appointments (Scheduled, Confirmed, or In-Progress)
    prisma.appointment.count({
      where: {
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    }),

    // Completed Appointments
    prisma.appointment.count({
      where: { status: 'COMPLETED' },
    }),

    // Cancelled Appointments
    prisma.appointment.count({
      where: { status: 'CANCELLED' },
    }),

    // Active Pending Waitlist Entries
    prisma.waitlist.count({
      where: { status: 'PENDING' },
    }),

    // Doctor Presence Counts (incorporating clinical presence statuses)
    prisma.doctor.count({
      where: { currentPresence: { in: ['PRESENT', 'AVAILABLE'] } },
    }),
    prisma.doctor.count({
      where: { currentPresence: { in: ['IN_CONSULTATION', 'BUSY'] } },
    }),
    prisma.doctor.count({
      where: { currentPresence: { in: ['AWAY', 'ON_BREAK'] } },
    }),
    prisma.doctor.count({
      where: { currentPresence: { in: ['OFFLINE', 'ON_LEAVE'] } },
    }),
  ]);

  const offDutyDoctors = doctorsAway + doctorsOffline;

  return {
    totalDoctors,
    totalPatients,
    totalAppointments,
    activeAppointments,
    completedAppointments,
    cancelledAppointments,
    activeWaitlistEntries,
    doctorsPresent,
    doctorsBusy,
    doctorsInConsultation: doctorsBusy,
    doctorsAway,
    doctorsOffline,
    offDutyDoctors,
    presenceAnalytics: {
      totalDoctors,
      presentDoctors: doctorsPresent,
      inConsultationDoctors: doctorsBusy,
      offDutyDoctors,
    },
  };
};

/**
 * 2. Get All Doctors for Admin Directory
 * Returns all registered doctors with credential details and current presence status.
 * Never exposes passwords or password hashes.
 */
const getAllDoctors = async () => {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          appointments: true,
          availabilities: true,
          waitlists: {
            where: { status: 'PENDING' },
          },
        },
      },
    },
    orderBy: {
      user: {
        name: 'asc',
      },
    },
  });

  return doctors.map((doctor) => ({
    id: doctor.id,
    userId: doctor.userId,
    name: doctor.user.name,
    email: doctor.user.email,
    phone: doctor.user.phone || 'N/A',
    specialization: doctor.specialization,
    department: doctor.department,
    experience: doctor.experience,
    qualification: doctor.qualification,
    consultationDuration: doctor.consultationDuration,
    consultationFee: doctor.consultationFee,
    currentPresence: doctor.currentPresence,
    roomNumber: doctor.roomNumber || 'N/A',
    totalAppointments: doctor._count.appointments,
    activeWaitlists: doctor._count.waitlists,
    schedulesConfigured: doctor._count.availabilities,
    createdAt: doctor.createdAt,
  }));
};

/**
 * 3. Get Doctor Detailed Profile for Admin
 * Returns doctor profile, full weekly availability schedule, recent presence logs,
 * and recent appointment activity.
 */
const getDoctorDetails = async (doctorId) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      availabilities: {
        orderBy: {
          dayOfWeek: 'asc',
        },
      },
      presenceLogs: {
        orderBy: {
          timestamp: 'desc',
        },
        take: 10,
      },
      appointments: {
        orderBy: {
          appointmentDate: 'desc',
        },
        take: 10,
        include: {
          patient: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          slot: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      },
      _count: {
        select: {
          appointments: true,
          waitlists: {
            where: { status: 'PENDING' },
          },
        },
      },
    },
  });

  if (!doctor) {
    throw new Error('Doctor not found.');
  }

  return {
    id: doctor.id,
    userId: doctor.userId,
    name: doctor.user.name,
    email: doctor.user.email,
    phone: doctor.user.phone || 'N/A',
    specialization: doctor.specialization,
    department: doctor.department,
    experience: doctor.experience,
    qualification: doctor.qualification,
    consultationFee: doctor.consultationFee,
    consultationDuration: doctor.consultationDuration,
    currentPresence: doctor.currentPresence,
    roomNumber: doctor.roomNumber || 'N/A',
    createdAt: doctor.createdAt,
    updatedAt: doctor.updatedAt,
    totalAppointments: doctor._count.appointments,
    activeWaitlists: doctor._count.waitlists,
    availabilities: doctor.availabilities,
    presenceLogs: doctor.presenceLogs,
    recentAppointments: doctor.appointments.map((apt) => ({
      id: apt.id,
      appointmentNumber: apt.appointmentNumber,
      appointmentDate: apt.appointmentDate,
      startTime: apt.slot?.startTime || 'N/A',
      endTime: apt.slot?.endTime || 'N/A',
      patientName: apt.patient?.user?.name || 'Unknown Patient',
      patientEmail: apt.patient?.user?.email || 'N/A',
      patientPhone: apt.patient?.user?.phone || 'N/A',
      priority: apt.priority,
      status: apt.status,
      reason: apt.reason,
    })),
  };
};

/**
 * 4. Get All Patients for Admin Directory
 * Returns all patients with summary of appointments and active waitlist status.
 * Never exposes passwords or sensitive medical records unnecessarily.
 */
const getAllPatients = async () => {
  const patients = await prisma.patient.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      waitlists: {
        where: { status: 'PENDING' },
        include: {
          doctor: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      },
      _count: {
        select: {
          appointments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return patients.map((patient) => ({
    id: patient.id,
    userId: patient.userId,
    name: patient.user.name,
    email: patient.user.email,
    phone: patient.user.phone || 'N/A',
    gender: patient.gender || 'Not specified',
    dateOfBirth: patient.dateOfBirth,
    bloodGroup: patient.bloodGroup || 'N/A',
    emergencyContact: patient.emergencyContact || 'N/A',
    totalAppointments: patient._count.appointments,
    hasActiveWaitlist: patient.waitlists.length > 0,
    activeWaitlistsCount: patient.waitlists.length,
    activeWaitlistDoctors: patient.waitlists.map((w) => w.doctor?.user?.name).filter(Boolean),
    registeredAt: patient.user.createdAt,
  }));
};

/**
 * 5. Get All Appointments for Admin Monitoring
 * Supports optional filters by status, doctorId, and appointment date.
 */
const getAllAppointments = async ({ status, doctorId, date } = {}) => {
  const where = {};

  // Status filter validation
  if (status && status !== 'ALL') {
    const normalizedStatus = status.toUpperCase();
    if (!VALID_APPOINTMENT_STATUSES.includes(normalizedStatus)) {
      throw new Error(
        `Invalid status '${status}'. Allowed values: ${VALID_APPOINTMENT_STATUSES.join(', ')}`
      );
    }
    where.status = normalizedStatus;
  }

  // Doctor filter
  if (doctorId && doctorId !== 'ALL') {
    where.doctorId = doctorId;
  }

  // Date filter (matches entire UTC day YYYY-MM-DD)
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Date must be in format YYYY-MM-DD.');
    }
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    where.appointmentDate = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      patient: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      slot: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: [
      { appointmentDate: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return appointments.map((apt) => ({
    id: apt.id,
    appointmentNumber: apt.appointmentNumber,
    appointmentDate: apt.appointmentDate,
    startTime: apt.slot?.startTime || 'N/A',
    endTime: apt.slot?.endTime || 'N/A',
    priority: apt.priority,
    status: apt.status,
    reason: apt.reason || 'General Consultation',
    notes: apt.notes || '',
    createdAt: apt.createdAt,
    doctor: {
      id: apt.doctor.id,
      name: apt.doctor.user.name,
      email: apt.doctor.user.email,
      specialization: apt.doctor.specialization,
      department: apt.doctor.department,
      roomNumber: apt.doctor.roomNumber || 'N/A',
    },
    patient: {
      id: apt.patient.id,
      name: apt.patient.user.name,
      email: apt.patient.user.email,
      phone: apt.patient.user.phone || 'N/A',
      bloodGroup: apt.patient.bloodGroup || 'N/A',
    },
  }));
};

/**
 * 6. Get Waitlist Entries for Admin Monitoring
 * Returns waitlist records sorted by priority score (descending) for intelligent triage.
 */
const getWaitlistEntries = async ({ status, doctorId } = {}) => {
  const where = {};

  if (status && status !== 'ALL') {
    const normalizedStatus = status.toUpperCase();
    if (!VALID_WAITLIST_STATUSES.includes(normalizedStatus)) {
      throw new Error(
        `Invalid waitlist status '${status}'. Allowed values: ${VALID_WAITLIST_STATUSES.join(', ')}`
      );
    }
    where.status = normalizedStatus;
  }

  if (doctorId && doctorId !== 'ALL') {
    where.doctorId = doctorId;
  }

  // Active entries are sorted by priority score descending, then by creation date ascending (FIFO tie-breaker)
  const entries = await prisma.waitlist.findMany({
    where,
    include: {
      doctor: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      patient: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
    orderBy: [
      { priorityScore: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  const now = new Date();
  const scoredEntries = entries.map((entry) => {
    const currentScore = calculatePriorityScore({
      priority: entry.priority,
      urgency: entry.urgency,
      createdAt: entry.createdAt,
      now,
    });
    const explanation = explainScore({
      priority: entry.priority,
      urgency: entry.urgency,
      createdAt: entry.createdAt,
      now,
    });

    return {
      id: entry.id,
      patientId: entry.patientId,
      patientName: entry.patient?.user?.name || 'Unknown Patient',
      patientEmail: entry.patient?.user?.email || 'N/A',
      patientPhone: entry.patient?.user?.phone || 'N/A',
      doctorId: entry.doctorId,
      doctorName: entry.doctor?.user?.name || 'Unknown Doctor',
      specialization: entry.doctor?.specialization || 'General',
      department: entry.doctor?.department || 'General Medicine',
      preferredDate: entry.preferredDate,
      medicalPriority: entry.priority,
      urgency: entry.urgency,
      priorityScore: currentScore,
      explanation,
      status: entry.status,
      notes: entry.notes || '',
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  });

  // Sort: PENDING first (by priority score DESC, then creation date ASC), then historical
  scoredEntries.sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return scoredEntries;
};

module.exports = {
  getHospitalStats,
  getAllDoctors,
  getDoctorDetails,
  getAllPatients,
  getAllAppointments,
  getWaitlistEntries,
};

