/**
 * Email Service Module
 * Handles welcome email functionality with Gmail SMTP integration
 * Provides email sending, template management, and user tracking capabilities
 */

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

// Default email templates
const DEFAULT_EMAIL_TEMPLATES = {
    welcome: {
        subject: 'Welcome to Attendly - Your Attendance Tracking Journey Begins!',
        body: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Attendly</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f7; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #0A84FF, #64D2FF); padding: 40px 30px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .welcome-text { font-size: 18px; color: #1d1d1f; margin-bottom: 20px; }
        .features { background-color: #f5f5f7; padding: 30px; border-radius: 12px; margin: 30px 0; }
        .feature { display: flex; align-items: center; margin-bottom: 15px; }
        .feature-icon { width: 24px; height: 24px; margin-right: 15px; color: #0A84FF; }
        .cta-button { display: inline-block; background: #0A84FF; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
        .footer { background-color: #f5f5f7; padding: 30px; text-align: center; color: #86868b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to Attendly!</h1>
        </div>
        <div class="content">
            <p class="welcome-text">Hello {{userName}},</p>
            <p>We're thrilled to have you join the Attendly community! Your account has been successfully created and you're now ready to start tracking your attendance with ease.</p>
            
            <div class="features">
                <h3 style="color: #1d1d1f; margin-top: 0;">What you can do with Attendly:</h3>
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    <span>Track attendance across multiple subjects</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📈</span>
                    <span>View detailed attendance reports and analytics</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🔔</span>
                    <span>Receive notifications and reminders</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📱</span>
                    <span>Access your data from any device</span>
                </div>
            </div>
            
            <p>Ready to get started? Click the button below to access your dashboard:</p>
            <a href="{{dashboardUrl}}" class="cta-button">Go to Dashboard</a>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, don't hesitate to reach out to our support team.</p>
            
            <p>Best regards,<br>The Attendly Team</p>
        </div>
        <div class="footer">
            <p>This email was sent to {{userEmail}} because you created an account on Attendly.</p>
            <p>© 2024 Attendly. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `.trim()
    }
};

/**
 * Email Service Class
 * Handles all email-related functionality
 */
class EmailService {
    constructor() {
        this.db = null;
        this.initialized = false;
        this.emailTemplates = { ...DEFAULT_EMAIL_TEMPLATES };
    }

    /**
     * Initialize the email service
     */
    async init() {
        try {
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                throw new Error('Firebase not available');
            }

            this.db = firebase.firestore();
            await this.loadEmailTemplates();
            this.initialized = true;
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error);
            throw error;
        }
    }

    /**
     * Load email templates from database
     */
    async loadEmailTemplates() {
        try {
            const templatesDoc = await this.db.collection('emailTemplates').doc('welcome').get();
            
            if (templatesDoc.exists) {
                const data = templatesDoc.data();
                this.emailTemplates.welcome = {
                    subject: data.subject || DEFAULT_EMAIL_TEMPLATES.welcome.subject,
                    body: data.body || DEFAULT_EMAIL_TEMPLATES.welcome.body
                };
                console.log('📧 Email templates loaded from database');
            } else {
                // Create default template in database
                await this.saveEmailTemplate('welcome', DEFAULT_EMAIL_TEMPLATES.welcome);
                console.log('📧 Default email template created in database');
            }
        } catch (error) {
            console.error('❌ Error loading email templates:', error);
            // Fall back to default templates
            this.emailTemplates = { ...DEFAULT_EMAIL_TEMPLATES };
        }
    }

    /**
     * Save email template to database
     */
    async saveEmailTemplate(templateType, template) {
        try {
            if (!this.db) {
                throw new Error('Email service not initialized');
            }

            await this.db.collection('emailTemplates').doc(templateType).set({
                subject: template.subject,
                body: template.body,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser?.email || 'system'
            });

            // Update local cache
            this.emailTemplates[templateType] = template;
            console.log(`✅ Email template '${templateType}' saved successfully`);
        } catch (error) {
            console.error(`❌ Error saving email template '${templateType}':`, error);
            throw error;
        }
    }

    /**
     * Get email template
     */
    getEmailTemplate(templateType) {
        return this.emailTemplates[templateType] || null;
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(userEmail, userName, userId) {
        try {
            if (!this.initialized) {
                await this.init();
            }

            // Check if user has already received welcome email
            const hasReceived = await this.hasReceivedWelcomeEmail(userId);
            if (hasReceived) {
                console.log(`ℹ️ User ${userEmail} has already received welcome email`);
                return { success: true, message: 'Welcome email already sent' };
            }

            const template = this.getEmailTemplate('welcome');
            if (!template) {
                throw new Error('Welcome email template not found');
            }

            // Replace template variables using the helper function
            const templateVariables = {
                userName: userName,
                userEmail: userEmail,
                dashboardUrl: `${window.location.origin}/src/pages/dashboard.html`
            };

            const personalizedSubject = this.processTemplateVariables(template.subject, templateVariables);
            const personalizedBody = this.processTemplateVariables(template.body, templateVariables);

            // Send email using EmailJS (client-side email service)
            const emailData = {
                to_email: userEmail,
                to_name: userName,
                subject: personalizedSubject,
                html_content: personalizedBody,
                from_name: 'Attendly Team',
                from_email: EMAIL_CONFIG.auth.user
            };

            const result = await this.sendEmailViaService(emailData);

            // Mark user email status regardless of success/failure
            await this.markWelcomeEmailSent(userId, userEmail, result);

            if (result.success) {
                console.log(`✅ Welcome email sent successfully to ${userEmail}`);
            } else {
                console.error(`❌ Welcome email failed for ${userEmail}:`, result.error);
            }

            return result;
        } catch (error) {
            console.error('❌ Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send email via real backend service
     */
    async sendEmailViaService(emailData) {
        try {
            console.log('📧 Sending email via backend:', {
                to: emailData.to_email,
                subject: emailData.subject || 'No Subject',
                from: emailData.from_email
            });

            // Validate email data
            const validationResult = this.validateEmailData(emailData);
            if (!validationResult.valid) {
                throw new Error(`Email validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Try PHP email backend first (compatible with Netlify)
            let response, result;

            try {
                console.log('🔄 Trying PHP email backend...');
                response = await fetch('../api/send-email.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(emailData)
                });

                if (response.ok) {
                    result = await response.json();
                    console.log('✅ PHP backend successful');
                } else {
                    throw new Error(`PHP backend failed: ${response.status}`);
                }
            } catch (phpError) {
                console.warn('⚠️ PHP backend failed, trying Node.js fallback:', phpError.message);

                // Fallback to Node.js server (for local development)
                try {
                    const emailServerUrl = 'http://localhost:3002/send-email';
                    response = await fetch(emailServerUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(emailData)
                    });

                    result = await response.json();
                    console.log('✅ Node.js fallback successful');
                } catch (nodeError) {
                    console.error('❌ Both PHP and Node.js backends failed');
                    throw new Error(`Email backends unavailable. PHP: ${phpError.message}, Node.js: ${nodeError.message}`);
                }
            }

            // Log the delivery attempt
            await this.logEmailDelivery(emailData, result);

            if (result.success) {
                console.log('✅ Email sent successfully:', result.messageId);
                return {
                    success: true,
                    messageId: result.messageId,
                    message: result.message || 'Email sent successfully',
                    deliveredAt: result.deliveredAt || new Date().toISOString(),
                    deliveryStatus: result.deliveryStatus || 'delivered',
                    provider: result.provider || 'Gmail SMTP',
                    accepted: result.accepted,
                    rejected: result.rejected
                };
            } else {
                console.warn('⚠️ Email sending failed:', result.error);
                return {
                    success: false,
                    error: result.error || 'Unknown error occurred',
                    deliveryStatus: result.deliveryStatus || 'failed',
                    retryable: !result.error?.includes('Invalid email') && !result.error?.includes('blocked')
                };
            }

        } catch (error) {
            console.error('❌ Email service error:', error);

            // Check if it's a network error (email server not running)
            if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
                const fallbackError = 'Email server is not running. Please start the email server with: npm run email-server';

                // Log error
                await this.logEmailDelivery(emailData, {
                    success: false,
                    error: fallbackError,
                    deliveryStatus: 'service_unavailable'
                });

                return {
                    success: false,
                    error: fallbackError,
                    deliveryStatus: 'service_unavailable',
                    retryable: true
                };
            }

            // Log other errors
            await this.logEmailDelivery(emailData, {
                success: false,
                error: error.message,
                deliveryStatus: 'error'
            });

            return {
                success: false,
                error: error.message,
                deliveryStatus: 'error',
                retryable: true
            };
        }
    }

    /**
     * Validate email data before sending
     */
    validateEmailData(emailData) {
        const errors = [];

        if (!emailData.to_email) {
            errors.push('Recipient email is required');
        } else if (!this.isValidEmail(emailData.to_email)) {
            errors.push('Invalid recipient email format');
        }

        if (!emailData.subject && !emailData.html_content) {
            errors.push('Email must have either subject or content');
        }

        if (!emailData.from_email) {
            errors.push('Sender email is required');
        } else if (!this.isValidEmail(emailData.from_email)) {
            errors.push('Invalid sender email format');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Check if email format is valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Log email delivery attempt
     */
    async logEmailDelivery(emailData, result) {
        try {
            if (!this.db) return;

            const deliveryLog = {
                recipientEmail: emailData.to_email,
                recipientName: emailData.to_name || 'Unknown',
                subject: emailData.subject || 'No Subject',
                fromEmail: emailData.from_email,
                fromName: emailData.from_name || 'System',
                success: result.success,
                messageId: result.messageId || null,
                error: result.error || null,
                deliveryStatus: result.deliveryStatus || 'unknown',
                deliveredAt: result.deliveredAt || firebase.firestore.FieldValue.serverTimestamp(),
                retryable: result.retryable || false,
                provider: result.provider || 'Gmail SMTP',
                userAgent: navigator.userAgent,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add to delivery logs collection
            await this.db.collection('emailDeliveryLogs').add(deliveryLog);

            console.log('📊 Email delivery logged:', {
                to: emailData.to_email,
                success: result.success,
                status: result.deliveryStatus
            });

        } catch (error) {
            console.error('❌ Error logging email delivery:', error);
        }
    }

    /**
     * Get email delivery statistics
     */
    async getEmailDeliveryStats(timeRange = '24h') {
        try {
            if (!this.db) return null;

            // Calculate time range
            const now = new Date();
            let startTime;

            switch (timeRange) {
                case '1h':
                    startTime = new Date(now.getTime() - 60 * 60 * 1000);
                    break;
                case '24h':
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                    break;
                case '7d':
                    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            }

            // Query delivery logs
            const logsSnapshot = await this.db.collection('emailDeliveryLogs')
                .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(startTime))
                .orderBy('timestamp', 'desc')
                .get();

            const stats = {
                total: 0,
                delivered: 0,
                failed: 0,
                pending: 0,
                deliveryRate: 0,
                recentDeliveries: []
            };

            logsSnapshot.forEach(doc => {
                const data = doc.data();
                stats.total++;

                if (data.success) {
                    stats.delivered++;
                } else {
                    stats.failed++;
                }

                // Add to recent deliveries (limit to 10)
                if (stats.recentDeliveries.length < 10) {
                    stats.recentDeliveries.push({
                        recipientEmail: data.recipientEmail,
                        subject: data.subject,
                        success: data.success,
                        deliveryStatus: data.deliveryStatus,
                        timestamp: data.timestamp?.toDate() || new Date(),
                        error: data.error
                    });
                }
            });

            // Calculate delivery rate
            if (stats.total > 0) {
                stats.deliveryRate = Math.round((stats.delivered / stats.total) * 100);
            }

            return stats;

        } catch (error) {
            console.error('❌ Error getting email delivery stats:', error);
            return null;
        }
    }

    /**
     * Check if user has received welcome email
     */
    async hasReceivedWelcomeEmail(userId) {
        try {
            if (!this.db) return false;

            const emailLogDoc = await this.db.collection('emailLogs').doc(userId).get();
            if (!emailLogDoc.exists) return false;

            const data = emailLogDoc.data();
            return data.welcomeEmailSent === true && data.lastAttemptStatus === 'success';
        } catch (error) {
            console.error('❌ Error checking welcome email status:', error);
            return false;
        }
    }

    /**
     * Get user email history
     */
    async getUserEmailHistory(userId) {
        try {
            if (!this.db) return null;

            const emailLogDoc = await this.db.collection('emailLogs').doc(userId).get();
            return emailLogDoc.exists ? emailLogDoc.data() : null;
        } catch (error) {
            console.error('❌ Error getting user email history:', error);
            return null;
        }
    }

    /**
     * Get all email statistics
     */
    async getEmailStatistics() {
        try {
            if (!this.db) return { sent: 0, failed: 0, pending: 0 };

            const emailLogsSnapshot = await this.db.collection('emailLogs').get();

            let sent = 0;
            let failed = 0;
            let pending = 0;

            emailLogsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.welcomeEmailSent) {
                    if (data.lastAttemptStatus === 'success') {
                        sent++;
                    } else if (data.lastAttemptStatus === 'failed') {
                        failed++;
                    } else {
                        pending++;
                    }
                }
            });

            return { sent, failed, pending };
        } catch (error) {
            console.error('❌ Error getting email statistics:', error);
            return { sent: 0, failed: 0, pending: 0 };
        }
    }

    /**
     * Reset user welcome email status (admin only)
     */
    async resetUserWelcomeEmail(userId) {
        try {
            if (!this.db) throw new Error('Database not available');

            await this.db.collection('emailLogs').doc(userId).update({
                welcomeEmailSent: false,
                lastAttemptStatus: 'reset',
                resetAt: firebase.firestore.FieldValue.serverTimestamp(),
                resetBy: firebase.auth().currentUser?.email || 'system'
            });

            console.log(`✅ Reset welcome email status for user ${userId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error resetting welcome email status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark user as having received welcome email
     */
    async markWelcomeEmailSent(userId, userEmail, result = {}) {
        try {
            if (!this.db) return;

            const emailLogData = {
                userId: userId,
                userEmail: userEmail,
                welcomeEmailSent: result.success || false,
                welcomeEmailSentAt: firebase.firestore.FieldValue.serverTimestamp(),
                welcomeEmailAttempts: firebase.firestore.FieldValue.increment(1),
                lastAttemptAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastAttemptStatus: result.success ? 'success' : 'failed',
                lastAttemptError: result.error || null,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add email history entry
            const historyEntry = {
                templateType: 'welcome',
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: result.success ? 'success' : 'failed',
                messageId: result.messageId || null,
                recipientEmail: userEmail,
                subject: this.getEmailTemplate('welcome')?.subject || 'Welcome Email',
                errorMessage: result.error || null,
                userAgent: navigator.userAgent,
                ipAddress: 'client-side' // Would need server-side implementation for real IP
            };

            emailLogData.emailHistory = firebase.firestore.FieldValue.arrayUnion(historyEntry);

            await this.db.collection('emailLogs').doc(userId).set(emailLogData, { merge: true });

            console.log(`✅ Marked welcome email as ${result.success ? 'sent' : 'failed'} for user ${userId}`);
        } catch (error) {
            console.error('❌ Error marking welcome email status:', error);
        }
    }

    /**
     * Log email attempt (for failed attempts)
     */
    async logEmailAttempt(userId, userEmail, templateType, result) {
        try {
            if (!this.db) return;

            const historyEntry = {
                templateType: templateType,
                sentAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: result.success ? 'success' : 'failed',
                messageId: result.messageId || null,
                recipientEmail: userEmail,
                subject: this.getEmailTemplate(templateType)?.subject || 'Email',
                errorMessage: result.error || null,
                userAgent: navigator.userAgent,
                ipAddress: 'client-side'
            };

            await this.db.collection('emailLogs').doc(userId).update({
                emailHistory: firebase.firestore.FieldValue.arrayUnion(historyEntry),
                lastAttemptAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastAttemptStatus: result.success ? 'success' : 'failed',
                lastAttemptError: result.error || null,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`📧 Logged email attempt for user ${userId}: ${result.success ? 'success' : 'failed'}`);
        } catch (error) {
            console.error('❌ Error logging email attempt:', error);
        }
    }

    /**
     * Process template variables in email content
     */
    processTemplateVariables(content, variables = {}) {
        if (!content) return content;

        const defaultVariables = {
            userName: 'User',
            userEmail: 'user@example.com',
            dashboardUrl: `${window.location.origin}/src/pages/dashboard.html`,
            currentDate: new Date().toLocaleDateString(),
            supportEmail: 'support@attendly.com',
            companyName: 'Attendly'
        };

        const data = { ...defaultVariables, ...variables };

        return content.replace(/{{(\w+)}}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Send email with template variable processing
     */
    async sendProcessedEmail(emailData, templateVariables = {}) {
        try {
            // Process template variables in subject and content
            const processedEmailData = {
                ...emailData,
                subject: this.processTemplateVariables(emailData.subject, templateVariables),
                html_content: this.processTemplateVariables(emailData.html_content, templateVariables)
            };

            // Send the processed email
            return await this.sendEmailViaService(processedEmailData);
        } catch (error) {
            console.error('❌ Error sending processed email:', error);
            throw error;
        }
    }

    /**
     * Preview email template with sample data
     */
    previewEmailTemplate(templateType, sampleData = {}) {
        const template = this.getEmailTemplate(templateType);
        if (!template) return null;

        const defaultSampleData = {
            userName: 'John Doe',
            userEmail: 'john.doe@example.com',
            dashboardUrl: `${window.location.origin}/src/pages/dashboard.html`
        };

        const data = { ...defaultSampleData, ...sampleData };

        return {
            subject: this.processTemplateVariables(template.subject, data),
            body: this.processTemplateVariables(template.body, data)
        };
    }
}

// Create global email service instance
window.emailService = new EmailService();

// Auto-initialize when Firebase is ready
function initializeEmailService() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        console.log('🔧 Initializing email service...');
        window.emailService.init().catch(error => {
            console.error('❌ Failed to initialize email service:', error);
        });
    } else {
        console.log('⏳ Waiting for Firebase to be ready...');
        setTimeout(initializeEmailService, 1000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeEmailService();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailService, DEFAULT_EMAIL_TEMPLATES };
}
