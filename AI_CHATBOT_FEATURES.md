# AI Chatbot Features

## Overview
The AI chatbot for the hairstylist booking site now supports comprehensive appointment management capabilities in addition to booking new appointments.

## Core Features

### 1. Appointment Booking
- Book new appointments with available services
- Suggest available time slots for the next 7 days
- Collect service preferences and client notes
- Handle inspiration photo uploads during booking
- Generate booking JSON when all details are confirmed

### 2. Appointment Management
The AI can now help clients manage their existing appointments:

#### View Appointments
- **Trigger phrases**: "show my appointments", "what appointments do I have", "my appointments"
- **Response**: Lists all current appointments with details including:
  - Service name
  - Date and time (formatted nicely)
  - Status (pending, confirmed, completed, cancelled)
  - Current client notes
  - Number of inspiration photos

#### Update Appointment Notes
- **Trigger phrases**: "add notes to my appointment", "update my appointment notes", "change my appointment notes"
- **Process**: AI asks which appointment and what notes to add
- **JSON format**: `{ "action": "update_appointment_notes", "appointmentId": "appointment_id", "clientNotes": "new notes" }`

#### Add Photos to Existing Appointments
- **Trigger phrases**: Upload photos + mention existing appointment
- **Process**: AI asks which appointment to add photos to
- **JSON format**: `{ "action": "add_appointment_photos", "appointmentId": "appointment_id" }`
- **Limits**: Maximum 5 photos per appointment

#### Cancel Appointments
- **Trigger phrases**: "cancel my appointment", "cancel appointment"
- **Process**: AI asks for confirmation of which appointment to cancel
- **JSON format**: `{ "action": "cancel_appointment", "appointmentId": "appointment_id" }`
- **Restrictions**: Can only cancel pending or confirmed appointments

#### General Appointment Help
- **Trigger phrases**: "help with appointments", "what can I do with my appointments"
- **Response**: Explains available management options

## Technical Implementation

### Backend Changes
1. **Enhanced Chat Controller** (`server/controllers/chatController.js`):
   - Added `getUserAppointments()` helper function
   - Added `formatAppointment()` helper function
   - Enhanced system prompt with appointment management instructions
   - Added handlers for appointment management JSON actions

2. **Updated Appointments Controller** (`server/controllers/appointmentsController.js`):
   - Enhanced `update()` method to handle `clientNotes` updates
   - Existing `updatePhotos()` and `deletePhoto()` methods already support photo management
   - Existing `update()` method already supports status changes (cancellation)

### Security Features
- User authentication required for all appointment management actions
- Users can only manage their own appointments
- Proper validation of appointment ownership before any modifications
- File upload limits and validation for photos

### File Management
- Photos are stored in `server/uploads/inspo-photos/`
- Static file serving configured for `/uploads` route
- Maximum 5 photos per appointment
- 5MB file size limit per photo

## Usage Examples

### Viewing Appointments
```
User: "Show my appointments"
AI: "Here are your current appointments:
- Test Haircut on 2025-07-01 (Tuesday) at 09:00 AM (confirmed)
  Notes: Want a shorter style
  Photos: 2 inspiration photos
- Hair Coloring on 2025-07-15 (Tuesday) at 02:00 PM (pending)
  Notes: None
  Photos: 0 inspiration photos"
```

### Adding Notes
```
User: "I want to add notes to my haircut appointment"
AI: "Which appointment would you like to add notes to? I see you have:
1. Test Haircut on 2025-07-01 (Tuesday) at 09:00 AM
2. Hair Coloring on 2025-07-15 (Tuesday) at 02:00 PM

What notes would you like to add?"
```

### Cancelling Appointments
```
User: "I need to cancel my appointment"
AI: "I see you have these appointments:
1. Test Haircut on 2025-07-01 (Tuesday) at 09:00 AM (confirmed)
2. Hair Coloring on 2025-07-15 (Tuesday) at 02:00 PM (pending)

Which appointment would you like to cancel?"
```

## Error Handling
- Graceful handling of missing appointments
- Clear error messages for unauthorized actions
- Validation of appointment status before cancellation
- File upload error handling

## Future Enhancements
- Reschedule appointments
- Request appointment reminders
- View appointment history
- Integration with payment processing
- Advanced photo management (delete specific photos) 