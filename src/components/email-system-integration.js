/**
 * Email System Integration
 * Ensures all email system components work together properly
 * Provides initialization and coordination between components
 */

// Global email system state
window.emailSystemState = {
    initialized: false,
    serviceReady: false,
    adminPanelReady: false,
    authIntegrated: false
};

/**
 * Initialize the complete email system
 */
async function initializeEmailSystem() {
    console.log('🚀 Initializing complete email system...');

    try {
        // Wait for Firebase to be ready
        await waitForFirebase();

        // Initialize email service
        if (window.emailService) {
            await window.emailService.init();
            window.emailSystemState.serviceReady = true;
            console.log('✅ Email service initialized');
        }

        // Set up authentication integration
        setupAuthIntegration();

        // Initialize admin panel integration if on admin page
        if (document.getElementById('email-templates-tab')) {
            setupAdminPanelIntegration();
        }

        // Initialize troubleshooting system if available
        if (window.emailTroubleshooting) {
            window.emailSystemState.troubleshootingReady = true;
            console.log('✅ Email troubleshooting system available');
        }

        window.emailSystemState.initialized = true;
        console.log('✅ Email system fully initialized');

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('emailSystemReady', {
            detail: { state: window.emailSystemState }
        }));

    } catch (error) {
        console.error('❌ Email system initialization failed:', error);
        throw error;
    }
}

/**
 * Wait for Firebase to be ready
 */
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && firebase.firestore && firebase.auth) {
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase initialization timeout'));
            } else {
                setTimeout(checkFirebase, 1000);
            }
        };
        
        checkFirebase();
    });
}

/**
 * Set up authentication integration
 */
function setupAuthIntegration() {
    try {
        // Ensure auth state change listener includes email system
        if (firebase.auth) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user && window.emailService) {
                    // Check if this is a new user who needs welcome email
                    try {
                        const userDoc = await firebase.firestore()
                            .collection('users')
                            .doc(user.uid)
                            .get();
                        
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            
                            // Check for first-time login
                            if (userData.isNewUser === true && userData.firstLoginPending === true) {
                                console.log('🎉 New user detected, preparing welcome email...');
                                
                                // Small delay to ensure user document is fully updated
                                setTimeout(async () => {
                                    try {
                                        const result = await window.emailService.sendWelcomeEmail(
                                            user.email,
                                            user.displayName || userData.name || 'Valued User',
                                            user.uid
                                        );
                                        
                                        if (result.success) {
                                            console.log('✅ Welcome email sent successfully');
                                        } else {
                                            console.warn('⚠️ Welcome email failed:', result.error);
                                        }
                                    } catch (error) {
                                        console.error('❌ Error sending welcome email:', error);
                                    }
                                }, 2000);
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error checking user status for welcome email:', error);
                    }
                }
            });
            
            window.emailSystemState.authIntegrated = true;
            console.log('✅ Authentication integration set up');
        }
    } catch (error) {
        console.error('❌ Error setting up auth integration:', error);
    }
}

/**
 * Set up admin panel integration
 */
function setupAdminPanelIntegration() {
    try {
        // Initialize email template manager when tab is shown
        const emailTab = document.getElementById('email-templates-tab');
        if (emailTab) {
            emailTab.addEventListener('shown.bs.tab', async function() {
                if (!window.emailSystemState.adminPanelReady) {
                    console.log('🔧 Initializing admin panel email features...');
                    
                    // Load email statistics
                    if (window.emailService && window.emailService.getEmailStatistics) {
                        try {
                            const stats = await window.emailService.getEmailStatistics();
                            
                            // Update statistics display
                            const sentElement = document.getElementById('emailsSentCount');
                            const failedElement = document.getElementById('emailsFailedCount');
                            
                            if (sentElement) sentElement.textContent = stats.sent;
                            if (failedElement) failedElement.textContent = stats.failed;
                            
                            console.log('📊 Email statistics loaded:', stats);
                        } catch (error) {
                            console.error('❌ Error loading email statistics:', error);
                        }
                    }
                    
                    window.emailSystemState.adminPanelReady = true;
                }
            });
        }
        
        console.log('✅ Admin panel integration set up');
    } catch (error) {
        console.error('❌ Error setting up admin panel integration:', error);
    }
}

