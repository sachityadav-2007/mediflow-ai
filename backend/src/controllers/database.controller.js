const prisma = require('../config/db');

// Controller to test reading sample records from PostgreSQL
const getDatabaseOverview = async (req, res) => {
  try {
    // 1. Fetch counts for all 7 models
    const [
      userCount,
      doctorCount,
      patientCount,
      availabilityCount,
      slotCount,
      appointmentCount,
      waitlistCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.doctorAvailability.count(),
      prisma.appointmentSlot.count(),
      prisma.appointment.count(),
      prisma.waitlist.count(),
    ]);

    // 2. Fetch sample doctors with linked user details & availability
    const sampleDoctors = await prisma.doctor.findMany({
      include: {
        user: {
          select: { name: true, email: true, phone: true },
        },
        availabilities: true,
      },
      take: 2,
    });

    // 3. Fetch sample appointments with linked patient & doctor details
    const sampleAppointments = await prisma.appointment.findMany({
      include: {
        patient: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        doctor: {
          include: {
            user: { select: { name: true } },
          },
        },
        slot: true,
      },
      take: 2,
    });

    // 4. Return success response with sample data
    res.status(200).json({
      success: true,
      message: 'PostgreSQL database read test successful',
      counts: {
        users: userCount,
        doctors: doctorCount,
        patients: patientCount,
        doctorAvailabilities: availabilityCount,
        appointmentSlots: slotCount,
        appointments: appointmentCount,
        waitlists: waitlistCount,
      },
      sampleData: {
        doctors: sampleDoctors,
        appointments: sampleAppointments,
      },
    });
  } catch (error) {
    console.error('Database read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read records from database',
      error: error.message,
    });
  }
};

module.exports = {
  getDatabaseOverview,
};

