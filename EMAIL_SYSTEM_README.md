# Email Contact Form with Resend Integration

## Overview
This project is a complete email contact form solution that allows users to submit their email address and receive a personalized hello message. The system uses Node.js with Express on the backend and Resend as the email service provider.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

### 3. Open the Application
Visit: `http://localhost:3001`

## 📧 Features

- **Beautiful HTML Email Templates**: Professional, responsive email design
- **Resend Integration**: Powered by Resend API for reliable email delivery
- **Real-time Validation**: Client-side email validation
- **Error Handling**: Comprehensive error handling with user feedback
- **Loading States**: Visual feedback during email sending
- **Responsive Design**: Works on all devices

## 🔧 Technical Details

### Backend Dependencies
```json
{
  "express": "^4.18.2",
  "resend": "^3.2.0"
}
```

### Resend Configuration
The core email functionality uses the Resend service:
```javascript
const resend = new Resend('re_VXbfso2S_P1MXh6Z7std8n15kYHcgoeev');
```

## 📁 File Structure

```
/
├── server.js              # Express server with Resend integration
├── email-form.html        # Frontend email form
├── script.js              # Frontend JavaScript functionality
├── package.json           # Dependencies and scripts
└── EMAIL_SYSTEM_README.md  # This file
```

## 🛠 API Endpoints

### POST /send-email
Sends a personalized hello email to the specified recipient.

**Request Body:**
```json
{
  "to": "user@example.com",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Hello email sent successfully!",
  "messageId": "resend-message-id"
}
```

### GET /health
Health check endpoint to verify service status.

**Response:**
```json
{
  "status": "OK",
  "service": "Email Server with Resend"
}
```

## 🎨 Email Template Features

- **Responsive HTML Design**: Works on all email clients
- **Personalized Greeting**: Uses the recipient's name
- **Professional Styling**: Modern gradient design with proper typography
- **Call-to-Action**: Includes interactive elements
- **Branded Footer**: Professional footer with company information

## 🧪 Testing

### Manual Testing
1. Open `http://localhost:3001` in your browser
2. Enter your email address and name
3. Click "Send Hello Email"
4. Check your inbox for the personalized email

### Programmatic Testing
Use the browser console to test:
```javascript
// Test email service connectivity
await window.emailUtils.testEmailService();

// Send a test email
await window.emailUtils.sendTestEmail('your-email@example.com');
```

## 🔒 Security Features

- **Input Validation**: Email format validation on both frontend and backend
- **Error Handling**: Graceful error handling without exposing sensitive information
- **Rate Limiting**: Can be easily added for production use

## 🌐 Production Deployment

### Environment Variables
For production, set these environment variables:
```bash
PORT=3001
RESEND_API_KEY=your_resend_api_key
```

### Deployment Steps
1. Update the Resend API key in `server.js`
2. Configure your domain with Resend
3. Update the "from" email address to your verified domain
4. Deploy to your hosting platform

## 📝 Customization

### Email Template
Modify the HTML template in `server.js` around line 30-90 to customize:
- Colors and styling
- Content and messaging
- Branding elements
- Call-to-action buttons

### Frontend Styling
Update the CSS in `email-form.html` to match your brand:
- Color scheme
- Typography
- Layout and spacing
- Interactive elements

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Change the PORT in `server.js` to a different number
   - Or kill the process using the port

2. **Email Not Received**
   - Check spam/junk folder
   - Verify email address is correct
   - Check server logs for errors

3. **Resend API Errors**
   - Verify API key is correct
   - Check Resend dashboard for quota limits
   - Ensure "from" domain is verified

### Debug Mode
Enable debug logging by adding to `server.js`:
```javascript
console.log('Debug info:', { to, name, result });
```

## 📞 Support

For issues or questions:
1. Check the browser console for error messages
2. Review server logs in the terminal
3. Verify all dependencies are installed correctly
4. Test the `/health` endpoint for service status

## 🔄 Updates

This system is designed to be easily maintainable and extensible. Future enhancements could include:
- Database integration for email logging
- Multiple email templates
- Advanced personalization
- Analytics and tracking
- Webhook integration

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Email Service:** Resend API
