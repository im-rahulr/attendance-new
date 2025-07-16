/**
 * Client-side Email Service for lowrybunks
 * Uses EmailJS for sending emails without requiring a backend server
 */

class EmailService {
    constructor() {
        this.isInitialized = false;
        this.emailjsConfig = {
            serviceId: 'service_lowrybunks', // You'll need to set this up in EmailJS
            templateId: 'template_contact_form',
            userId: 'your_emailjs_user_id' // You'll need to get this from EmailJS
        };
        this.adminEmail = 'rahulhitwo@gmail.com';
        this.fromEmail = 'website.po45@gmail.com';
    }

    /**
     * Initialize EmailJS (if available)
     */
    async initialize() {
        try {
            // Check if EmailJS is available
            if (typeof emailjs !== 'undefined') {
                emailjs.init(this.emailjsConfig.userId);
                this.isInitialized = true;
                console.log('EmailJS initialized successfully');
                return true;
            } else {
                console.warn('EmailJS not available, falling back to alternative methods');
                return false;
            }
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
            return false;
        }
    }

    /**
     * Send confirmation email to user
     */
    async sendConfirmationEmail(contactData) {
        try {
            console.log('Attempting to send confirmation email to:', contactData.email);

            // Method 1: Try EmailJS if available
            if (this.isInitialized && typeof emailjs !== 'undefined') {
                return await this.sendViaEmailJS(contactData);
            }

            // Method 2: Try backend email service
            return await this.sendViaBackend(contactData);

        } catch (error) {
            console.error('All email sending methods failed:', error);
            throw new Error('Unable to send confirmation email');
        }
    }

    /**
     * Send email via EmailJS
     */
    async sendViaEmailJS(contactData) {
        try {
            const templateParams = {
                to_email: contactData.email,
                to_name: contactData.name,
                from_name: 'lowrybunks Team',
                subject: 'Contact Form Confirmation - lowrybunks',
                message: this.generateConfirmationEmailHTML(contactData),
                reply_to: this.fromEmail
            };

            const response = await emailjs.send(
                this.emailjsConfig.serviceId,
                this.emailjsConfig.templateId,
                templateParams
            );

            console.log('Email sent via EmailJS:', response);
            return { success: true, method: 'emailjs', response };

        } catch (error) {
            console.error('EmailJS sending failed:', error);
            throw error;
        }
    }

    /**
     * Send email via backend service
     */
    async sendViaBackend(contactData) {
        const emailData = {
            to_email: contactData.email,
            to_name: contactData.name,
            subject: 'Contact Form Confirmation - lowrybunks',
            html_content: this.generateConfirmationEmailHTML(contactData),
            from_name: 'lowrybunks Team',
            from_email: this.fromEmail
        };

        // Try Node.js email server first
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Email sent via Node.js backend:', result);
                return { success: true, method: 'nodejs', response: result };
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (nodeError) {
            console.warn('Node.js email service failed, trying PHP:', nodeError.message);

            // Try PHP email service as fallback
            try {
                const phpResponse = await fetch('../api/send-email.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to_email: contactData.email,
                        to_name: contactData.name,
                        subject: 'Contact Form Confirmation - lowrybunks',
                        message: this.generateConfirmationEmailText(contactData),
                        from_email: this.fromEmail
                    })
                });

                if (phpResponse.ok) {
                    const result = await phpResponse.json();
                    console.log('Email sent via PHP backend:', result);
                    return { success: true, method: 'php', response: result };
                } else {
                    throw new Error(`PHP service failed: ${phpResponse.status}`);
                }
            } catch (phpError) {
                console.error('PHP email service also failed:', phpError);
                throw new Error('All backend email services failed');
            }
        }
    }

    /**
     * Send notification to admin
     */
    async sendAdminNotification(contactData) {
        try {
            const adminEmailData = {
                to_email: this.adminEmail,
                to_name: 'Admin',
                subject: `New Contact Form Submission - ${contactData.subject}`,
                html_content: this.generateAdminNotificationHTML(contactData),
                from_name: 'lowrybunks System',
                from_email: this.fromEmail
            };

            // Try to send admin notification
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(adminEmailData)
            });

            if (response.ok) {
                console.log('Admin notification sent successfully');
                return { success: true };
            } else {
                console.warn('Admin notification failed:', response.statusText);
                return { success: false, error: response.statusText };
            }

        } catch (error) {
            console.error('Failed to send admin notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate confirmation email HTML
     */
    generateConfirmationEmailHTML(contactData) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #333; margin: 0; font-size: 24px;">lowrybunks</h1>
                        <p style="color: #666; margin: 5px 0 0 0;">Attendance Management System</p>
                    </div>
                    
                    <h2 style="color: #333; margin-bottom: 20px;">Thank you for contacting us!</h2>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        Dear ${contactData.name},
                    </p>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        We have received your message and will get back to you as soon as possible. Here's a summary of your submission:
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${this.formatSubject(contactData.subject)}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
                        <p style="margin: 0; padding: 10px; background-color: #ffffff; border-radius: 4px; border-left: 4px solid #007bff;">${contactData.message}</p>
                    </div>
                    
                    <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                        Our team typically responds within 24-48 hours during business days. If your inquiry is urgent, please contact your institution's designated representative.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #888; font-size: 14px; margin: 0;">
                            This is an automated confirmation email. Please do not reply to this message.
                        </p>
                        <p style="color: #888; font-size: 14px; margin: 10px 0 0 0;">
                            © 2025 CodeCraft. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate confirmation email text (fallback)
     */
    generateConfirmationEmailText(contactData) {
        return `
Dear ${contactData.name},

Thank you for contacting lowrybunks!

We have received your message regarding "${this.formatSubject(contactData.subject)}" and will get back to you as soon as possible.

Your message:
"${contactData.message}"

Our team typically responds within 24-48 hours during business days.

Best regards,
The lowrybunks Team

---
This is an automated confirmation email.
© 2025 CodeCraft. All rights reserved.
        `.trim();
    }

    /**
     * Generate admin notification email HTML
     */
    generateAdminNotificationHTML(contactData) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">New Contact Form Submission</h2>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Name:</strong> ${contactData.name}</p>
                    <p><strong>Email:</strong> ${contactData.email}</p>
                    <p><strong>Subject:</strong> ${this.formatSubject(contactData.subject)}</p>
                    <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                    <h3>Message:</h3>
                    <p style="white-space: pre-wrap;">${contactData.message}</p>
                </div>
                
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Please log into the admin panel to respond to this inquiry.
                </p>
            </div>
        `;
    }

    /**
     * Format subject for display
     */
    formatSubject(subject) {
        const subjects = {
            'technical-support': 'Technical Support',
            'feature-request': 'Feature Request',
            'bug-report': 'Bug Report',
            'partnership': 'Partnership Inquiry',
            'general': 'General Inquiry',
            'other': 'Other'
        };
        return subjects[subject] || subject;
    }

    /**
     * Test email service
     */
    async testEmailService() {
        const testData = {
            name: 'Test User',
            email: this.adminEmail,
            subject: 'technical-support',
            message: 'This is a test message to verify the email service is working correctly.'
        };

        try {
            const result = await this.sendConfirmationEmail(testData);
            console.log('Email service test successful:', result);
            return result;
        } catch (error) {
            console.error('Email service test failed:', error);
            throw error;
        }
    }
}

// Create global instance
window.emailService = new EmailService();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.emailService.initialize();
    });
} else {
    window.emailService.initialize();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}
