# EmailJS Database Schema

This document outlines the Firebase Firestore collections and document structures for the EmailJS welcome email system.

## Collections Overview

### 1. emailTemplates
Stores customizable email templates that admins can modify.

**Collection Path:** `emailTemplates`

**Document Structure:**
```javascript
// Document ID: 'welcome'
{
  id: "welcome",
  name: "Welcome Email",
  description: "Email sent to new users upon registration",
  subject: "Welcome to Attendly - Your Attendance Tracking Journey Begins!",
  content: "<div style='font-family: Arial, sans-serif;'>...</div>", // HTML content
  variables: [
    "userName",
    "userEmail", 
    "dashboardUrl",
    "currentDate",
    "supportEmail"
  ],
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedBy: "admin@admin.com",
  version: 1
}
```

### 2. emailDeliveryLogs
Tracks all email delivery attempts and their status.

**Collection Path:** `emailDeliveryLogs`

**Document Structure:**
```javascript
{
  emailType: "welcome",
  recipient: "user@example.com",
  status: "success", // "success", "failed", "pending"
  details: {
    messageId: "emailjs_response_id",
    userId: "firebase_user_uid",
    timestamp: "2024-01-15T10:30:00.000Z",
    provider: "EmailJS"
  },
  timestamp: Timestamp,
  provider: "EmailJS",
  userAgent: "Mozilla/5.0...",
  retryCount: 0,
  lastRetryAt: Timestamp
}
```

### 3. emailSettings
Global EmailJS configuration and settings.

**Collection Path:** `emailSettings`

**Document Structure:**
```javascript
// Document ID: 'emailjs'
{
  provider: "EmailJS",
  publicKey: "7dVX0Su-MyNkMUoP_",
  serviceId: "service_emailjs",
  templateId: "template_welcome",
  fromName: "Attendly Team",
  fromEmail: "website.po45@gmail.com",
  isEnabled: true,
  dailyLimit: 200, // EmailJS free tier limit
  monthlyLimit: 1000,
  currentDailyCount: 0,
  currentMonthlyCount: 0,
  lastResetDate: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  updatedBy: "admin@admin.com"
}
```

## Firebase Security Rules

Add these rules to your `firestore.rules` file:

```javascript
// Email Templates - Admin only
match /emailTemplates/{templateId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
}

// Email Delivery Logs - Admin read, system write
match /emailDeliveryLogs/{logId} {
  allow read: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
  allow create: if request.auth != null;
  allow update, delete: if false; // Logs are immutable
}

// Email Settings - Admin only
match /emailSettings/{settingId} {
  allow read: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
  allow write: if request.auth != null && 
    request.auth.token.email in ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
}
```

## Initial Data Setup

### Default Welcome Template
```javascript
// Add to emailTemplates collection
db.collection('emailTemplates').doc('welcome').set({
  id: "welcome",
  name: "Welcome Email",
  description: "Email sent to new users upon registration",
  subject: "Welcome to Attendly - Your Attendance Tracking Journey Begins!",
  content: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0D1117; color: #F0F6FC; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #58A6FF; margin: 0; font-size: 28px;">Welcome to Attendly!</h1>
        <p style="color: #8B949E; margin: 10px 0 0 0; font-size: 16px;">Your Attendance Tracking Journey Begins</p>
      </div>
      
      <div style="background-color: #161B22; padding: 25px; border-radius: 6px; border: 1px solid #30363D; margin-bottom: 25px;">
        <h2 style="color: #F0F6FC; margin: 0 0 15px 0; font-size: 20px;">Hello {{userName}}!</h2>
        <p style="color: #C9D1D9; line-height: 1.6; margin: 0 0 15px 0;">
          Thank you for joining Attendly! We're excited to help you track and manage your attendance efficiently.
        </p>
        <p style="color: #C9D1D9; line-height: 1.6; margin: 0;">
          Your account has been successfully created and you can now start using all the features of our platform.
        </p>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="{{dashboardUrl}}" style="background-color: #238636; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Access Your Dashboard
        </a>
      </div>
      
      <div style="background-color: #161B22; padding: 20px; border-radius: 6px; border: 1px solid #30363D; margin-bottom: 25px;">
        <h3 style="color: #F0F6FC; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
        <ul style="color: #C9D1D9; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Set up your subjects and attendance preferences</li>
          <li>Start tracking your daily attendance</li>
          <li>View detailed reports and analytics</li>
          <li>Customize your dashboard to fit your needs</li>
        </ul>
      </div>
      
      <div style="text-align: center; padding: 20px 0; border-top: 1px solid #30363D; color: #8B949E; font-size: 14px;">
        <p style="margin: 0 0 10px 0;">Need help? Contact us at {{supportEmail}}</p>
        <p style="margin: 0;">© {{currentDate}} Attendly Team. All rights reserved.</p>
      </div>
    </div>
  `,
  variables: [
    "userName",
    "userEmail",
    "dashboardUrl", 
    "currentDate",
    "supportEmail"
  ],
  isActive: true,
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedBy: "system",
  version: 1
});
```

### EmailJS Settings
```javascript
// Add to emailSettings collection
db.collection('emailSettings').doc('emailjs').set({
  provider: "EmailJS",
  publicKey: "7dVX0Su-MyNkMUoP_",
  serviceId: "service_emailjs",
  templateId: "template_welcome",
  fromName: "Attendly Team",
  fromEmail: "website.po45@gmail.com",
  isEnabled: true,
  dailyLimit: 200,
  monthlyLimit: 1000,
  currentDailyCount: 0,
  currentMonthlyCount: 0,
  lastResetDate: firebase.firestore.FieldValue.serverTimestamp(),
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedBy: "system"
});
```

## Usage Examples

### Reading Email Template
```javascript
const templateDoc = await db.collection('emailTemplates').doc('welcome').get();
if (templateDoc.exists) {
  const template = templateDoc.data();
  console.log('Template subject:', template.subject);
  console.log('Template content:', template.content);
}
```

### Logging Email Delivery
```javascript
await db.collection('emailDeliveryLogs').add({
  emailType: 'welcome',
  recipient: 'user@example.com',
  status: 'success',
  details: {
    messageId: 'emailjs_12345',
    userId: 'firebase_user_uid',
    timestamp: new Date().toISOString(),
    provider: 'EmailJS'
  },
  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  provider: 'EmailJS',
  userAgent: navigator.userAgent,
  retryCount: 0
});
```

### Updating Email Settings
```javascript
await db.collection('emailSettings').doc('emailjs').update({
  currentDailyCount: firebase.firestore.FieldValue.increment(1),
  currentMonthlyCount: firebase.firestore.FieldValue.increment(1),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp()
});
```

## Monitoring and Analytics

### Daily Email Count Query
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

const dailyLogs = await db.collection('emailDeliveryLogs')
  .where('timestamp', '>=', today)
  .where('status', '==', 'success')
  .get();

console.log('Emails sent today:', dailyLogs.size);
```

### Failed Email Query
```javascript
const failedEmails = await db.collection('emailDeliveryLogs')
  .where('status', '==', 'failed')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get();

failedEmails.forEach(doc => {
  const data = doc.data();
  console.log('Failed email:', data.recipient, data.details.error);
});
```
