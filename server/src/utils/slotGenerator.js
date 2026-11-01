/**
 * Utility: slotGenerator.js
 * Generates discrete time slots for doctor appointments based on working hours
 * and consultation duration.
 */

// Mapping JavaScript getDay() (0 = Sunday) to Prisma DayOfWeek enum
const DAYS_OF_WEEK = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Convert a "HH:MM" 24-hour time string into total minutes from midnight.
 * Example: "09:30" -> (9 * 60) + 30 = 570 minutes
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Convert total minutes from midnight back into a 24-hour "HH:MM" string.
 * Example: 570 minutes -> "09:30"
 */
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Get the uppercase DayOfWeek enum string from a Date object or date string.
 * Example: "2026-11-02" -> "MONDAY"
 */
function getDayOfWeekFromDate(dateInput) {
  // Parse date string carefully to avoid timezone shifting
  let date;
  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const [year, month, day] = dateInput.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateInput);
  }
  const dayIndex = date.getDay();
  return DAYS_OF_WEEK[dayIndex];
}

/**
 * Generates consecutive non-overlapping time slots.
 * Example:
 *   startTime = "09:00", endTime = "11:00", duration = 30
 * Returns:
 *   [
 *     { startTime: "09:00", endTime: "09:30" },
 *     { startTime: "09:30", endTime: "10:00" },
 *     { startTime: "10:00", endTime: "10:30" },
 *     { startTime: "10:30", endTime: "11:00" }
 *   ]
 */
function generateTimeSlots(startTime, endTime, duration = 30) {
  const slots = [];
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const slotDuration = parseInt(duration, 10) || 30;

  // Validate start is before end and duration is positive
  if (startMin >= endMin || slotDuration <= 0) {
    return slots;
  }

  let currentMin = startMin;
  while (currentMin + slotDuration <= endMin) {
    const slotStart = minutesToTime(currentMin);
    const slotEnd = minutesToTime(currentMin + slotDuration);

    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
    });

    currentMin += slotDuration;
  }

  return slots;
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  getDayOfWeekFromDate,
  generateTimeSlots,
  DAYS_OF_WEEK,
};

