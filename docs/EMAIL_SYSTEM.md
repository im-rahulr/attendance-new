# Welcome Email System Documentation

## Overview

The Welcome Email System is a comprehensive email management solution for the Attendly application that automatically sends welcome emails to new users upon their first successful login. The system includes Gmail integration, admin customization capabilities, and robust user tracking.

## Features

### Core Functionality
- **Automatic Welcome Emails**: Sends welcome emails to new users on first login
- **Gmail Integration**: Uses Gmail SMTP with app-specific password
- **Template Customization**: Admin-configurable email templates with variable substitution
- **User Tracking**: Prevents duplicate emails and tracks email history
- **Error Handling**: Comprehensive error handling and retry mechanisms
- **Admin Interface**: Full admin panel integration for email management

### Enhanced Admin Testing Features
- **Preferred Email Input**: Administrators can specify their preferred email address for testing
- **Email Preference Saving**: Automatically saves and loads admin email preferences
- **Confirmation Dialogs**: Shows confirmation dialog with target email before sending test emails
- **Delivery Verification**: Comprehensive delivery status tracking and verification
- **Troubleshooting System**: Automated troubleshooting with guided resolution steps
- **Notification System**: Real-time notifications for delivery status and issues
- **System Health Monitoring**: Continuous monitoring of email system components

### Technical Features
- **Database Integration**: Firestore collections for templates and tracking
- **Real-time Statistics**: Live email statistics and activity monitoring
- **Template Preview**: Preview emails before sending
- **Enhanced Test Email Functionality**: Advanced test email system with delivery verification
- **Responsive Design**: Dark theme UI consistent with application design
- **Delivery Logging**: Detailed logging of all email delivery attempts
- **Error Recovery**: Automatic retry mechanisms and error recovery procedures

## System Architecture

### Components

1. **Email Service Module** (`src/components/email-service.js`)
   - Core email functionality
   - Gmail SMTP integration
   - Template management
   - User tracking

2. **Email Template Manager** (`src/components/email-template-manager.js`)
   - Admin interface functionality
   - Template editing and preview
   - Statistics display
   - Activity monitoring

3. **Authentication Integration** (`src/api/auth.js`)
   - Welcome email triggers
   - First-time login detection
   - User registration hooks

4. **Admin Panel Integration** (`src/pages/admin.html`)
   - Email Templates tab
   - Template editing interface
   - Email statistics dashboard

### Database Schema

#### Collections

**emailTemplates**
```javascript
{
  subject: "Welcome to Attendly!",
  body: "HTML email template with {{variables}}",
  templateType: "welcome",
  isActive: true,
  updatedAt: Timestamp,
  updatedBy: "admin@example.com"
}
```

**emailLogs**
```javascript
{
  userId: "firebase_auth_uid",
  userEmail: "user@example.com",
  welcomeEmailSent: true,
  welcomeEmailSentAt: Timestamp,
  lastAttemptStatus: "success",
  emailHistory: [
    {
      templateType: "welcome",
      sentAt: Timestamp,
      status: "success",
      messageId: "msg_123456789"
    }
  ]
}
```

## Configuration

### Gmail Setup

1. **Gmail Account**: `website.po45@gmail.com`
2. **App Password**: `usil vuzn wbep nili`
3. **SMTP Settings**:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Security: `STARTTLS`

### Email Configuration

The email configuration is defined in `src/components/email-service.js`:

```javascript
const EMAIL_CONFIG = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'website.po45@gmail.com',
        pass: 'usil vuzn wbep nili'
    }
};
```

## Usage

### For Administrators

1. **Access Email Templates**:
   - Navigate to Admin Panel
   - Click on "Email Templates" tab
   - Edit subject and body content
   - Use template variables for personalization

2. **Template Variables**:
   - `{{userName}}` - User's display name
   - `{{userEmail}}` - User's email address
   - `{{dashboardUrl}}` - Link to user dashboard

3. **Enhanced Email Testing**:
   - **Set Test Email Address**: Enter your preferred email address in the "Test Email Address" field
   - **Email Preference Saving**: Check "Save email preference for future tests" to remember your email
   - **Confirmation Dialog**: Click "Send Test Email" to see a confirmation dialog with your target email
   - **Delivery Verification**: After sending, receive detailed delivery status and verification options
   - **Troubleshooting Support**: If email not received, access comprehensive troubleshooting tools

