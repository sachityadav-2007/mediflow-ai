const prisma = require('../../config/db');

/**
 * Appointment Demand Forecasting Engine
 * Aggregates historical appointment density across days of week, time slots, and medical departments
 * using empirical moving averages and statistical distributions.
 */

const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const STANDARD_TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
];

/**
 * Forecast appointment demand across departments
 * @param {string} [departmentFilter] - Optional filter for specific department
 */
const getDepartmentDemand = async (departmentFilter = null) => {
  const whereClause = {};
  if (departmentFilter) {
    whereClause.doctor = {
      department: {
        equals: departmentFilter,
        mode: 'insensitive',
      },
    };
  }

  const allAppointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      doctor: {
        select: {
          id: true,
          department: true,
          specialization: true,
        },
      },
    },
  });

  const totalCount = allAppointments.length;
  const deptMap = {};

  for (const appt of allAppointments) {
    const dept = appt.doctor?.department || 'General Medicine';
    if (!deptMap[dept]) {
      deptMap[dept] = {
        department: dept,
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
      };
    }
    deptMap[dept].totalBookings++;
    if (['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'].includes(appt.status)) {
      deptMap[dept].activeBookings++;
    } else if (appt.status === 'COMPLETED') {
      deptMap[dept].completedBookings++;
    } else if (appt.status === 'CANCELLED') {
      deptMap[dept].cancelledBookings++;
    }
  }

  // If no historical appointments yet, populate defaults from existing registered doctors
  if (Object.keys(deptMap).length === 0) {
    const activeDoctors = await prisma.doctor.findMany({
      select: { department: true },
    });
    const uniqueDepts = [...new Set(activeDoctors.map((d) => d.department))];
    for (const d of uniqueDepts) {
      deptMap[d] = {
        department: d,
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
      };
    }
  }

  const departmentBreakdown = Object.values(deptMap).map((item) => {
    const sharePercentage =
      totalCount > 0
        ? Number(((item.totalBookings / totalCount) * 100).toFixed(1))
        : 0;
    const cancellationRate =
      item.totalBookings > 0
        ? Number(((item.cancelledBookings / item.totalBookings) * 100).toFixed(1))
        : 0;

    let demandLevel = 'LOW';
    if (sharePercentage >= 35) demandLevel = 'HIGH';
    else if (sharePercentage >= 15) demandLevel = 'MEDIUM';

    return {
      ...item,
      sharePercentage,
      cancellationRate,
      demandLevel,
    };
  });

  // Sort descending by totalBookings
  departmentBreakdown.sort((a, b) => b.totalBookings - a.totalBookings);

  return {
    totalHistoricalBookings: totalCount,
    departmentBreakdown,
  };
};

/**
 * Compute historical hourly/slot demand pattern
 * @param {string} [doctorId]
 * @param {string} [department]
 */
const getSlotDemandPatterns = async (doctorId = null, department = null) => {
  const where = {};
  if (doctorId) where.doctorId = doctorId;
  if (department) {
    where.doctor = {
      department: { equals: department, mode: 'insensitive' },
    };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      slot: { select: { startTime: true } },
    },
  });

  const slotCounts = {};
  for (const s of STANDARD_TIME_SLOTS) {
    slotCounts[s] = 0;
  }

  for (const appt of appointments) {
    const time = appt.slot?.startTime;
    if (time && slotCounts[time] !== undefined) {
      slotCounts[time]++;
    }
  }

  const maxSlotBookings = Math.max(1, ...Object.values(slotCounts));

  const slotPatterns = STANDARD_TIME_SLOTS.map((slot) => {
    const count = slotCounts[slot] || 0;
    const loadRatio = Number((count / maxSlotBookings).toFixed(2));
    const isPeak = loadRatio >= 0.70;

    let density = 'OFF_PEAK';
    if (loadRatio >= 0.70) density = 'PEAK / HIGH_DEMAND';
    else if (loadRatio >= 0.40) density = 'MODERATE';

    return {
      slotTime: slot,
      historicalBookings: count,
      loadRatio,
      density,
      isPeak,
    };
  });

  const peakSlots = slotPatterns
    .filter((s) => s.isPeak || s.loadRatio >= 0.50)
    .map((s) => s.slotTime);

  return {
    sampleCount: appointments.length,
    slotPatterns,
    peakSlots: peakSlots.length > 0 ? peakSlots : ['10:00', '10:30', '11:00'],
  };
};

/**
 * 7-Day Rolling Demand Forecast
 * Predicts expected daily patient visits for the next 7 days based on day-of-week averages
 * @param {string} [department]
 * @param {string} [doctorId]
 */
const getSevenDayDemandForecast = async (department = null, doctorId = null) => {
  const where = {};
  if (doctorId) where.doctorId = doctorId;
  if (department) {
    where.doctor = {
      department: { equals: department, mode: 'insensitive' },
    };
  }

  // Fetch all historical appointments
  const allAppointments = await prisma.appointment.findMany({
    where,
    select: {
      appointmentDate: true,
      status: true,
    },
  });

  // Calculate day of week frequency
  const dayStats = {};
  for (const d of DAYS_OF_WEEK) {
    dayStats[d] = { count: 0, distinctDates: new Set() };
  }

  for (const a of allAppointments) {
    const date = new Date(a.appointmentDate);
    const dayName = DAYS_OF_WEEK[date.getUTCDay()];
    const dateKey = date.toISOString().split('T')[0];
    dayStats[dayName].count++;
    dayStats[dayName].distinctDates.add(dateKey);
  }

  // Calculate daily average per day of week
  const dayAverages = {};
  for (const d of DAYS_OF_WEEK) {
    const numDates = dayStats[d].distinctDates.size;
    dayAverages[d] =
      numDates > 0
        ? Number((dayStats[d].count / numDates).toFixed(1))
        : 1.5; // Baseline expected appointments if no data
  }

  // Generate next 7 days projections
  const forecast = [];
  const today = new Date();
  let expectedTotal = 0;

  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);

    const dateStr = futureDate.toISOString().split('T')[0];
    const dayOfWeek = DAYS_OF_WEEK[futureDate.getDay()];
    const baseExpected = dayAverages[dayOfWeek] || 2;

    // Slight weekend variance
    const isWeekend = dayOfWeek === 'SATURDAY' || dayOfWeek === 'SUNDAY';
    const expectedPatients = isWeekend
      ? Math.max(1, Math.round(baseExpected * 0.7))
      : Math.max(1, Math.round(baseExpected));

    expectedTotal += expectedPatients;

    let projectedLoad = 'MODERATE';
    if (expectedPatients >= 8) projectedLoad = 'HEAVY';
    else if (expectedPatients <= 3) projectedLoad = 'LIGHT';

    forecast.push({
      date: dateStr,
      dayOfWeek,
      expectedDemand: expectedPatients,
      projectedLoad,
      isWeekend,
    });
  }

  const confidenceScore =
    allAppointments.length >= 20 ? 0.85 : allAppointments.length >= 5 ? 0.70 : 0.50;

  return {
    period: 'NEXT_7_DAYS',
    totalHistoricalDataPoints: allAppointments.length,
    confidenceScore,
    expectedTotalVolume: expectedTotal,
    dailyForecast: forecast,
  };
};

module.exports = {
  getDepartmentDemand,
  getSlotDemandPatterns,
  getSevenDayDemandForecast,
  STANDARD_TIME_SLOTS,
};

