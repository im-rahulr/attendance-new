# Netlify Deployment Guide for lowrybunks Email System

## Overview
This guide explains how to deploy the lowrybunks attendance system with working email functionality on Netlify hosting.

## Email System Architecture

The system uses multiple email delivery methods with automatic fallbacks:

1. **Netlify Functions** (Primary) - Server-side email using Gmail SMTP
2. **Web3Forms** (Secondary) - Third-party form handling service
3. **PHP Email Service** (Fallback) - Traditional PHP email handling
4. **Local Storage** (Emergency) - Stores submissions locally if all else fails

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository has the following structure:
```
/
├── netlify/
│   └── functions/
│       ├── send-email.js
│       └── package.json
├── public/
│   └── netlify.toml
├── src/
│   ├── api/
│   │   └── send-email.php
│   └── pages/
│       └── contact.html
├── .env.example
└── email-test.html
```

### 2. Configure Environment Variables

In your Netlify dashboard:

1. Go to Site Settings → Environment Variables
2. Add the following variables:

```
EMAIL_USER=website.po45@gmail.com
EMAIL_PASS=usil_vuzn_wbep_nili
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
FROM_NAME=lowrybunks Team
ADMIN_EMAIL=rahulhitwo@gmail.com
WEB3FORMS_ACCESS_KEY=cae30f52-a8c3-4e54-9060-b0b43a4219d6
NODE_ENV=production
```

### 3. Deploy to Netlify

#### Option A: Git Integration (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build settings:
   - Build command: `npm install` (if needed)
   - Publish directory: `.` (root directory)
   - Functions directory: `netlify/functions`

#### Option B: Manual Deploy
1. Drag and drop your project folder to Netlify
2. Configure functions directory in Site Settings

### 4. Test Email Functionality

After deployment:

1. Visit `https://your-site.netlify.app/email-test.html`
2. Test each email method:
   - Netlify Function Email Test
   - PHP Email Service Test
   - Web3Forms Integration Test
   - Full Contact Form Test

### 5. Verify Contact Form

1. Go to your contact page
2. Submit a test form
3. Check that:
   - Form submits successfully
   - User receives confirmation email
   - Admin receives notification email
   - Submission is stored (if Firebase is configured)

## Troubleshooting

### Common Issues

#### 1. Netlify Function Not Working
- Check function logs in Netlify dashboard
- Verify environment variables are set
- Ensure `netlify.toml` has correct functions directory

#### 2. Gmail SMTP Issues
- Verify Gmail app password is correct
- Check that 2FA is enabled on Gmail account
- Ensure "Less secure app access" is disabled (use app passwords)

#### 3. Web3Forms Not Working
- Verify access key is correct
- Check Web3Forms dashboard for submission logs
- Ensure form fields match Web3Forms requirements

#### 4. PHP Email Not Working
- Check if hosting supports PHP
- Verify PHPMailer is available
- Check PHP error logs

### Email Delivery Priority

The system tries email delivery in this order:

1. **Netlify Function** - Most reliable on Netlify
2. **PHP Service** - Fallback for traditional hosting
3. **Web3Forms** - Always works as final fallback
4. **Local Storage** - Emergency storage only

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to repository
2. **CORS**: Configured for your domain only
3. **Rate Limiting**: Implement if needed
4. **Input Validation**: All inputs are validated and sanitized

## Monitoring

### Check Email Delivery
- Monitor Netlify function logs
- Check Web3Forms dashboard
- Review Gmail sent items
- Test regularly with email-test.html

### Performance
- Functions should respond within 10 seconds
- Failed emails automatically retry with fallback methods
- User always receives success/error feedback

## Support

If you encounter issues:

1. Check the email-test.html page for detailed error messages
2. Review Netlify function logs
3. Verify all environment variables are set correctly
4. Test each email method individually

## Updates

To update the email system:

1. Update the code in your repository
2. Push changes (if using Git integration)
3. Test with email-test.html
4. Verify contact form still works

The system is designed to be robust and will continue working even if some components fail.