4. **Preview and Test**:
   - Click "Preview" to see email with sample data
   - Enter your email address for testing
   - Confirm email address in the confirmation dialog
   - Monitor delivery status and verify receipt
   - Access troubleshooting if issues occur

5. **Template Management**:
   - Save changes with "Save Template" button
   - Reset to default template if needed
   - View email sending statistics
   - Track delivery success rates and issues

6. **Troubleshooting Features**:
   - **Automatic Issue Detection**: System detects delivery failures
   - **Guided Troubleshooting**: Step-by-step troubleshooting process
   - **Multiple Resolution Paths**: Different solutions for different issues
   - **System Health Monitoring**: Real-time monitoring of email system health
   - **Notification System**: Alerts for delivery issues and resolutions

### For Developers

#### Triggering Welcome Emails

Welcome emails are automatically triggered when:
1. User creates a new account
2. User logs in for the first time
3. User has `isNewUser: true` and `firstLoginPending: true` in their profile

#### Manual Email Sending

```javascript
// Send welcome email manually
const result = await window.emailService.sendWelcomeEmail(
    userEmail,
    userName,
    userId
);

if (result.success) {
    console.log('Email sent successfully');
} else {
    console.error('Email failed:', result.error);
}
```

#### Checking Email Status

```javascript
// Check if user has received welcome email
const hasReceived = await window.emailService.hasReceivedWelcomeEmail(userId);

// Get user email history
const history = await window.emailService.getUserEmailHistory(userId);

// Get email statistics
const stats = await window.emailService.getEmailStatistics();
```

## Testing

### Test Suite

A comprehensive test suite is available at `src/tests/email-system-test.html`:

1. **Email Service Tests**: Initialization and configuration
2. **Template Management Tests**: Template loading, saving, and preview
3. **User Tracking Tests**: Email status checking and statistics
4. **Welcome Email Tests**: Email sending functionality
5. **Error Handling Tests**: Invalid input handling
6. **Database Integration Tests**: Firestore connectivity

### Running Tests

1. Open `src/tests/email-system-test.html` in a browser
2. Ensure you're logged in as an admin
3. Click "Run All Tests" to execute the full test suite
4. Review test results and system status

### Manual Testing

1. **Create Test User**:
   - Register a new account
   - Check if welcome email is triggered on first login

2. **Admin Interface**:
   - Access admin panel email templates
   - Modify template and save
   - Send test email to verify changes

3. **Error Scenarios**:
   - Test with invalid email addresses
   - Test with network connectivity issues
   - Verify error handling and user feedback

## Troubleshooting

### Common Issues

1. **Email Service Not Initialized**:
   - Check Firebase configuration
   - Verify email service script is loaded
   - Check browser console for errors

2. **Emails Not Sending**:
   - Verify Gmail credentials
   - Check network connectivity
   - Review email logs in Firestore

3. **Template Not Loading**:
   - Check Firestore permissions
   - Verify emailTemplates collection exists
   - Check admin authentication

4. **Duplicate Emails**:
   - Verify user tracking is working
   - Check emailLogs collection
   - Review first-time login logic

### Debug Information

Enable debug logging by setting:
```javascript
window.emailService.debug = true;
```

Check browser console for detailed logging information.

### Support

For technical support or issues:
1. Check the test suite results
2. Review browser console errors
3. Verify Firestore data integrity
4. Test with different user accounts

## Security Considerations

1. **Email Credentials**: Stored in client-side code (consider server-side implementation for production)
2. **Template Validation**: Admin-only access to template editing
3. **User Data**: Email addresses are logged for tracking purposes
4. **Rate Limiting**: Consider implementing rate limiting for email sending

## Future Enhancements

1. **Server-side Email Sending**: Move email sending to Firebase Functions
2. **Multiple Email Templates**: Support for different email types
3. **Email Scheduling**: Schedule emails for specific times
4. **Advanced Analytics**: Detailed email performance metrics
5. **Email Preferences**: User-configurable email preferences
6. **Internationalization**: Multi-language email templates
