/**
 * Node.js Email Server
 * Handles actual email delivery using Nodemailer with Gmail SMTP
 */

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: {
        success: false,
        error: 'Too many email requests, please try again later.'
    }
});

// Email configuration
const EMAIL_CONFIG = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'website.po45@gmail.com',
        pass: 'usil vuzn wbep nili' // App password for Gmail
    }
};

// Create transporter
let transporter;

async function initializeTransporter() {
    try {
        transporter = nodemailer.createTransport(EMAIL_CONFIG);

        // Verify connection configuration
        await transporter.verify();
        console.log('✅ Email server is ready to send messages');
        return true;
    } catch (error) {
        console.error('❌ Email server initialization failed:', error);
        return false;
    }
}

/**
 * Validate email data
 */
function validateEmailData(data) {
    const errors = [];
    
    if (!data.to_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.to_email)) {
        errors.push('Valid recipient email is required');
    }
    
    if (!data.subject || data.subject.trim().length === 0) {
        errors.push('Email subject is required');
    }
    
    if (!data.html_content && !data.text_content) {
        errors.push('Email content is required');
    }
    
    if (data.subject && data.subject.length > 200) {
        errors.push('Subject line too long (max 200 characters)');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Log email attempt
 */
async function logEmailAttempt(emailData, result) {
    try {
        const logDir = path.join(__dirname, 'logs');
        
        // Create logs directory if it doesn't exist
        try {
            await fs.access(logDir);
        } catch {
            await fs.mkdir(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `email_log_${new Date().toISOString().split('T')[0]}.json`);
        const logEntry = {
            timestamp: new Date().toISOString(),
            to_email: emailData.to_email,
            to_name: emailData.to_name || 'Unknown',
            subject: emailData.subject,
            success: result.success,
            error: result.error || null,
            messageId: result.messageId || null,
            deliveryStatus: result.deliveryStatus || 'unknown',
            provider: 'Gmail SMTP'
        };
        
        // Read existing logs
        let logs = [];
        try {
            const existingLogs = await fs.readFile(logFile, 'utf8');
            logs = JSON.parse(existingLogs);
        } catch {
            // File doesn't exist or is empty, start with empty array
        }
        
        // Add new log entry
        logs.push(logEntry);
        
        // Keep only last 1000 entries to prevent file from growing too large
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }
        
        // Write back to file
        await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        
    } catch (error) {
        console.error('Failed to log email attempt:', error);
    }
}

/**
 * Send email endpoint
 */
app.post('/send-email', emailLimiter, async (req, res) => {
    try {
        const emailData = req.body;
        
        // Validate input
        const validation = validateEmailData(emailData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed: ' + validation.errors.join(', ')
            });
        }
        
        // Check if transporter is ready
        if (!transporter) {
            const initialized = await initializeTransporter();
            if (!initialized) {
                return res.status(500).json({
                    success: false,
                    error: 'Email service not available',
                    deliveryStatus: 'service_unavailable'
                });
            }
        }
        
        // Prepare email options
        const mailOptions = {
            from: {
                name: emailData.from_name || 'Attendly Team',
                address: EMAIL_CONFIG.auth.user
            },
            to: {
                name: emailData.to_name || '',
                address: emailData.to_email
            },
            subject: emailData.subject,
            html: emailData.html_content,
            text: emailData.text_content || emailData.html_content?.replace(/<[^>]*>/g, '') // Strip HTML for text version
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        const result = {
            success: true,
            message: 'Email sent successfully',
            messageId: info.messageId,
            deliveredAt: new Date().toISOString(),
            deliveryStatus: 'delivered',
            provider: 'Gmail SMTP',
            accepted: info.accepted,
            rejected: info.rejected
        };
        
        // Log the attempt
        await logEmailAttempt(emailData, result);
        
        res.json(result);
        
    } catch (error) {
        console.error('Email sending error:', error);
        
        const errorResult = {
            success: false,
            error: error.message,
            deliveryStatus: 'error'
        };
        
        // Log the failed attempt
        if (req.body) {
            await logEmailAttempt(req.body, errorResult);
        }
        
        res.status(500).json(errorResult);
    }
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        if (!transporter) {
            await initializeTransporter();
        }
        
        // Test connection
        await transporter.verify();
        
        res.json({
            status: 'healthy',
            service: 'email-server',
            timestamp: new Date().toISOString(),
            smtp_connected: true
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            service: 'email-server',
            timestamp: new Date().toISOString(),
            smtp_connected: false,
            error: error.message
        });
    }
});

/**
 * Get email logs endpoint (for debugging)
 */
app.get('/logs', async (req, res) => {
    try {
        const logFile = path.join(__dirname, 'logs', `email_log_${new Date().toISOString().split('T')[0]}.json`);
        
        try {
            const logs = await fs.readFile(logFile, 'utf8');
            res.json({
                success: true,
                logs: JSON.parse(logs)
            });
        } catch {
            res.json({
                success: true,
                logs: [],
                message: 'No logs found for today'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initialize and start server
async function startServer() {
    try {
        await initializeTransporter();
        
        app.listen(PORT, () => {
            console.log(`📧 Email server running on port ${PORT}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            console.log(`📝 Logs: http://localhost:${PORT}/logs`);
        });
    } catch (error) {
        console.error('Failed to start email server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📧 Email server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📧 Email server shutting down...');
    process.exit(0);
});

// Start the server
startServer();
