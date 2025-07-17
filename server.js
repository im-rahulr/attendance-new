const express = require('express');
const { Resend } = require('resend');
const path = require('path');
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Resend Configuration
const resend = new Resend('re_VXbfso2S_P1MXh6Z7std8n15kYHcgoeev');

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Email templates
const emailTemplates = {
    welcome: (userName) => ({
        subject: `🎉 Welcome to Attendly, ${userName}!`,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Attendly!</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Welcome ${userName}!</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your attendance tracking journey begins now</p>
                    </div>
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome to Attendly!</h2>
                        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                            Hi ${userName}, we're excited to have you join our attendance management system! Your account has been successfully created.
                        </p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">What you can do now:</h3>
                            <ul style="color: #666666; margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li style="margin-bottom: 8px;">Track your daily attendance</li>
                                <li style="margin-bottom: 8px;">View your attendance history</li>
                                <li style="margin-bottom: 8px;">Generate attendance reports</li>
                                <li style="margin-bottom: 8px;">Update your profile information</li>
                            </ul>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; font-size: 16px;">
                                Access Dashboard
                            </a>
                        </div>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; margin: 0 0 10px 0; font-size: 14px;">
                            Best regards,<br><strong>The Attendly Team</strong>
                        </p>
                        <p style="color: #cccccc; margin: 0; font-size: 12px;">
                            This email was sent because you created an account with us.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),
    
    contact: (userName) => ({
        subject: '👋 Thank you for contacting us!',
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Thank you for contacting us!</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">👋 Hello ${userName}!</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Thank you for reaching out to us</p>
                    </div>
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">We received your message!</h2>
                        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                            Thank you for contacting us! We've received your inquiry and our team will get back to you within 24-48 hours.
                        </p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">What happens next?</h3>
                            <ul style="color: #666666; margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li style="margin-bottom: 8px;">Our team will review your message</li>
                                <li style="margin-bottom: 8px;">We'll get back to you within 24-48 hours</li>
                                <li style="margin-bottom: 8px;">Keep an eye on your inbox for updates</li>
                            </ul>
                        </div>
                        <p style="color: #666666; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                            In the meantime, feel free to explore our website and learn more about our attendance management system.
                        </p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; margin: 0 0 10px 0; font-size: 14px;">
                            Best regards,<br><strong>The Attendly Team</strong>
                        </p>
                        <p style="color: #cccccc; margin: 0; font-size: 12px;">
                            This email was sent because you contacted us through our website.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),
    
    hello: (userName) => ({
        subject: '👋 Hello from Our Website!',
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Hello from Our Website!</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">👋 Hello ${userName}!</h1>
                        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to our amazing community</p>
                    </div>
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Thanks for reaching out!</h2>
                        <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                            We're excited to have you here! This email confirms that we've received your information and we'll be in touch soon.
                        </p>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">What happens next?</h3>
                            <ul style="color: #666666; margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li style="margin-bottom: 8px;">Our team will review your message</li>
                                <li style="margin-bottom: 8px;">We'll get back to you within 24-48 hours</li>
                                <li style="margin-bottom: 8px;">Keep an eye on your inbox for updates</li>
                            </ul>
                        </div>
                        <p style="color: #666666; line-height: 1.6; margin: 20px 0; font-size: 16px;">
                            In the meantime, feel free to explore our website and learn more about what we do.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold; font-size: 16px;">
                                Visit Our Website
                            </a>
                        </div>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; margin: 0 0 10px 0; font-size: 14px;">
                            Best regards,<br><strong>The Website Team</strong>
                        </p>
                        <p style="color: #cccccc; margin: 0; font-size: 12px;">
                            This email was sent because you contacted us through our website.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    })
};

// Email sending endpoint
app.post('/send-email', async (req, res) => {
    try {
        const { to, name, type = 'hello', subject, message } = req.body;
        
        if (!to || !isValidEmail(to)) {
            return res.status(400).json({ error: 'Valid email address is required' });
        }

        const userName = name || 'Friend';
        
        // Get email template based on type
        let emailContent;
        if (emailTemplates[type]) {
            emailContent = emailTemplates[type](userName);
        } else {
            // Default to hello template
            emailContent = emailTemplates.hello(userName);
        }
        
        // Override subject if provided
        if (subject) {
            emailContent.subject = subject;
        }

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: to,
            subject: emailContent.subject,
            html: emailContent.html
        });

        if (error) {
            console.error('Resend error:', error);
            return res.status(500).json({ 
                error: 'Failed to send email',
                details: error.message 
            });
        }

        console.log('Email sent successfully:', data);
        res.json({ 
            success: true, 
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} email sent successfully!`,
            messageId: data.id,
            type: type
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Failed to send email',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Email Server with Resend' });
});

// Email test endpoint for admin panel
app.post('/test-email', async (req, res) => {
    try {
        const { testEmail, testType = 'hello' } = req.body;

        if (!testEmail || !isValidEmail(testEmail)) {
            return res.status(400).json({ error: 'Valid test email address is required' });
        }

        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: testEmail,
            subject: '🧪 Email System Test',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Email System Test</title>
                </head>
                <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
                        <h1 style="color: #333;">🧪 Email System Test</h1>
                        <p>This is a test email from the Attendly email system.</p>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <strong>Test Details:</strong><br>
                            • Test Type: ${testType}<br>
                            • Sent At: ${new Date().toISOString()}<br>
                            • Service: Resend API<br>
                            • Status: ✅ Successfully Delivered
                        </div>
                        <p>If you received this email, the email system is working correctly!</p>
                    </div>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('Test email error:', error);
            return res.status(500).json({
                error: 'Failed to send test email',
                details: error.message
            });
        }

        console.log('Test email sent successfully:', data);
        res.json({
            success: true,
            message: 'Test email sent successfully!',
            messageId: data.id,
            testType: testType,
            sentTo: testEmail
        });

    } catch (error) {
        console.error('Test email server error:', error);
        res.status(500).json({
            error: 'Failed to send test email',
            details: error.message
        });
    }
});

// Email templates endpoint for admin panel
app.get('/email-templates', (req, res) => {
    const templates = Object.keys(emailTemplates).map(key => ({
        type: key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        description: `${key.charAt(0).toUpperCase() + key.slice(1)} email template`
    }));

    res.json({ templates });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'email-form.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📧 Email service ready with Resend integration`);
    console.log(`📋 Available email types: welcome, contact, hello`);
});
