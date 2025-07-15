/**
 * Email Troubleshooting System
 * Provides comprehensive troubleshooting and notification system for email delivery issues
 */

// Troubleshooting state management
window.emailTroubleshooting = {
    activeSession: null,
    issueReports: [],
    systemChecks: {},
    notifications: []
};

/**
 * Initialize email troubleshooting system
 */
function initializeEmailTroubleshooting() {
    console.log('🔧 Initializing email troubleshooting system...');
    
    // Set up notification system
    setupNotificationSystem();
    
    // Set up periodic system checks
    setupPeriodicSystemChecks();
    
    // Load previous issue reports
    loadPreviousIssueReports();
    
    console.log('✅ Email troubleshooting system initialized');
}

/**
 * Set up notification system
 */
function setupNotificationSystem() {
    try {
        // Create notification container if it doesn't exist
        if (!document.getElementById('emailNotificationContainer')) {
            const container = document.createElement('div');
            container.id = 'emailNotificationContainer';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        console.log('📢 Notification system set up');
    } catch (error) {
        console.error('❌ Error setting up notification system:', error);
    }
}

/**
 * Show notification
 */
function showEmailNotification(title, message, type = 'info', duration = 5000) {
    try {
        const container = document.getElementById('emailNotificationContainer');
        if (!container) return;
        
        const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Determine notification style based on type
        let bgClass = 'bg-primary';
        let icon = 'info-circle';
        
        switch (type) {
            case 'success':
                bgClass = 'bg-success';
                icon = 'check-circle';
                break;
            case 'warning':
                bgClass = 'bg-warning';
                icon = 'exclamation-triangle';
                break;
            case 'error':
            case 'danger':
                bgClass = 'bg-danger';
                icon = 'exclamation-circle';
                break;
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = `toast align-items-center text-white ${bgClass} border-0 mb-2`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.setAttribute('aria-atomic', 'true');
        
        notification.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-${icon} me-2"></i>
                        <div>
                            <strong>${title}</strong>
                            <div class="small">${message}</div>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        // Add to container
        container.appendChild(notification);
        
        // Initialize and show toast
        const toast = new bootstrap.Toast(notification, {
            delay: duration,
            autohide: duration > 0
        });
        
        toast.show();
        
        // Store notification
        window.emailTroubleshooting.notifications.push({
            id: notificationId,
            title: title,
            message: message,
            type: type,
            timestamp: new Date(),
            duration: duration
        });
        
        // Remove from DOM after hiding
        notification.addEventListener('hidden.bs.toast', function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        
        console.log('📢 Notification shown:', { title, type });
        
    } catch (error) {
        console.error('❌ Error showing notification:', error);
    }
}

/**
 * Report email delivery issue
 */
function reportEmailDeliveryIssue(email, issueType, details = {}) {
    try {
        const issueReport = {
            id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: email,
            issueType: issueType, // 'not_received', 'spam_folder', 'delayed', 'bounced'
            details: details,
            timestamp: new Date(),
            status: 'reported',
            troubleshootingSteps: [],
            resolved: false
        };
        
        // Store issue report
        window.emailTroubleshooting.issueReports.push(issueReport);
        
        // Save to localStorage for persistence
        saveIssueReports();
        
        // Start troubleshooting session
        startTroubleshootingSession(issueReport);
        
        // Show notification
        showEmailNotification(
            'Email Delivery Issue Reported',
            `Issue reported for ${email}. Starting troubleshooting...`,
            'warning',
            8000
        );
        
        console.log('📋 Email delivery issue reported:', issueReport);
        
        return issueReport;
        
    } catch (error) {
        console.error('❌ Error reporting email delivery issue:', error);
        return null;
    }
}

/**
 * Start troubleshooting session
 */
function startTroubleshootingSession(issueReport) {
    try {
        const session = {
            id: `session_${Date.now()}`,
            issueReportId: issueReport.id,
            startTime: new Date(),
            steps: [],
            currentStep: 0,
            status: 'active'
        };
        
        // Set as active session
        window.emailTroubleshooting.activeSession = session;
        
        // Generate troubleshooting steps based on issue type
        const steps = generateTroubleshootingSteps(issueReport.issueType);
        session.steps = steps;
        
        // Show first troubleshooting step
        showTroubleshootingStep(session, 0);
        
        console.log('🔧 Troubleshooting session started:', session);
        
    } catch (error) {
        console.error('❌ Error starting troubleshooting session:', error);
    }
}

/**
 * Generate troubleshooting steps based on issue type
 */
function generateTroubleshootingSteps(issueType) {
    const commonSteps = [
        {
            title: 'Check Spam/Junk Folder',
            description: 'Look for the email in your spam, junk, or promotions folder',
            action: 'check_spam',
            estimated_time: '1-2 minutes'
        },
        {
            title: 'Verify Email Address',
            description: 'Confirm the email address is correct and properly formatted',
            action: 'verify_email',
            estimated_time: '30 seconds'
        }
    ];
    
    const specificSteps = {
        'not_received': [
            ...commonSteps,
            {
                title: 'Check Email Provider Settings',
                description: 'Verify your email provider is not blocking emails from our domain',
                action: 'check_provider_settings',
                estimated_time: '2-3 minutes'
            },
            {
                title: 'Add Sender to Contacts',
                description: 'Add website.po45@gmail.com to your contacts or safe sender list',
                action: 'add_to_contacts',
                estimated_time: '1 minute'
            }
        ],
        'spam_folder': [
            {
                title: 'Mark as Not Spam',
                description: 'Mark the email as "Not Spam" or "Not Junk" in your email client',
                action: 'mark_not_spam',
                estimated_time: '30 seconds'
            },
            {
                title: 'Add Sender to Contacts',
                description: 'Add website.po45@gmail.com to your contacts to prevent future filtering',
                action: 'add_to_contacts',
                estimated_time: '1 minute'
            }
        ],
        'delayed': [
            ...commonSteps,
            {
                title: 'Wait for Delivery',
                description: 'Email delivery can sometimes be delayed. Wait 10-15 minutes and check again',
                action: 'wait_for_delivery',
                estimated_time: '10-15 minutes'
            }
        ],
        'bounced': [
            {
                title: 'Verify Email Address',
                description: 'Check that the email address is correct and active',
                action: 'verify_email',
                estimated_time: '1 minute'
            },
            {
                title: 'Check Mailbox Space',
                description: 'Ensure your mailbox has sufficient space to receive new emails',
                action: 'check_mailbox_space',
                estimated_time: '1 minute'
            }
        ]
    };
    
    return specificSteps[issueType] || commonSteps;
}

/**
 * Show troubleshooting step
 */
function showTroubleshootingStep(session, stepIndex) {
    try {
        if (!session.steps || stepIndex >= session.steps.length) {
            completeTroubleshootingSession(session);
            return;
        }
        
        const step = session.steps[stepIndex];
        session.currentStep = stepIndex;
        
        // Show step notification
        showEmailNotification(
            `Troubleshooting Step ${stepIndex + 1}/${session.steps.length}`,
            `${step.title}: ${step.description}`,
            'info',
            0 // Don't auto-hide
        );
        
        // Update troubleshooting modal if open
        updateTroubleshootingModal(session, step);
        
        console.log('🔧 Showing troubleshooting step:', step);
        
    } catch (error) {
        console.error('❌ Error showing troubleshooting step:', error);
    }
}

/**
 * Complete troubleshooting step
 */
function completeTroubleshootingStep(session, stepIndex, success = false, notes = '') {
    try {
        if (!session.steps || stepIndex >= session.steps.length) return;
        
        const step = session.steps[stepIndex];
        step.completed = true;
        step.success = success;
        step.notes = notes;
        step.completedAt = new Date();
        
        // Move to next step or complete session
        if (success) {
            // Issue resolved
            completeTroubleshootingSession(session, true);
        } else if (stepIndex + 1 < session.steps.length) {
            // Move to next step
            showTroubleshootingStep(session, stepIndex + 1);
        } else {
            // All steps completed without resolution
            completeTroubleshootingSession(session, false);
        }
        
        console.log('✅ Troubleshooting step completed:', step);
        
    } catch (error) {
        console.error('❌ Error completing troubleshooting step:', error);
    }
}

/**
 * Complete troubleshooting session
 */
function completeTroubleshootingSession(session, resolved = false) {
    try {
        session.status = 'completed';
        session.endTime = new Date();
        session.resolved = resolved;
        
        // Update issue report
        const issueReport = window.emailTroubleshooting.issueReports.find(
            report => report.id === session.issueReportId
        );
        
        if (issueReport) {
            issueReport.resolved = resolved;
            issueReport.status = resolved ? 'resolved' : 'unresolved';
            issueReport.troubleshootingSteps = session.steps;
        }
        
        // Clear active session
        window.emailTroubleshooting.activeSession = null;
        
        // Save issue reports
        saveIssueReports();
        
        // Show completion notification
        if (resolved) {
            showEmailNotification(
                'Issue Resolved',
                'Great! The email delivery issue has been resolved.',
                'success',
                5000
            );
        } else {
            showEmailNotification(
                'Additional Support Needed',
                'We couldn\'t resolve the issue automatically. Please contact technical support.',
                'warning',
                8000
            );
        }
        
        console.log('🏁 Troubleshooting session completed:', session);
        
    } catch (error) {
        console.error('❌ Error completing troubleshooting session:', error);
    }
}

/**
 * Set up periodic system checks
 */
function setupPeriodicSystemChecks() {
    try {
        // Check system health every 5 minutes
        setInterval(performSystemHealthCheck, 5 * 60 * 1000);
        
        // Perform initial check
        performSystemHealthCheck();
        
        console.log('⏰ Periodic system checks set up');
    } catch (error) {
        console.error('❌ Error setting up periodic system checks:', error);
    }
}

/**
 * Perform system health check
 */
async function performSystemHealthCheck() {
    try {
        const checks = {
            emailService: checkEmailServiceHealth(),
            firebaseConnection: checkFirebaseConnection(),
            smtpConnection: await checkSMTPConnection(),
            lastEmailDelivery: await checkLastEmailDelivery()
        };
        
        // Store check results
        window.emailTroubleshooting.systemChecks = {
            ...checks,
            timestamp: new Date(),
            overall: Object.values(checks).every(check => check.status === 'healthy')
        };
        
        // Show warning if any checks fail
        const failedChecks = Object.entries(checks).filter(([key, check]) => check.status !== 'healthy');
        
        if (failedChecks.length > 0) {
            showEmailNotification(
                'System Health Warning',
                `${failedChecks.length} system check(s) failed. Email delivery may be affected.`,
                'warning',
                10000
            );
        }
        
        console.log('🏥 System health check completed:', checks);
        
    } catch (error) {
        console.error('❌ Error performing system health check:', error);
    }
}

/**
 * Check email service health
 */
function checkEmailServiceHealth() {
    try {
        const isHealthy = window.emailService && window.emailService.initialized;
        
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? 'Email service is running' : 'Email service is not initialized',
            details: {
                serviceAvailable: !!window.emailService,
                initialized: window.emailService?.initialized || false
            }
        };
    } catch (error) {
        return {
            status: 'error',
            message: `Error checking email service: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Check Firebase connection
 */
function checkFirebaseConnection() {
    try {
        const isHealthy = typeof firebase !== 'undefined' && firebase.firestore && firebase.auth;
        
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? 'Firebase connection is active' : 'Firebase connection issues detected',
            details: {
                firebaseAvailable: typeof firebase !== 'undefined',
                firestoreAvailable: !!firebase?.firestore,
                authAvailable: !!firebase?.auth
            }
        };
    } catch (error) {
        return {
            status: 'error',
            message: `Error checking Firebase connection: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Check SMTP connection (simulated)
 */
async function checkSMTPConnection() {
    try {
        // In a real implementation, this would test the actual SMTP connection
        // For now, we'll simulate the check
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            status: 'healthy',
            message: 'SMTP connection is active',
            details: {
                host: 'smtp.gmail.com',
                port: 587,
                secure: false
            }
        };
    } catch (error) {
        return {
            status: 'error',
            message: `Error checking SMTP connection: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Check last email delivery
 */
async function checkLastEmailDelivery() {
    try {
        if (!window.emailService || !window.emailService.getEmailDeliveryStats) {
            return {
                status: 'unknown',
                message: 'Cannot check email delivery stats',
                details: {}
            };
        }
        
        const stats = await window.emailService.getEmailDeliveryStats('1h');
        
        if (!stats) {
            return {
                status: 'unknown',
                message: 'No delivery stats available',
                details: {}
            };
        }
        
        const isHealthy = stats.deliveryRate >= 80; // 80% delivery rate threshold
        
        return {
            status: isHealthy ? 'healthy' : 'warning',
            message: isHealthy ? 
                `Email delivery rate is ${stats.deliveryRate}%` : 
                `Low email delivery rate: ${stats.deliveryRate}%`,
            details: stats
        };
        
    } catch (error) {
        return {
            status: 'error',
            message: `Error checking email delivery: ${error.message}`,
            details: { error: error.message }
        };
    }
}

/**
 * Save issue reports to localStorage
 */
function saveIssueReports() {
    try {
        localStorage.setItem('emailIssueReports', JSON.stringify(window.emailTroubleshooting.issueReports));
    } catch (error) {
        console.error('❌ Error saving issue reports:', error);
    }
}

/**
 * Load previous issue reports
 */
function loadPreviousIssueReports() {
    try {
        const saved = localStorage.getItem('emailIssueReports');
        if (saved) {
            window.emailTroubleshooting.issueReports = JSON.parse(saved);
            console.log('📋 Loaded previous issue reports:', window.emailTroubleshooting.issueReports.length);
        }
    } catch (error) {
        console.error('❌ Error loading previous issue reports:', error);
    }
}

/**
 * Update troubleshooting modal with current step
 */
function updateTroubleshootingModal(session, step) {
    try {
        // This function would update the troubleshooting modal UI
        // Implementation depends on the specific modal structure
        console.log('🔧 Updating troubleshooting modal:', { session, step });
    } catch (error) {
        console.error('❌ Error updating troubleshooting modal:', error);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeEmailTroubleshooting();
});

// Export functions for global access
window.emailTroubleshooting.functions = {
    showNotification: showEmailNotification,
    reportIssue: reportEmailDeliveryIssue,
    startSession: startTroubleshootingSession,
    completeStep: completeTroubleshootingStep,
    performHealthCheck: performSystemHealthCheck
};
