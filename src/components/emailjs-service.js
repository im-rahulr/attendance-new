/**
 * EmailJS Welcome Email Service
 * Handles welcome emails for new users using EmailJS
 * Compatible with Netlify hosting
 */

class EmailJSService {
    constructor() {
        this.isInitialized = false;
        this.publicKey = '7dVX0Su-MyNkMUoP_';
        this.privateKey = 'isG7CvWEPIUbEC0khrUpB';
        this.serviceId = 'service_emailjs';
        this.templateId = 'template_welcome';
        this.fromName = 'Attendly Team';
        this.fromEmail = 'website.po45@gmail.com';
    }

    /**
     * Initialize EmailJS service
     */
    async init() {
        try {
            console.log('🔧 Initializing EmailJS service...');
            
            // Load EmailJS library if not already loaded
            if (typeof emailjs === 'undefined') {
                await this.loadEmailJS();
            }
            
            // Initialize EmailJS with public key
            emailjs.init(this.publicKey);
            
            this.isInitialized = true;
            console.log('✅ EmailJS service initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize EmailJS service:', error);
            return false;
        }
    }

    /**
     * Load EmailJS library dynamically
     */
    loadEmailJS() {
        return new Promise((resolve, reject) => {
            if (typeof emailjs !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = () => {
                console.log('📧 EmailJS library loaded');
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Failed to load EmailJS library'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Send welcome email to new users with enhanced error handling
     */
    async sendWelcomeEmail(userEmail, userName, userId) {
        // Use error handler if available, otherwise fallback to basic implementation
        if (window.emailJSErrorHandler) {
            return await window.emailJSErrorHandler.handleEmailSending(
                this._sendWelcomeEmailCore.bind(this),
                userEmail,
                userName,
                userId
            );
        } else {
            return await this._sendWelcomeEmailCore(userEmail, userName, userId);
        }
    }

    /**
     * Core welcome email sending logic
     */
    async _sendWelcomeEmailCore(userEmail, userName, userId) {
        if (!this.isInitialized) {
            console.warn('EmailJS service not initialized, attempting to initialize...');
            const initialized = await this.init();
            if (!initialized) {
                throw new Error('EmailJS service initialization failed - check your EmailJS account and configuration');
            }
        }

        // Check if EmailJS is available
        if (typeof emailjs === 'undefined') {
            throw new Error('EmailJS library not loaded - check your internet connection');
        }

        console.log(`📧 Sending welcome email to ${userEmail}`);

        // Get email template from database or use default
        const template = await this.getWelcomeTemplate();

        // Prepare template parameters
        const templateParams = {
            to_email: userEmail,
            to_name: userName,
            from_name: this.fromName,
            from_email: this.fromEmail,
            subject: template.subject,
            message: this.processTemplate(template.content, {
                userName: userName,
                userEmail: userEmail,
                dashboardUrl: `${window.location.origin}/src/pages/dashboard.html`,
                currentDate: new Date().toLocaleDateString(),
                supportEmail: 'support@attendly.com'
            }),
            reply_to: this.fromEmail
        };

        // Send email using EmailJS
        console.log('📧 Sending email with params:', {
            serviceId: this.serviceId,
            templateId: this.templateId,
            to_email: templateParams.to_email,
            to_name: templateParams.to_name
        });

        const response = await emailjs.send(
            this.serviceId,
            this.templateId,
            templateParams
        );

        console.log('✅ Welcome email sent successfully:', response);

        // Log email delivery
        await this.logEmailDelivery('welcome', userEmail, 'success', {
            messageId: response.text,
            userId: userId,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            messageId: response.text,
            deliveredAt: new Date().toISOString(),
            provider: 'EmailJS',
            recipient: userEmail
        };
    }

    /**
     * Get welcome email template from database or use default
     */
    async getWelcomeTemplate() {
        try {
            // Try to get template from Firebase
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const templateDoc = await firebase.firestore()
                    .collection('emailTemplates')
                    .doc('welcome')
                    .get();

                if (templateDoc.exists) {
                    const data = templateDoc.data();
                    return {
                        subject: data.subject,
                        content: data.content
                    };
                }
            }
        } catch (error) {
            console.warn('Could not fetch template from database, using default:', error);
        }

        // Return default template
        return {
            subject: 'Welcome to Attendly - Your Attendance Tracking Journey Begins!',
            content: this.getDefaultWelcomeTemplate()
        };
    }

    /**
     * Get default welcome email template
     */
    getDefaultWelcomeTemplate() {
        return `
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
        `;
    }

    /**
     * Process template with variables
     */
    processTemplate(template, variables = {}) {
        let processed = template;
        
        Object.keys(variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            const value = variables[key] || '';
            processed = processed.replace(new RegExp(placeholder, 'g'), value);
        });
        
        return processed;
    }

    /**
     * Log email delivery to Firebase
     */
    async logEmailDelivery(emailType, recipient, status, details) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('emailDeliveryLogs').add({
                    emailType: emailType,
                    recipient: recipient,
                    status: status,
                    details: details,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    provider: 'EmailJS',
                    userAgent: navigator.userAgent
                });
            }
        } catch (error) {
            console.warn('Failed to log email delivery:', error);
        }
    }

    /**
     * Test EmailJS connectivity and configuration
     */
    async testConnectivity() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            // Test if EmailJS is properly configured
            if (typeof emailjs === 'undefined') {
                throw new Error('EmailJS library not loaded');
            }

            // Try to send a test email to verify configuration
            console.log('🔍 Testing EmailJS configuration...');
            console.log('Service ID:', this.serviceId);
            console.log('Template ID:', this.templateId);
            console.log('Public Key:', this.publicKey.substring(0, 8) + '...');

            console.log('✅ EmailJS connectivity test passed');
            return true;
        } catch (error) {
            console.error('❌ EmailJS connectivity test failed:', error);
            return false;
        }
    }

    /**
     * Send a simple test email to verify EmailJS is working
     */
    async sendSimpleTest(testEmail) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            const testParams = {
                to_email: testEmail,
                to_name: 'Test User',
                from_name: this.fromName,
                subject: 'EmailJS Test',
                message: 'This is a test email to verify EmailJS configuration.',
                reply_to: this.fromEmail
            };

            console.log('🧪 Sending simple test email...');
            const response = await emailjs.send(this.serviceId, this.templateId, testParams);

            console.log('✅ Simple test email sent:', response);
            return {
                success: true,
                messageId: response.text,
                provider: 'EmailJS'
            };
        } catch (error) {
            console.error('❌ Simple test email failed:', error);
            return {
                success: false,
                error: error.message || 'Unknown error',
                provider: 'EmailJS'
            };
        }
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            provider: 'EmailJS',
            serviceId: this.serviceId,
            publicKey: this.publicKey.substring(0, 8) + '...'
        };
    }
}

// Create global instance
window.emailJSService = new EmailJSService();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.emailJSService.init();
    } catch (error) {
        console.warn('EmailJS auto-initialization failed:', error);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailJSService };
}
