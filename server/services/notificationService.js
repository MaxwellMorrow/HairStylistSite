const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cron = require('node-cron');
const { Appointment, User } = require('../models');
const moment = require('moment');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.twilioClient = null;
    this.initializeServices();
  }

  initializeServices() {
    // Initialize email service
    if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE, // 'gmail', 'outlook', etc.
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      console.log('Email service initialized successfully');
    } else {
      console.log('Email service not configured - skipping email notifications');
    }

    // Initialize SMS service (optional)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('SMS service initialized successfully');
      } catch (error) {
        console.log('SMS service configuration error - SMS notifications disabled:', error.message);
        this.twilioClient = null;
      }
    } else {
      console.log('SMS service not configured - SMS notifications disabled');
    }

    // Schedule reminder jobs
    this.scheduleReminders();
  }

  // Email notification methods
  async sendEmail(to, subject, htmlContent, textContent = '', logLabel = '') {
    if (!this.emailTransporter) {
      console.log('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`[EMAIL SENT] Type: ${logLabel} | To: ${to} | Subject: ${subject} | MessageID: ${result.messageId}`);
      return true;
    } catch (error) {
      console.error(`[EMAIL ERROR] Type: ${logLabel} | To: ${to} | Subject: ${subject} | Error:`, error);
      return false;
    }
  }

  // SMS notification methods
  async sendSMS(to, message) {
    if (!this.twilioClient) {
      console.log('SMS service not configured - skipping SMS notification');
      return false;
    }

    if (!to || !message) {
      console.log('SMS notification skipped - missing recipient or message');
      return false;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });
      console.log('SMS sent successfully:', result.sid);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error.message);
      // Don't throw error, just return false to indicate failure
      return false;
    }
  }

  // Appointment booking notifications
  async notifyNewAppointment(appointment) {
    const client = await User.findById(appointment.client);
    await appointment.populate('service');
    const service = appointment.service;

    // Generate a secure random token for admin confirmation
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    appointment.confirmationToken = hashedToken;
    appointment.confirmationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    await appointment.save();

    // Notify admin/stylist (pass rawToken for email link)
    await this.notifyAdminNewAppointment(appointment, client, service, rawToken);
    
    // Notify client
    await this.notifyClientAppointmentConfirmation(appointment, client, service);
  }

  async notifyAdminNewAppointment(appointment, client, service, rawToken) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPhone = process.env.ADMIN_PHONE;

    const appointmentDate = moment(appointment.date).format('dddd, MMMM Do YYYY');
    const appointmentTime = moment(appointment.startTime, 'HH:mm').format('h:mm A');

    // Email notification
    if (adminEmail) {
      const emailSubject = `New Appointment Request - ${client.name}`;
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const confirmLink = `${baseUrl}/api/appointments/confirm/${appointment._id}?token=${rawToken}`;
      const emailHtml = `
        <h2>New Appointment Request</h2>
        <p><strong>Client:</strong> ${client.name}</p>
        <p><strong>Email:</strong> ${client.email}</p>
        <p><strong>Phone:</strong> ${client.phone || 'Not provided'}</p>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Duration:</strong> ${service.duration} minutes</p>
        <p><strong>Total Cost:</strong> $${appointment.totalCost}</p>
        ${appointment.clientNotes ? `<p><strong>Client Notes:</strong> ${appointment.clientNotes}</p>` : ''}
        ${appointment.inspoPhotos && appointment.inspoPhotos.length > 0 ? 
          `<p><strong>Inspiration Photos:</strong> ${appointment.inspoPhotos.length} uploaded</p>` : ''}
        <div style="margin: 30px 0;">
          <a href="${confirmLink}" style="display:inline-block;padding:12px 24px;background:#4CAF50;color:#fff;text-decoration:none;border-radius:5px;font-size:16px;">Confirm Appointment</a>
        </div>
        <p>Click the button above to confirm this appointment. The client will be notified upon confirmation.</p>
      `;

      await this.sendEmail(adminEmail, emailSubject, emailHtml, '', 'Admin Request');
    }

    // SMS notification (optional)
    if (adminPhone) {
      const smsMessage = `New appointment: ${client.name} - ${service.name} on ${appointmentDate} at ${appointmentTime}`;
      await this.sendSMS(adminPhone, smsMessage);
    }
  }

  async notifyClientAppointmentConfirmation(appointment, client, service) {
    const appointmentDate = moment(appointment.date).format('dddd, MMMM Do YYYY');
    const appointmentTime = moment(appointment.startTime, 'HH:mm').format('h:mm A');

    // Email notification (not a confirmation yet)
    const emailSubject = `Appointment Request Received - ${service.name}`;
    const emailHtml = `
      <h2>Appointment Request Received</h2>
      <p>Hi ${client.name},</p>
      <p>Your appointment request has been received. A stylist will review and confirm your appointment as soon as possible. You will receive a confirmation email once your appointment is confirmed.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Duration:</strong> ${service.duration} minutes</p>
        <p><strong>Total Cost:</strong> $${appointment.totalCost}</p>
        ${appointment.clientNotes ? `<p><strong>Your Notes:</strong> ${appointment.clientNotes}</p>` : ''}
      </div>
      <p>If you need to make any changes, please contact us as soon as possible.</p>
    `;

    await this.sendEmail(client.email, emailSubject, emailHtml, '', 'Client Confirmation');

    // SMS confirmation (optional)
    if (client.phone) {
      const smsMessage = `Appointment confirmed: ${service.name} on ${appointmentDate} at ${appointmentTime}. See you soon!`;
      await this.sendSMS(client.phone, smsMessage);
    }
  }

  async notifyClientAppointmentFinalConfirmation(appointment, client, service) {
    const appointmentDate = moment(appointment.date).format('dddd, MMMM Do YYYY');
    const appointmentTime = moment(appointment.startTime, 'HH:mm').format('h:mm A');
    const emailSubject = `Appointment Confirmed - ${service.name}`;
    const emailHtml = `
      <h2>Your Appointment is Confirmed!</h2>
      <p>Hi ${client.name},</p>
      <p>Your appointment has been confirmed. We look forward to seeing you!</p>
      <div style="background-color: #e6ffe6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Duration:</strong> ${service.duration} minutes</p>
        <p><strong>Total Cost:</strong> $${appointment.totalCost}</p>
        ${appointment.clientNotes ? `<p><strong>Your Notes:</strong> ${appointment.clientNotes}</p>` : ''}
      </div>
      <p>If you need to make any changes, please contact us as soon as possible.</p>
    `;
    await this.sendEmail(client.email, emailSubject, emailHtml, '', 'Client Final Confirmation');
    // Optionally, send SMS here as well
  }

  // Appointment reminder notifications
  async sendAppointmentReminders() {
    const tomorrow = moment().add(1, 'day').startOf('day');
    const dayAfterTomorrow = moment().add(2, 'day').startOf('day');

    // Get appointments for tomorrow and day after tomorrow
    const upcomingAppointments = await Appointment.find({
      date: {
        $gte: tomorrow.toDate(),
        $lt: dayAfterTomorrow.toDate()
      },
      status: { $in: ['pending', 'confirmed'] },
      reminderSent: false
    }).populate('client service');

    for (const appointment of upcomingAppointments) {
      const appointmentDate = moment(appointment.date).format('dddd, MMMM Do YYYY');
      const appointmentTime = moment(appointment.startTime, 'HH:mm').format('h:mm A');
      const daysUntil = moment(appointment.date).diff(moment(), 'days');

      // Send reminder to client
      await this.sendAppointmentReminderToClient(appointment, daysUntil, appointmentDate, appointmentTime);

      // Mark reminder as sent
      appointment.reminderSent = true;
      await appointment.save();
    }
  }

  async sendAppointmentReminderToClient(appointment, daysUntil, appointmentDate, appointmentTime) {
    const client = appointment.client;
    const service = appointment.service;

    const dayText = daysUntil === 0 ? 'tomorrow' : `in ${daysUntil} days`;

    // Email reminder
    const emailSubject = `Appointment Reminder - ${service.name}`;
    const emailHtml = `
      <h2>Appointment Reminder</h2>
      <p>Hi ${client.name},</p>
      <p>This is a friendly reminder about your upcoming appointment ${dayText}.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Duration:</strong> ${service.duration} minutes</p>
        <p><strong>Total Cost:</strong> $${appointment.totalCost}</p>
      </div>
      <p>Please arrive 10 minutes before your scheduled time.</p>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
      <p>We look forward to seeing you!</p>
    `;

    await this.sendEmail(client.email, emailSubject, emailHtml);

    // SMS reminder (optional)
    if (client.phone) {
      const smsMessage = `Reminder: Your ${service.name} appointment is ${dayText} at ${appointmentTime}. Please arrive 10 minutes early.`;
      await this.sendSMS(client.phone, smsMessage);
    }
  }

  // Schedule reminder jobs
  scheduleReminders() {
    // Send reminders daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('Running daily appointment reminders...');
      await this.sendAppointmentReminders();
    });

    // Send same-day reminders at 8 AM
    cron.schedule('0 8 * * *', async () => {
      console.log('Running same-day appointment reminders...');
      await this.sendSameDayReminders();
    });
  }

  async sendSameDayReminders() {
    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'day').startOf('day');

    const todayAppointments = await Appointment.find({
      date: {
        $gte: today.toDate(),
        $lt: tomorrow.toDate()
      },
      status: { $in: ['pending', 'confirmed'] },
      sameDayReminderSent: { $ne: true }
    }).populate('client service');

    for (const appointment of todayAppointments) {
      const appointmentTime = moment(appointment.startTime, 'HH:mm').format('h:mm A');
      const client = appointment.client;
      const service = appointment.service;

      // SMS reminder for same-day appointments (optional)
      if (client.phone) {
        const smsMessage = `Today's appointment reminder: ${service.name} at ${appointmentTime}. See you soon!`;
        await this.sendSMS(client.phone, smsMessage);
      }

      // Mark same-day reminder as sent
      appointment.sameDayReminderSent = true;
      await appointment.save();
    }
  }

  // Appointment cancellation notifications
  async notifyAppointmentCancellation(appointment, cancelledBy = 'client') {
    const client = await User.findById(appointment.client);
    const service = await appointment.populate('service');
    
    const appointmentDate = moment(appointment.date).format('dddd, MMMM Do YYYY');
    const appointmentTime = moment(appointment.startTime, 'HH:mm').format('h:mm A');

    // Notify admin
    await this.notifyAdminCancellation(appointment, client, service, cancelledBy, appointmentDate, appointmentTime);
    
    // Notify client
    await this.notifyClientCancellation(appointment, client, service, appointmentDate, appointmentTime);
  }

  async notifyAdminCancellation(appointment, client, service, cancelledBy, appointmentDate, appointmentTime) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPhone = process.env.ADMIN_PHONE;

    if (adminEmail) {
      const emailSubject = `Appointment Cancelled - ${client.name}`;
      const emailHtml = `
        <h2>Appointment Cancelled</h2>
        <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
        <p><strong>Client:</strong> ${client.name}</p>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
      `;

      await this.sendEmail(adminEmail, emailSubject, emailHtml);
    }

    // SMS notification (optional)
    if (adminPhone) {
      const smsMessage = `Appointment cancelled: ${client.name} - ${service.name} on ${appointmentDate}`;
      await this.sendSMS(adminPhone, smsMessage);
    }
  }

  async notifyClientCancellation(appointment, client, service, appointmentDate, appointmentTime) {
    const emailSubject = `Appointment Cancellation Confirmation`;
    const emailHtml = `
      <h2>Appointment Cancellation Confirmation</h2>
      <p>Hi ${client.name},</p>
      <p>Your appointment has been cancelled as requested.</p>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Cancelled Appointment Details</h3>
        <p><strong>Service:</strong> ${service.name}</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
      </div>
      <p>If you'd like to reschedule, please visit our booking page or contact us directly.</p>
      <p>Thank you for your understanding.</p>
    `;

    await this.sendEmail(client.email, emailSubject, emailHtml);

    // SMS notification (optional)
    if (client.phone) {
      const smsMessage = `Your appointment for ${service.name} on ${appointmentDate} has been cancelled. Contact us to reschedule.`;
      await this.sendSMS(client.phone, smsMessage);
    }
  }
}

module.exports = new NotificationService(); 