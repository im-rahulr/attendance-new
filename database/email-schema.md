# Email System Database Schema

This document outlines the Firestore collections and document structures for the welcome email system.

## Collections

### 1. emailTemplates
Stores customizable email templates that administrators can modify.

**Collection Path:** `emailTemplates`

**Document Structure:**
```javascript
// Document ID: 'welcome' (template type)
{
  subject: "Welcome to Attendly - Your Attendance Tracking Journey Begins!",
  body: "<!DOCTYPE html>...", // HTML email template with placeholders
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedBy: "admin@example.com", // Email of admin who last updated
  version: 1, // Template version for tracking changes
  isActive: true, // Whether this template is currently active
  templateType: "welcome", // Type of email template
  variables: [ // Available template variables
    "userName",
    "userEmail", 
    "dashboardUrl"
  ],
  metadata: {
    description: "Welcome email sent to new users after first login",
    category: "user_onboarding",
    language: "en"
  }
}
```

### 2. emailLogs
Tracks which users have received welcome emails to prevent duplicates.

**Collection Path:** `emailLogs`

**Document Structure:**
```javascript
// Document ID: userId (Firebase Auth UID)
{
  userId: "firebase_auth_uid",
  userEmail: "user@example.com",
  welcomeEmailSent: true,
  welcomeEmailSentAt: Timestamp,
  welcomeEmailAttempts: 1, // Number of send attempts
  lastAttemptAt: Timestamp,
  lastAttemptStatus: "success", // "success", "failed", "pending"
  lastAttemptError: null, // Error message if failed
  emailHistory: [ // Array of email send history
    {
      templateType: "welcome",
      sentAt: Timestamp,
      status: "success",
      messageId: "msg_123456789",
      recipientEmail: "user@example.com",
      subject: "Welcome to Attendly...",
      errorMessage: null
    }
  ],
  createdAt: Timestamp,
  lastUpdated: Timestamp
}
```

### 3. emailQueue (Optional - for future enhancement)
Queue system for managing email sending in batches.

**Collection Path:** `emailQueue`

**Document Structure:**
```javascript
// Document ID: auto-generated
{
  recipientEmail: "user@example.com",
  recipientName: "John Doe",
  templateType: "welcome",
  templateData: {
    userName: "John Doe",
    userEmail: "user@example.com",
    dashboardUrl: "https://app.attendly.com/dashboard"
  },
  priority: "normal", // "high", "normal", "low"
  status: "pending", // "pending", "processing", "sent", "failed"
  scheduledAt: Timestamp, // When to send the email
  createdAt: Timestamp,
  processedAt: null,
  attempts: 0,
  maxAttempts: 3,
  lastError: null,
  messageId: null // Set when successfully sent
}
```

### 4. emailSettings
Global email configuration and settings.

**Collection Path:** `emailSettings`

**Document Structure:**
```javascript
// Document ID: 'global'
{
  smtpConfig: {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    // Note: Actual credentials stored securely, not in database
    authConfigured: true
  },
  welcomeEmailEnabled: true,
  defaultFromName: "Attendly Team",
  defaultFromEmail: "website.po45@gmail.com",
  emailLimits: {
    dailyLimit: 500,
    hourlyLimit: 50,
    perUserLimit: 5
  },
  retryPolicy: {
    maxAttempts: 3,
    retryDelayMinutes: 5,
    backoffMultiplier: 2
  },
  templateDefaults: {
    language: "en",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD"
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedBy: "admin@example.com"
}
```

## Firestore Security Rules

Add these rules to your `firestore.rules` file:

```javascript
// Email Templates - Admin only
match /emailTemplates/{templateId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
}

// Email Logs - Users can read their own, admins can read all
match /emailLogs/{userId} {
  allow read: if request.auth != null && 
    (request.auth.uid == userId || 
     request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com']);
  allow write: if request.auth != null;
}

// Email Settings - Admin only
match /emailSettings/{settingId} {
  allow read: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
  allow write: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
}

// Email Queue - System only (if implemented)
match /emailQueue/{queueId} {
  allow read, write: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
}
```

## Indexes

Create these composite indexes in Firestore:

1. **emailLogs Collection:**
   - Fields: `userEmail` (Ascending), `welcomeEmailSent` (Ascending)
   - Fields: `welcomeEmailSentAt` (Descending), `lastAttemptStatus` (Ascending)

2. **emailQueue Collection (if implemented):**
   - Fields: `status` (Ascending), `scheduledAt` (Ascending)
   - Fields: `recipientEmail` (Ascending), `createdAt` (Descending)

## Template Variables

The following variables are available for use in email templates:

- `{{userName}}` - User's display name
- `{{userEmail}}` - User's email address
- `{{dashboardUrl}}` - URL to the user's dashboard
- `{{currentDate}}` - Current date (formatted)
- `{{supportEmail}}` - Support email address
- `{{companyName}}` - Company/app name (Attendly)

## Usage Examples

### Creating a new email template:
```javascript
await db.collection('emailTemplates').doc('welcome').set({
  subject: "Welcome to {{companyName}}!",
  body: "<html>...</html>",
  templateType: "welcome",
  variables: ["userName", "userEmail", "dashboardUrl"],
  isActive: true,
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedBy: currentUser.email
});
```

### Checking if user received welcome email:
```javascript
const emailLog = await db.collection('emailLogs').doc(userId).get();
const hasReceived = emailLog.exists && emailLog.data().welcomeEmailSent === true;
```

### Logging email send attempt:
```javascript
await db.collection('emailLogs').doc(userId).set({
  welcomeEmailSent: true,
  welcomeEmailSentAt: firebase.firestore.FieldValue.serverTimestamp(),
  lastAttemptStatus: "success",
  emailHistory: firebase.firestore.FieldValue.arrayUnion({
    templateType: "welcome",
    sentAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "success",
    messageId: "msg_123456789"
  })
}, { merge: true });
```
