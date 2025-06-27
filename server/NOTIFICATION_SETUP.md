# Notification System Setup

This hairstylist booking system includes automated email and SMS notifications for appointments. The SMS functionality is completely optional and the system will work perfectly without it.

## Required Setup (Email)

### 1. Email Service Configuration

Add these environment variables to your `.env` file:

```env
# Email Configuration (Required)
EMAIL_SERVICE=gmail  # or 'outlook', 'yahoo', etc.
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Admin Contact (Required for admin notifications)
ADMIN_EMAIL=admin@yourdomain.com
```

**Note:** For Gmail, you'll need to use an "App Password" instead of your regular password. Enable 2-factor authentication and generate an app password in your Google Account settings.

## Optional Setup (SMS)

### 2. SMS Service Configuration (Optional)

If you want SMS notifications, add these environment variables:

```env
# SMS Configuration (Optional - Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Admin Phone (Optional - for admin SMS notifications)
ADMIN_PHONE=+1234567890
```

**Important:** The system will work perfectly without SMS configuration. SMS notifications are completely optional.

## What Gets Notified

### Email Notifications (Always Active)
- ✅ New appointment bookings (client + admin)
- ✅ Appointment confirmations (client)
- ✅ Appointment reminders (24h and 2h before)
- ✅ Same-day reminders
- ✅ Appointment cancellations (client + admin)

### SMS Notifications (Optional)
- 📱 Appointment reminders (24h and 2h before)
- 📱 Same-day reminders
- 📱 New appointment notifications (admin)
- 📱 Cancellation notifications (admin)

## Deployment Notes

### For Production Deployment
1. **Email is required** - Make sure to configure email settings
2. **SMS is optional** - The system will work fine without Twilio
3. **No errors** - Missing SMS credentials won't cause any issues
4. **Graceful degradation** - If SMS fails, email notifications still work

### Environment Variables Summary

**Required:**
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@yourdomain.com
```

**Optional (SMS):**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ADMIN_PHONE=+1234567890
```

## Testing Notifications

You can test the notification system from the admin dashboard:

1. Go to Admin Dashboard
2. Scroll to "Notification System Status"
3. The system will show you which services are configured
4. Email notifications will work immediately
5. SMS notifications will only work if Twilio is configured

## Troubleshooting

### Email Not Working
- Check your email service credentials
- For Gmail, make sure you're using an App Password
- Verify your email service allows SMTP connections

### SMS Not Working
- SMS is optional - this won't break your system
- If you want SMS, verify your Twilio credentials
- Check that your Twilio phone number is verified

### No Notifications at All
- Check that the notification service is running
- Verify your environment variables are set correctly
- Check the server logs for any error messages 