/**
 * Validate email system configuration
 */
function validateEmailSystemConfiguration() {
    const issues = [];
    
    // Check email service
    if (!window.emailService) {
        issues.push('Email service not loaded');
    }
    
    // Check Firebase
    if (typeof firebase === 'undefined') {
        issues.push('Firebase not loaded');
    }
    
    // Check required DOM elements for admin panel
    if (document.getElementById('email-templates-tab')) {
        const requiredElements = [
            'emailSubject',
            'emailBody',
            'saveEmailTemplateBtn',
            'previewEmailBtn',
            'testEmailBtn'
        ];
        
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                issues.push(`Required element missing: ${elementId}`);
            }
        }
    }
    
    return {
        valid: issues.length === 0,
        issues: issues
    };
}

/**
 * Get email system status
 */
function getEmailSystemStatus() {
    return {
        initialized: window.emailSystemState.initialized,
        serviceReady: window.emailSystemState.serviceReady,
        adminPanelReady: window.emailSystemState.adminPanelReady,
        authIntegrated: window.emailSystemState.authIntegrated,
        emailService: {
            available: !!window.emailService,
            initialized: window.emailService?.initialized || false
        },
        firebase: {
            available: typeof firebase !== 'undefined',
            auth: typeof firebase?.auth === 'function',
            firestore: typeof firebase?.firestore === 'function'
        },
        validation: validateEmailSystemConfiguration()
    };
}

/**
 * Reinitialize email system (for troubleshooting)
 */
async function reinitializeEmailSystem() {
    console.log('🔄 Reinitializing email system...');
    
    // Reset state
    window.emailSystemState = {
        initialized: false,
        serviceReady: false,
        adminPanelReady: false,
        authIntegrated: false
    };
    
    // Reinitialize
    await initializeEmailSystem();
}

/**
 * Test email system functionality
 */
async function testEmailSystemFunctionality() {
    console.log('🧪 Testing email system functionality...');
    
    const results = {
        serviceInitialization: false,
        templateLoading: false,
        userTracking: false,
        emailSending: false,
        adminInterface: false
    };
    
    try {
        // Test service initialization
        if (window.emailService && window.emailService.initialized) {
            results.serviceInitialization = true;
        }
        
        // Test template loading
        const template = window.emailService?.getEmailTemplate('welcome');
        if (template && template.subject && template.body) {
            results.templateLoading = true;
        }
        
        // Test user tracking
        try {
            const stats = await window.emailService?.getEmailStatistics();
            if (stats && typeof stats.sent === 'number') {
                results.userTracking = true;
            }
        } catch (error) {
            console.warn('User tracking test failed:', error);
        }
        
        // Test email sending (simulation)
        try {
            const testResult = await window.emailService?.sendEmailViaService({
                to_email: 'test@example.com',
                to_name: 'Test User',
                subject: 'Test Email',
                html_content: '<p>Test</p>',
                from_name: 'Attendly Team',
                from_email: 'website.po45@gmail.com'
            });
            
            if (testResult) {
                results.emailSending = true;
            }
        } catch (error) {
            console.warn('Email sending test failed:', error);
        }
        
        // Test admin interface
        if (document.getElementById('email-templates-tab')) {
            const requiredElements = ['emailSubject', 'emailBody', 'saveEmailTemplateBtn'];
            results.adminInterface = requiredElements.every(id => document.getElementById(id));
        } else {
            results.adminInterface = true; // Not on admin page
        }
        
    } catch (error) {
        console.error('❌ Email system test failed:', error);
    }
    
    console.log('🧪 Email system test results:', results);
    return results;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        initializeEmailSystem().catch(error => {
            console.error('❌ Failed to initialize email system:', error);
        });
    }, 1000);
});

// Export functions for global access
window.emailSystemIntegration = {
    initialize: initializeEmailSystem,
    reinitialize: reinitializeEmailSystem,
    getStatus: getEmailSystemStatus,
    test: testEmailSystemFunctionality,
    validate: validateEmailSystemConfiguration
};

// Listen for email system ready event
window.addEventListener('emailSystemReady', function(event) {
    console.log('🎉 Email system is ready!', event.detail);
});
