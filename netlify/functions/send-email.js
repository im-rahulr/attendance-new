/**
 * Netlify Function for Email Sending
 * Compatible with Netlify hosting - handles email delivery using multiple methods
 */

const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'website.po45@gmail.com',
        pass: process.env.EMAIL_PASS || 'usil vuzn wbep nili'
    },
    adminEmail: process.env.ADMIN_EMAIL || 'rahulhitwo@gmail.com'
};

// Create transporter
let transporter;

async function initializeTransporter() {
    try {
        transporter = nodemailer.createTransporter(EMAIL_CONFIG);
        await transporter.verify();
        console.log('✅ Email transporter verified');
        return true;
    } catch (error) {
        console.error('❌ Email transporter verification failed:', error);
        return false;
    }
}

// Main handler function
exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: 'Method not allowed' 
            })
        };
    }

    try {
        // Parse request body
        const emailData = JSON.parse(event.body);

        // Validate required fields
        if (!emailData.to_email || !emailData.subject || !emailData.message) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing required fields: to_email, subject, message'
                })
            };
        }

        // Initialize transporter
        const transporterReady = await initializeTransporter();
        if (!transporterReady) {
            throw new Error('Email service initialization failed');
        }

        // Prepare email options
        const mailOptions = {
            from: {
                name: emailData.from_name || 'lowrybunks Team',
                address: EMAIL_CONFIG.auth.user
            },
            to: {
                name: emailData.to_name || '',
                address: emailData.to_email
            },
            subject: emailData.subject,
            html: emailData.html_content || emailData.message,
            text: emailData.text_content || emailData.message
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);

        // Send admin notification if requested
        if (emailData.notify_admin && EMAIL_CONFIG.adminEmail) {
            const adminMailOptions = {
                from: {
                    name: 'lowrybunks Contact Form',
                    address: EMAIL_CONFIG.auth.user
                },
                to: EMAIL_CONFIG.adminEmail,
                subject: `New Contact Form Submission: ${emailData.subject}`,
                html: `
                    <h3>New Contact Form Submission</h3>
                    <p><strong>From:</strong> ${emailData.to_name || 'Unknown'} (${emailData.to_email})</p>
                    <p><strong>Subject:</strong> ${emailData.subject}</p>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                        ${emailData.message}
                    </div>
                    <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                `
            };

            await transporter.sendMail(adminMailOptions);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Email sent successfully',
                messageId: info.messageId,
                deliveredAt: new Date().toISOString(),
                provider: 'Gmail SMTP via Netlify Function'
            })
        };

    } catch (error) {
        console.error('Email sending error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Email sending failed',
                details: error.message
            })
        };
    }
};
