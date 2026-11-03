const nodemailer = require('nodemailer');

/**
 * Hospital Notification Email Service
 * Sends transactional notifications using Nodemailer with SMTP credentials or verifiable Ethereal testing.
 * Strictly avoids exposing confidential medical diagnosis in notification bodies.
 */

let cachedTransporter = null;

const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransporter;
  }

  // Fallback: Verifiable real test account via Ethereal.email (Standard for development)
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('✉️ Initialized Ethereal test mailer for development:', testAccount.user);
    return cachedTransporter;
  } catch (err) {
    console.warn('Ethereal test mailer creation warning:', err.message);
    // Neutral fallback
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
};

const FROM_HEADER =
  process.env.SMTP_FROM || '"MediFlow AI Hospital" <notifications@mediflow.com>';

/**
 * Generic mail sender wrapper with preview tracking
 */
const sendMail = async ({ to, subject, html, text }) => {
  if (!to) return null;
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: FROM_HEADER,
      to,
      subject,
      text,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ Email delivered to [${to}] Preview URL: ${previewUrl}`);
    } else {
      console.log(`✉️ Email delivered to [${to}] MessageId: ${info.messageId}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    console.error('Email delivery error:', err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 1. Booking Confirmation Notification
 */
const sendBookingConfirmationEmail = async ({
  to,
  patientName,
  appointmentNumber,
  doctorName,
  date,
  time,
  cabin,
}) => {
  const subject = `Confirmed: Appointment ${appointmentNumber} at MediFlow AI Hospital`;
  const text = `Dear ${patientName},\n\nYour consultation with ${doctorName} has been confirmed for ${date} at ${time}.\nLocation: ${cabin || 'OPD Consulting Suite'}\nAppointment Token: ${appointmentNumber}\n\nPlease arrive 10 minutes early with your digital check-in QR code.\n\nWarm regards,\nMediFlow AI Clinical Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
      <div style="background-color: #1e40af; color: white; padding: 16px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0;">MediFlow AI Hospital</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Smart OPD Consultation Confirmation</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your doctor consultation has been scheduled and confirmed:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #1e40af; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 4px 0;"><strong>Consultation Slot:</strong> ${time}</p>
          <p style="margin: 4px 0;"><strong>Cabin / Room:</strong> ${cabin || 'Room 101'}</p>
          <p style="margin: 4px 0;"><strong>Appointment Token:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${appointmentNumber}</code></p>
        </div>
        <p style="font-size: 13px; color: #64748b;">You can view and scan your digital check-in QR pass directly from your MediFlow Patient Dashboard upon arrival.</p>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        MediFlow AI &copy; Smart Hospital Appointment &amp; Availability System
      </div>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

/**
 * 2. Rescheduling Notification
 */
const sendRescheduleEmail = async ({
  to,
  patientName,
  appointmentNumber,
  doctorName,
  oldDate,
  oldTime,
  newDate,
  newTime,
  cabin,
  reason,
}) => {
  const subject = `Rescheduled: Appointment ${appointmentNumber} at MediFlow AI Hospital`;
  const text = `Dear ${patientName},\n\nYour appointment with ${doctorName} has been rescheduled from ${oldDate} ${oldTime} to ${newDate} at ${newTime}.\nLocation: ${cabin || 'Room 101'}\nToken: ${appointmentNumber}\n${reason ? `Reason: ${reason}\n` : ''}\nWarm regards,\nMediFlow AI Clinical Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="background-color: #4338ca; color: white; padding: 16px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0;">MediFlow AI Hospital</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Appointment Rescheduled</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your appointment has been successfully moved to your requested time slot:</p>
        <div style="background-color: #eef2ff; padding: 15px; border-radius: 8px; border-left: 4px solid #4338ca; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 4px 0; color: #991b1b; text-decoration: line-through;"><strong>Previous Slot:</strong> ${oldDate} at ${oldTime}</p>
          <p style="margin: 4px 0; color: #1e1b4b; font-size: 14px;"><strong>New Slot:</strong> ${newDate} at ${newTime}</p>
          <p style="margin: 4px 0;"><strong>Cabin / Room:</strong> ${cabin || 'Room 101'}</p>
          <p style="margin: 4px 0;"><strong>Token:</strong> <code>${appointmentNumber}</code></p>
          ${reason ? `<p style="margin: 4px 0; font-size: 12px; color: #4b5563;"><em>Note: ${reason}</em></p>` : ''}
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        MediFlow AI &copy; Smart Hospital Appointment System
      </div>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

/**
 * 3. Cancellation Notification
 */
const sendCancellationEmail = async ({
  to,
  patientName,
  appointmentNumber,
  doctorName,
  date,
  time,
}) => {
  const subject = `Cancelled: Appointment ${appointmentNumber} at MediFlow AI Hospital`;
  const text = `Dear ${patientName},\n\nYour appointment (${appointmentNumber}) with ${doctorName} on ${date} at ${time} has been cancelled.\nThe slot has been returned to the outpatient availability pool.\n\nWarm regards,\nMediFlow AI Clinical Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 12px;">
      <div style="background-color: #b91c1c; color: white; padding: 16px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0;">MediFlow AI Hospital</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Consultation Cancellation Notice</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your appointment has been cancelled as requested:</p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #b91c1c; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 4px 0;"><strong>Cancelled Date &amp; Time:</strong> ${date} at ${time}</p>
          <p style="margin: 4px 0;"><strong>Appointment Token:</strong> ${appointmentNumber}</p>
        </div>
        <p style="font-size: 13px; color: #4b5563;">If you need to book another visit, please log into your patient portal.</p>
      </div>
      <div style="border-top: 1px solid #fee2e2; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        MediFlow AI &copy; Smart Hospital Appointment System
      </div>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

/**
 * 4. Check-in Confirmation Notification
 */
const sendCheckInEmail = async ({
  to,
  patientName,
  appointmentNumber,
  doctorName,
  cabin,
  queuePosition,
}) => {
  const subject = `Checked In: Token ${appointmentNumber} — Queue Position #${queuePosition}`;
  const text = `Dear ${patientName},\n\nYou have checked in successfully for your visit with ${doctorName}.\nYour Queue Position: #${queuePosition}\nLocation: ${cabin || 'Room 101'}\nToken: ${appointmentNumber}\n\nPlease take a seat in the waiting hall. You will be called shortly.\n\nWarm regards,\nMediFlow AI Reception`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #d1fae5; border-radius: 12px;">
      <div style="background-color: #047857; color: white; padding: 16px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0;">MediFlow AI Hospital</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">OPD Clinic Check-in Confirmed</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>Your arrival has been recorded at the clinic reception desk:</p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #047857; margin: 15px 0;">
          <p style="margin: 4px 0; font-size: 16px;"><strong>Live Queue Position:</strong> <span style="color: #047857; font-size: 20px; font-weight: bold;">#${queuePosition}</span></p>
          <p style="margin: 4px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 4px 0;"><strong>Cabin / Room:</strong> ${cabin || 'Room 101'}</p>
          <p style="margin: 4px 0;"><strong>Token:</strong> <code>${appointmentNumber}</code></p>
        </div>
        <p style="font-size: 13px; color: #4b5563;">Please proceed to the designated waiting area. Watch the digital display board for your token.</p>
      </div>
      <div style="border-top: 1px solid #d1fae5; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        MediFlow AI &copy; Smart Hospital Appointment System
      </div>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

/**
 * 5. Appointment Reminder Notification
 */
const sendAppointmentReminderEmail = async ({
  to,
  patientName,
  appointmentNumber,
  doctorName,
  date,
  time,
  cabin,
}) => {
  const subject = `Reminder: Upcoming Consultation Tomorrow with ${doctorName}`;
  const text = `Dear ${patientName},\n\nThis is a friendly reminder of your appointment tomorrow with ${doctorName} at ${time}.\nLocation: ${cabin || 'Room 101'}\nToken: ${appointmentNumber}\n\nPlease have your check-in QR code ready upon arrival.\n\nWarm regards,\nMediFlow AI Clinical Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="background-color: #0284c7; color: white; padding: 16px; border-radius: 8px; text-align: center;">
        <h2 style="margin: 0;">MediFlow AI Hospital</h2>
        <p style="margin: 4px 0 0; font-size: 13px;">Upcoming Appointment Reminder</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patientName}</strong>,</p>
        <p>This is a reminder of your upcoming hospital consultation:</p>
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #0284c7; margin: 15px 0;">
          <p style="margin: 4px 0;"><strong>Doctor:</strong> ${doctorName}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
          <p style="margin: 4px 0;"><strong>Time Slot:</strong> ${time}</p>
          <p style="margin: 4px 0;"><strong>Cabin:</strong> ${cabin || 'Room 101'}</p>
          <p style="margin: 4px 0;"><strong>Token:</strong> <code>${appointmentNumber}</code></p>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
        MediFlow AI &copy; Smart Hospital Appointment System
      </div>
    </div>
  `;
  return sendMail({ to, subject, text, html });
};

module.exports = {
  sendBookingConfirmationEmail,
  sendRescheduleEmail,
  sendCancellationEmail,
  sendCheckInEmail,
  sendAppointmentReminderEmail,
};

