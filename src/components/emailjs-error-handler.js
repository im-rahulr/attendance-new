/**
 * EmailJS Error Handler and Delivery Confirmation
 * Enhanced error handling, retry logic, and delivery confirmation for EmailJS
 */

class EmailJSErrorHandler {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
        this.deliveryConfirmations = new Map();
        this.errorLog = [];
    }

    /**
     * Handle email sending with retry logic and error handling
     */
    async handleEmailSending(emailFunction, ...args) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`📧 Email sending attempt ${attempt}/${this.maxRetries}`);
                
                const result = await emailFunction(...args);
                
                if (result.success) {
                    console.log('✅ Email sent successfully on attempt', attempt);
                    
                    // Log successful delivery
                    await this.logDeliverySuccess(result, attempt);
                    
                    // Send delivery confirmation
                    this.sendDeliveryConfirmation(result);
                    
                    return result;
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
                
            } catch (error) {
                lastError = error;
                console.warn(`❌ Email sending attempt ${attempt} failed:`, error.message);
                
                // Log the error
                this.logError(error, attempt, args);
                
                // If this isn't the last attempt, wait before retrying
                if (attempt < this.maxRetries) {
                    console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
                    await this.delay(this.retryDelay);
                    
                    // Increase delay for next retry (exponential backoff)
                    this.retryDelay *= 1.5;
                }
            }
        }
        
        // All attempts failed
        console.error('❌ All email sending attempts failed');
        
        // Log final failure
        await this.logDeliveryFailure(lastError, args);
        
        // Send failure notification to admin
        this.sendFailureNotification(lastError, args);
        
        return {
            success: false,
            error: lastError.message,
            attempts: this.maxRetries,
            provider: 'EmailJS'
        };
    }

    /**
     * Log successful email delivery
     */
    async logDeliverySuccess(result, attempt) {
        try {
            const logEntry = {
                status: 'success',
                messageId: result.messageId,
                deliveredAt: result.deliveredAt,
                provider: result.provider,
                attempts: attempt,
                timestamp: new Date().toISOString()
            };

            // Store in memory for quick access
            this.deliveryConfirmations.set(result.messageId, logEntry);

            // Log to Firebase if available
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('emailDeliveryLogs').add({
                    ...logEntry,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            console.log('📝 Delivery success logged:', logEntry);
        } catch (error) {
            console.warn('Failed to log delivery success:', error);
        }
    }

    /**
     * Log email delivery failure
     */
    async logDeliveryFailure(error, args) {
        try {
            const logEntry = {
                status: 'failed',
                error: error.message,
                attempts: this.maxRetries,
                timestamp: new Date().toISOString(),
                args: args.length > 0 ? { recipient: args[0] } : {}
            };

            // Store in error log
            this.errorLog.push(logEntry);

            // Log to Firebase if available
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('emailDeliveryLogs').add({
                    ...logEntry,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            console.log('📝 Delivery failure logged:', logEntry);
        } catch (error) {
            console.warn('Failed to log delivery failure:', error);
        }
    }

    /**
     * Log individual error attempts
     */
    logError(error, attempt, args) {
        const errorEntry = {
            error: error.message,
            attempt: attempt,
            timestamp: new Date().toISOString(),
            recipient: args.length > 0 ? args[0] : 'unknown'
        };

        this.errorLog.push(errorEntry);
        
        // Keep only last 100 errors in memory
        if (this.errorLog.length > 100) {
            this.errorLog = this.errorLog.slice(-100);
        }
    }

    /**
     * Send delivery confirmation notification
     */
    sendDeliveryConfirmation(result) {
        try {
            // Create a user-friendly notification
            const notification = {
                type: 'email_delivery_success',
                title: 'Email Delivered Successfully',
                message: `Welcome email delivered to ${result.recipient || 'user'}`,
                timestamp: new Date().toISOString(),
                data: {
                    messageId: result.messageId,
                    provider: result.provider
                }
            };

            // Show browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }

            // Log to console for admin visibility
            console.log('📬 Delivery confirmation:', notification);

            // Trigger custom event for other components
            window.dispatchEvent(new CustomEvent('emailDeliveryConfirmed', {
                detail: notification
            }));

        } catch (error) {
            console.warn('Failed to send delivery confirmation:', error);
        }
    }

    /**
     * Send failure notification to admin
     */
    sendFailureNotification(error, args) {
        try {
            const notification = {
                type: 'email_delivery_failure',
                title: 'Email Delivery Failed',
                message: `Failed to send welcome email: ${error.message}`,
                timestamp: new Date().toISOString(),
                data: {
                    error: error.message,
                    recipient: args.length > 0 ? args[0] : 'unknown',
                    attempts: this.maxRetries
                }
            };

            // Show browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notification.title, {
                    body: notification.message,
                    icon: '/favicon.ico'
                });
            }

            // Log error for admin visibility
            console.error('📮 Delivery failure notification:', notification);

            // Trigger custom event for other components
            window.dispatchEvent(new CustomEvent('emailDeliveryFailed', {
                detail: notification
            }));

            // Send to admin email if configured
            this.notifyAdminOfFailure(notification);

        } catch (error) {
            console.warn('Failed to send failure notification:', error);
        }
    }

    /**
     * Notify admin of email delivery failure
     */
    async notifyAdminOfFailure(notification) {
        try {
            // Store admin notification in Firebase for admin panel
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore().collection('adminNotifications').add({
                    type: 'email_failure',
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    isRead: false,
                    priority: 'high',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.warn('Failed to notify admin of failure:', error);
        }
    }

    /**
     * Get delivery confirmation status
     */
    getDeliveryStatus(messageId) {
        return this.deliveryConfirmations.get(messageId) || null;
    }

    /**
     * Get recent error log
     */
    getRecentErrors(limit = 10) {
        return this.errorLog.slice(-limit);
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        console.log('📝 Error log cleared');
    }

    /**
     * Get delivery statistics
     */
    getDeliveryStats() {
        const confirmations = Array.from(this.deliveryConfirmations.values());
        const errors = this.errorLog;

        return {
            totalDeliveries: confirmations.length,
            successfulDeliveries: confirmations.filter(c => c.status === 'success').length,
            failedDeliveries: errors.filter(e => e.attempt === this.maxRetries).length,
            averageAttempts: confirmations.reduce((sum, c) => sum + c.attempts, 0) / confirmations.length || 0,
            recentErrors: errors.slice(-5)
        };
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            console.log('📱 Notification permission:', permission);
            return permission === 'granted';
        }
        return false;
    }
}

// Create global instance
window.emailJSErrorHandler = new EmailJSErrorHandler();

// Auto-request notification permission
document.addEventListener('DOMContentLoaded', () => {
    window.emailJSErrorHandler.requestNotificationPermission();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailJSErrorHandler };
}
