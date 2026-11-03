const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for MediFlow AI...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning existing records...');
  await prisma.waitlist.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.user.deleteMany();

  // ---------------------------------------------------------------------------
  // 2. Seed Users
  // ---------------------------------------------------------------------------
  console.log('👤 Seeding Users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@mediflow.com',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '+91 98765 43210',
    },
  });

  // Doctor User 1: Dr. Rajesh Sharma
  const doctorUser1 = await prisma.user.create({
    data: {
      name: 'Dr. Rajesh Sharma',
      email: 'dr.sharma@mediflow.com',
      password: hashedPassword,
      role: 'DOCTOR',
      phone: '+91 98111 22334',
    },
  });

  // Doctor User 2: Dr. Ananya Patel
  const doctorUser2 = await prisma.user.create({
    data: {
      name: 'Dr. Ananya Patel',
      email: 'dr.patel@mediflow.com',
      password: hashedPassword,
      role: 'DOCTOR',
      phone: '+91 98222 33445',
    },
  });

  // Patient User 1: Rahul Verma
  const patientUser1 = await prisma.user.create({
    data: {
      name: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      password: hashedPassword,
      role: 'PATIENT',
      phone: '+91 98333 44556',
    },
  });

  // Patient User 2: Priya Singh
  const patientUser2 = await prisma.user.create({
    data: {
      name: 'Priya Singh',
      email: 'priya.singh@example.com',
      password: hashedPassword,
      role: 'PATIENT',
      phone: '+91 98444 55667',
    },
  });

  // Patient User 3: Amit Sharma
  const patientUser3 = await prisma.user.create({
    data: {
      name: 'Amit Sharma',
      email: 'amit.sharma@example.com',
      password: hashedPassword,
      role: 'PATIENT',
      phone: '+91 98555 66778',
    },
  });

  // ---------------------------------------------------------------------------
  // 3. Seed Doctors
  // ---------------------------------------------------------------------------
  console.log('🩺 Seeding Doctors...');

  const doctor1 = await prisma.doctor.create({
    data: {
      userId: doctorUser1.id,
      specialization: 'Cardiologist',
      department: 'Cardiology',
      experience: 12,
      qualification: 'MBBS, MD (Cardiology)',
      consultationFee: 800.0,
      roomNumber: 'Room 101',
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      userId: doctorUser2.id,
      specialization: 'Neurologist',
      department: 'Neurology',
      experience: 8,
      qualification: 'MBBS, DM (Neurology)',
      consultationFee: 1000.0,
      roomNumber: 'Room 204',
    },
  });

  // ---------------------------------------------------------------------------
  // 4. Seed Patients
  // ---------------------------------------------------------------------------
  console.log('🧑‍⚕️ Seeding Patients...');

  const patient1 = await prisma.patient.create({
    data: {
      userId: patientUser1.id,
      dateOfBirth: new Date('1990-05-15'),
      gender: 'MALE',
      bloodGroup: 'B+',
      address: '24 MG Road, New Delhi',
      emergencyContact: '+91 98999 11223',
      medicalHistory: 'Hypertension diagnosed in 2021',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      userId: patientUser2.id,
      dateOfBirth: new Date('1995-11-20'),
      gender: 'FEMALE',
      bloodGroup: 'O+',
      address: '15 Park Street, Kolkata',
      emergencyContact: '+91 98888 22334',
      medicalHistory: 'Frequent migraine episodes',
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      userId: patientUser3.id,
      dateOfBirth: new Date('1988-03-10'),
      gender: 'MALE',
      bloodGroup: 'A+',
      address: '88 Brigade Road, Bengaluru',
      emergencyContact: '+91 98777 33445',
      medicalHistory: 'Mild asthma, no prior heart conditions',
    },
  });

  // ---------------------------------------------------------------------------
  // 5. Seed Doctor Availability
  // ---------------------------------------------------------------------------
  console.log('📅 Seeding Doctor Availabilities...');

  await prisma.doctorAvailability.createMany({
    data: [
      {
        doctorId: doctor1.id,
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
        presenceStatus: 'AVAILABLE',
      },
      {
        doctorId: doctor1.id,
        dayOfWeek: 'WEDNESDAY',
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
        presenceStatus: 'AVAILABLE',
      },
      {
        doctorId: doctor1.id,
        dayOfWeek: 'FRIDAY',
        startTime: '09:00',
        endTime: '13:00',
        isAvailable: true,
        presenceStatus: 'AVAILABLE',
      },
      {
        doctorId: doctor2.id,
        dayOfWeek: 'TUESDAY',
        startTime: '10:00',
        endTime: '16:00',
        isAvailable: true,
        presenceStatus: 'AVAILABLE',
      },
      {
        doctorId: doctor2.id,
        dayOfWeek: 'THURSDAY',
        startTime: '10:00',
        endTime: '16:00',
        isAvailable: true,
        presenceStatus: 'AVAILABLE',
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // 6. Seed Appointment Slots
  // ---------------------------------------------------------------------------
  console.log('⏰ Seeding Appointment Slots...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slot1 = await prisma.appointmentSlot.create({
    data: {
      doctorId: doctor1.id,
      slotDate: today,
      startTime: '09:00',
      endTime: '09:30',
      status: 'BOOKED',
    },
  });

  const slot2 = await prisma.appointmentSlot.create({
    data: {
      doctorId: doctor1.id,
      slotDate: today,
      startTime: '09:30',
      endTime: '10:00',
      status: 'AVAILABLE',
    },
  });

  const slot3 = await prisma.appointmentSlot.create({
    data: {
      doctorId: doctor1.id,
      slotDate: today,
      startTime: '10:00',
      endTime: '10:30',
      status: 'AVAILABLE',
    },
  });

  const slot4 = await prisma.appointmentSlot.create({
    data: {
      doctorId: doctor2.id,
      slotDate: today,
      startTime: '10:00',
      endTime: '10:30',
      status: 'BOOKED',
    },
  });

  const slot5 = await prisma.appointmentSlot.create({
    data: {
      doctorId: doctor2.id,
      slotDate: today,
      startTime: '10:30',
      endTime: '11:00',
      status: 'AVAILABLE',
    },
  });

  // ---------------------------------------------------------------------------
  // 7. Seed Appointments
  // ---------------------------------------------------------------------------
  console.log('📋 Seeding Appointments...');

  const appointment1 = await prisma.appointment.create({
    data: {
      appointmentNumber: 'APT-20261031-001',
      patientId: patient1.id,
      doctorId: doctor1.id,
      slotId: slot1.id,
      appointmentDate: today,
      priority: 'HIGH',
      status: 'CONFIRMED',
      reason: 'Routine cardiac checkup and blood pressure review',
      notes: 'Patient advised to bring ECG reports from last month',
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      appointmentNumber: 'APT-20261031-002',
      patientId: patient2.id,
      doctorId: doctor2.id,
      slotId: slot4.id,
      appointmentDate: today,
      priority: 'MEDIUM',
      status: 'SCHEDULED',
      reason: 'Persistent headache and neurological assessment',
      notes: 'Initial consultation',
    },
  });

  // ---------------------------------------------------------------------------
  // 8. Seed Waitlist
  // ---------------------------------------------------------------------------
  console.log('⏳ Seeding Waitlist...');

  const waitlistEntry = await prisma.waitlist.create({
    data: {
      patientId: patient3.id,
      doctorId: doctor1.id,
      preferredDate: today,
      priority: 'HIGH',
      urgency: 'HIGH',
      priorityScore: 85,
      status: 'PENDING',
      notes: 'Requires early cardiology slot if any existing appointment cancels',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log({
    usersCount: await prisma.user.count(),
    doctorsCount: await prisma.doctor.count(),
    patientsCount: await prisma.patient.count(),
    availabilitiesCount: await prisma.doctorAvailability.count(),
    slotsCount: await prisma.appointmentSlot.count(),
    appointmentsCount: await prisma.appointment.count(),
    waitlistCount: await prisma.waitlist.count(),
  });
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

