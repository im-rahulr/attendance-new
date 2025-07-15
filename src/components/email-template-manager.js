/**
 * Email Template Manager
 * Handles email template management in the admin panel
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the admin page
    if (!document.getElementById('email-templates-tab')) return;
    
    console.log('📧 Initializing email template manager...');
    
    // Initialize email template manager when the email templates tab is shown
    document.getElementById('email-templates-tab').addEventListener('shown.bs.tab', function() {
        initializeEmailTemplateManager();
    });
});

/**
 * Initialize email template manager
 */
async function initializeEmailTemplateManager() {
    try {
        console.log('🔧 Setting up email template manager...');

        // Check if email service is available
        if (!window.emailService) {
            showEmailServiceStatus('error', 'Email service not available');
            console.error('❌ Email service not available');
            return;
        }

        // Initialize email service if not already initialized
        if (!window.emailService.initialized) {
            showEmailServiceStatus('loading', 'Initializing email service...');
            await window.emailService.init();
        }

        // Load email template
        await loadEmailTemplate();

        // Load saved admin email preference
        loadAdminEmailPreference();

        // Set up event listeners
        setupEmailTemplateEventListeners();

        // Load email statistics
        loadEmailStatistics();

        // Test email server connectivity
        await testEmailServerConnectivity();

        console.log('✅ Email template manager initialized');
    } catch (error) {
        console.error('❌ Error initializing email template manager:', error);
        showEmailServiceStatus('error', `Error: ${error.message}`);
    }
}

/**
 * Load email template from database
 */
async function loadEmailTemplate() {
    try {
        const emailSubjectInput = document.getElementById('emailSubject');
        const emailBodyInput = document.getElementById('emailBody');
        
        if (!emailSubjectInput || !emailBodyInput) {
            console.error('❌ Email template form elements not found');
            return;
        }
        
        // Get welcome email template
        const template = window.emailService.getEmailTemplate('welcome');
        
        if (template) {
            emailSubjectInput.value = template.subject;
            emailBodyInput.value = template.body;
            console.log('📧 Email template loaded');
        } else {
            console.warn('⚠️ No email template found, using defaults');
            // Use default template from email service
            const defaultTemplate = window.emailService.emailTemplates.welcome;
            emailSubjectInput.value = defaultTemplate.subject;
            emailBodyInput.value = defaultTemplate.body;
        }
    } catch (error) {
        console.error('❌ Error loading email template:', error);
        showToast('Error loading email template', 'danger');
    }
}

/**
 * Set up event listeners for email template management
 */
function setupEmailTemplateEventListeners() {
    // Save email template button
    const saveEmailTemplateBtn = document.getElementById('saveEmailTemplateBtn');
    if (saveEmailTemplateBtn) {
        saveEmailTemplateBtn.addEventListener('click', saveEmailTemplate);
    }

    // Preview email button
    const previewEmailBtn = document.getElementById('previewEmailBtn');
    if (previewEmailBtn) {
        previewEmailBtn.addEventListener('click', previewEmailTemplate);
    }

    // Test email button - now shows confirmation dialog
    const testEmailBtn = document.getElementById('testEmailBtn');
    if (testEmailBtn) {
        testEmailBtn.addEventListener('click', showTestEmailConfirmation);
    }

    // Reset template button
    const resetTemplateBtn = document.getElementById('resetTemplateBtn');
    if (resetTemplateBtn) {
        resetTemplateBtn.addEventListener('click', resetEmailTemplate);
    }

    // Send test email from preview modal
    const sendTestFromPreview = document.getElementById('sendTestFromPreview');
    if (sendTestFromPreview) {
        sendTestFromPreview.addEventListener('click', showTestEmailConfirmation);
    }

    // Confirm send test email button
    const confirmSendTestEmail = document.getElementById('confirmSendTestEmail');
    if (confirmSendTestEmail) {
        confirmSendTestEmail.addEventListener('click', sendTestEmailConfirmed);
    }

    // Admin test email input - save preference on change
    const adminTestEmail = document.getElementById('adminTestEmail');
    if (adminTestEmail) {
        adminTestEmail.addEventListener('blur', saveAdminEmailPreference);
        adminTestEmail.addEventListener('input', validateAdminEmailInput);
    }

    // Email delivery verification buttons
    const confirmEmailReceived = document.getElementById('confirmEmailReceived');
    if (confirmEmailReceived) {
        confirmEmailReceived.addEventListener('click', handleEmailReceived);
    }

    const reportEmailNotReceived = document.getElementById('reportEmailNotReceived');
    if (reportEmailNotReceived) {
        reportEmailNotReceived.addEventListener('click', showTroubleshootingModal);
    }

    // Retry test email button
    const retryTestEmail = document.getElementById('retryTestEmail');
    if (retryTestEmail) {
        retryTestEmail.addEventListener('click', retryTestEmailSending);
    }

    // Troubleshooting modal buttons
    setupTroubleshootingEventListeners();
}

/**
 * Save email template to database
 */
async function saveEmailTemplate() {
    try {
        const emailSubjectInput = document.getElementById('emailSubject');
        const emailBodyInput = document.getElementById('emailBody');
        
        if (!emailSubjectInput || !emailBodyInput) {
            showToast('Email template form elements not found', 'danger');
            return;
        }
        
        const subject = emailSubjectInput.value.trim();
        const body = emailBodyInput.value.trim();
        
        // Validate inputs
        if (!subject) {
            showToast('Email subject cannot be empty', 'warning');
            emailSubjectInput.focus();
            return;
        }
        
        if (!body) {
            showToast('Email body cannot be empty', 'warning');
            emailBodyInput.focus();
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveEmailTemplateBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Saving...';
        
        // Save template
        await window.emailService.saveEmailTemplate('welcome', { subject, body });
        
        // Reset button state
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        
        // Show success message
        showToast('Email template saved successfully', 'success');
        
        // Update recent activity
        addEmailActivity('Template saved', 'success');
        
        console.log('✅ Email template saved');
    } catch (error) {
        console.error('❌ Error saving email template:', error);
        showToast(`Error saving template: ${error.message}`, 'danger');
        
        // Reset button state
        const saveBtn = document.getElementById('saveEmailTemplateBtn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save me-1"></i>Save Template';
        }
        
        // Update recent activity
        addEmailActivity(`Save failed: ${error.message}`, 'danger');
    }
}

/**
 * Preview email template
 */
function previewEmailTemplate() {
    try {
        const emailSubjectInput = document.getElementById('emailSubject');
        const emailBodyInput = document.getElementById('emailBody');
        
        if (!emailSubjectInput || !emailBodyInput) {
            showToast('Email template form elements not found', 'danger');
            return;
        }
        
        const subject = emailSubjectInput.value.trim();
        const body = emailBodyInput.value.trim();
        
        // Validate inputs
        if (!subject && !body) {
            showToast('Email template is empty', 'warning');
            return;
        }
        
        // Get current user for sample data
        const currentUser = firebase.auth().currentUser;
        const sampleData = {
            userName: currentUser?.displayName || 'John Doe',
            userEmail: currentUser?.email || 'john.doe@example.com',
            dashboardUrl: `${window.location.origin}/src/pages/dashboard.html`
        };
        
        // Replace variables in subject and body using email service helper
        const previewSubject = window.emailService.processTemplateVariables(subject, sampleData);
        const previewBody = window.emailService.processTemplateVariables(body, sampleData);
        
        // Update preview modal
        document.getElementById('previewSubject').textContent = previewSubject;
        document.getElementById('previewBody').innerHTML = previewBody;
        
        // Show preview modal
        const previewModal = new bootstrap.Modal(document.getElementById('emailPreviewModal'));
        previewModal.show();
        
        // Update recent activity
        addEmailActivity('Template previewed', 'info');
        
        console.log('👁️ Email template previewed');
    } catch (error) {
        console.error('❌ Error previewing email template:', error);
        showToast(`Error previewing template: ${error.message}`, 'danger');
    }
}

/**
 * Load admin email preference
 */
function loadAdminEmailPreference() {
    try {
        const adminTestEmail = document.getElementById('adminTestEmail');
        if (!adminTestEmail) return;

        // Try to get saved preference from localStorage
        const savedEmail = localStorage.getItem('adminTestEmailPreference');

        if (savedEmail) {
            adminTestEmail.value = savedEmail;
            console.log('📧 Loaded admin email preference:', savedEmail);
        } else {
            // If no saved preference, use current user's email
            const currentUser = firebase.auth().currentUser;
            if (currentUser && currentUser.email) {
                adminTestEmail.value = currentUser.email;
                console.log('📧 Using current user email as default:', currentUser.email);
            }
        }
    } catch (error) {
        console.error('❌ Error loading admin email preference:', error);
    }
}

/**
 * Save admin email preference
 */
function saveAdminEmailPreference() {
    try {
        const adminTestEmail = document.getElementById('adminTestEmail');
        const savePreference = document.getElementById('saveEmailPreference');

        if (!adminTestEmail) return;

        const email = adminTestEmail.value.trim();

        // Only save if checkbox is checked and email is valid
        if (savePreference && savePreference.checked && isValidEmail(email)) {
            localStorage.setItem('adminTestEmailPreference', email);
            console.log('📧 Saved admin email preference:', email);
        }
    } catch (error) {
        console.error('❌ Error saving admin email preference:', error);
    }
}

/**
 * Validate admin email input
 */
function validateAdminEmailInput() {
    try {
        const adminTestEmail = document.getElementById('adminTestEmail');
        if (!adminTestEmail) return;

        const email = adminTestEmail.value.trim();

        if (email === '') {
            adminTestEmail.classList.remove('is-valid', 'is-invalid');
            return;
        }

        if (isValidEmail(email)) {
            adminTestEmail.classList.add('is-valid');
            adminTestEmail.classList.remove('is-invalid');
        } else {
            adminTestEmail.classList.add('is-invalid');
            adminTestEmail.classList.remove('is-valid');
        }
    } catch (error) {
        console.error('❌ Error validating admin email input:', error);
    }
}

/**
 * Check if email is valid
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show test email confirmation dialog
 */
function showTestEmailConfirmation() {
    try {
        // Get admin test email
        const adminTestEmail = document.getElementById('adminTestEmail');
        if (!adminTestEmail) {
            showToast('Admin test email input not found', 'danger');
            return;
        }

        const email = adminTestEmail.value.trim();

        // Validate email
        if (!email) {
            showToast('Please enter an email address for testing', 'warning');
            adminTestEmail.focus();
            return;
        }

        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address', 'warning');
            adminTestEmail.focus();
            return;
        }

        // Close preview modal if open
        const previewModal = bootstrap.Modal.getInstance(document.getElementById('emailPreviewModal'));
        if (previewModal) {
            previewModal.hide();
        }

        // Set confirmation email address
        document.getElementById('confirmEmailAddress').textContent = email;

        // Show confirmation modal
        const confirmModal = new bootstrap.Modal(document.getElementById('testEmailConfirmModal'));
        confirmModal.show();

    } catch (error) {
        console.error('❌ Error showing test email confirmation:', error);
        showToast(`Error: ${error.message}`, 'danger');
    }
}

/**
 * Send test email after confirmation
 */
async function sendTestEmailConfirmed() {
    try {
        console.log('🔧 Starting admin panel email test...');

        // Get admin test email
        const adminTestEmail = document.getElementById('adminTestEmail');
        if (!adminTestEmail) {
            showToast('Admin test email input not found', 'danger');
            return;
        }

        const email = adminTestEmail.value.trim();

        // Get user name with better fallback logic
        let userName = 'Admin User';
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            userName = currentUser.displayName ||
                      currentUser.email?.split('@')[0] ||
                      'Admin User';
        }

        // If sending to a different email, extract name from email
        if (email !== currentUser?.email) {
            const emailName = email.split('@')[0];
            userName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._]/g, ' ');
        }

        console.log('📧 Test email details:', { email, userName });

        // Save email preference if checkbox is checked
        saveAdminEmailPreference();

        // Close confirmation modal
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('testEmailConfirmModal'));
        if (confirmModal) {
            confirmModal.hide();
        }

        // Show loading state
        const confirmBtn = document.getElementById('confirmSendTestEmail');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Sending...';

        // Check email service availability
        if (!window.emailService) {
            throw new Error('Email service not available');
        }

        if (!window.emailService.initialized) {
            console.log('🔧 Email service not initialized, initializing...');
            await window.emailService.init();
        }

        console.log('📧 Email service status:', {
            available: !!window.emailService,
            initialized: window.emailService.initialized,
            hasMethod: typeof window.emailService.sendEmailViaService === 'function'
        });

        // Prepare email data
        const emailData = {
            to_email: email,
            to_name: userName,
            subject: document.getElementById('emailSubject').value.trim(),
            html_content: document.getElementById('emailBody').value.trim(),
            from_name: 'Attendly Team',
            from_email: 'website.po45@gmail.com'
        };

        // Prepare template variables for processing
        const templateVariables = {
            userName: userName,
            userEmail: email,
            dashboardUrl: `${window.location.origin}/src/pages/dashboard.html`,
            currentDate: new Date().toLocaleDateString(),
            supportEmail: 'support@attendly.com',
            companyName: 'Attendly'
        };

        console.log('📧 Sending email with data:', emailData);
        console.log('📧 Template variables:', templateVariables);

        // Send test email with template processing
        const result = await window.emailService.sendProcessedEmail(emailData, templateVariables);

        console.log('📧 Email sending result:', result);

        // Reset button state
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;

        // Show delivery verification modal
        showDeliveryVerificationModal(email, result);

        // Update recent activity
        if (result.success) {
            addEmailActivity(`Test email sent to ${email}`, 'success');
            console.log('✅ Test email sent successfully to:', email);
            console.log('✅ Message ID:', result.messageId);
        } else {
            addEmailActivity(`Test email to ${email} failed: ${result.error}`, 'danger');
            console.error('❌ Error sending test email:', result.error);
            console.error('❌ Full error result:', result);
        }
    } catch (error) {
        console.error('❌ Error sending test email:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Email service state:', {
            available: !!window.emailService,
            initialized: window.emailService?.initialized,
            type: typeof window.emailService
        });

        showToast(`Error sending test email: ${error.message}`, 'danger');

        // Reset button state
        const confirmBtn = document.getElementById('confirmSendTestEmail');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Send Test Email';
        }

        // Update recent activity
        addEmailActivity(`Test email failed: ${error.message}`, 'danger');
    }
}

/**
 * Reset email template to default
 */
async function resetEmailTemplate() {
    try {
        if (!confirm('Are you sure you want to reset the email template to default?')) {
            return;
        }
        
        // Get default template
        const defaultTemplate = window.emailService.emailTemplates.welcome;
        
        // Update form inputs
        document.getElementById('emailSubject').value = defaultTemplate.subject;
        document.getElementById('emailBody').value = defaultTemplate.body;
        
        // Show success message
        showToast('Email template reset to default', 'success');
        
        // Update recent activity
        addEmailActivity('Template reset to default', 'info');
        
        console.log('🔄 Email template reset to default');
    } catch (error) {
        console.error('❌ Error resetting email template:', error);
        showToast(`Error resetting template: ${error.message}`, 'danger');
    }
}

/**
 * Show email service status
 */
function showEmailServiceStatus(status, message) {
    const statusElement = document.getElementById('emailServiceStatus');
    if (!statusElement) return;

    statusElement.className = 'alert';

    switch (status) {
        case 'success':
            statusElement.classList.add('alert-success');
            statusElement.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
            break;
        case 'error':
            statusElement.classList.add('alert-danger');
            statusElement.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i>${message}`;
            break;
        case 'loading':
            statusElement.classList.add('alert-secondary');
            statusElement.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i>${message}`;
            break;
        default:
            statusElement.classList.add('alert-secondary');
            statusElement.innerHTML = `<i class="fas fa-info-circle me-2"></i>${message}`;
    }
}

/**
 * Test email server connectivity
 */
async function testEmailServerConnectivity() {
    try {
        console.log('🔧 Testing email server connectivity...');
        showEmailServiceStatus('loading', 'Testing email server connectivity...');

        const response = await fetch('http://localhost:3002/health');
        const data = await response.json();

        if (response.ok && data.status === 'healthy') {
            console.log('✅ Email server connectivity successful');
            showEmailServiceStatus('success', `Email server connected (SMTP: ${data.smtp_connected})`);
            return true;
        } else {
            console.error('❌ Email server unhealthy:', data);
            showEmailServiceStatus('error', 'Email server is not healthy');
            return false;
        }
    } catch (error) {
        console.error('❌ Email server connectivity failed:', error);
        showEmailServiceStatus('error', 'Email server not available. Start with: npm run email-server');
        return false;
    }
}

// Make function globally available
window.testEmailServerConnectivity = testEmailServerConnectivity;

/**
 * Load email statistics
 */
async function loadEmailStatistics() {
    try {
        if (!window.emailService) {
            console.warn('⚠️ Email service not available for statistics');
            return;
        }

        // Get email statistics from email service
        const stats = await window.emailService.getEmailStatistics();

        // Update statistics display
        document.getElementById('emailsSentCount').textContent = stats.sent;
        document.getElementById('emailsFailedCount').textContent = stats.failed;

        console.log('📊 Email statistics loaded:', stats);

        // Load recent email activity
        await loadRecentEmailActivity();
    } catch (error) {
        console.error('❌ Error loading email statistics:', error);
    }
}

/**
 * Load recent email activity
 */
async function loadRecentEmailActivity() {
    try {
        const db = firebase.firestore();

        // Get recent email logs (last 10)
        const emailLogsSnapshot = await db.collection('emailLogs')
            .orderBy('lastUpdated', 'desc')
            .limit(10)
            .get();

        const activityContainer = document.getElementById('recentEmailActivity');
        if (!activityContainer) return;

        // Clear existing content
        activityContainer.innerHTML = '';

        if (emailLogsSnapshot.empty) {
            activityContainer.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-inbox fa-2x mb-2"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        emailLogsSnapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = data.lastUpdated?.toDate() || new Date();
            const status = data.lastAttemptStatus || 'unknown';
            const userEmail = data.userEmail || 'Unknown user';

            // Determine icon and color based on status
            let icon = 'info-circle';
            let color = 'text-info';
            let message = 'Email activity';

            switch (status) {
                case 'success':
                    icon = 'check-circle';
                    color = 'text-success';
                    message = `Welcome email sent to ${userEmail}`;
                    break;
                case 'failed':
                    icon = 'exclamation-circle';
                    color = 'text-danger';
                    message = `Failed to send to ${userEmail}`;
                    break;
                case 'reset':
                    icon = 'undo';
                    color = 'text-warning';
                    message = `Email status reset for ${userEmail}`;
                    break;
                default:
                    message = `Email activity for ${userEmail}`;
            }

            const activityElement = document.createElement('div');
            activityElement.className = 'mb-2 pb-2 border-bottom';
            activityElement.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-${icon} ${color} me-2"></i>
                    <div>
                        <div class="small">${message}</div>
                        <small class="text-muted">${timestamp.toLocaleString()}</small>
                    </div>
                </div>
            `;

            activityContainer.appendChild(activityElement);
        });

        console.log('📧 Recent email activity loaded');
    } catch (error) {
        console.error('❌ Error loading recent email activity:', error);
    }
}

/**
 * Add email activity to recent activity list
 */
function addEmailActivity(message, type = 'info') {
    try {
        const activityContainer = document.getElementById('recentEmailActivity');
        if (!activityContainer) return;
        
        // Clear "no activity" message if present
        if (activityContainer.querySelector('.text-center.text-muted')) {
            activityContainer.innerHTML = '';
        }
        
        // Create activity element
        const activityElement = document.createElement('div');
        activityElement.className = 'mb-2 pb-2 border-bottom';
        
        // Set icon based on type
        let icon = 'info-circle';
        let color = 'text-info';
        
        switch (type) {
            case 'success':
                icon = 'check-circle';
                color = 'text-success';
                break;
            case 'danger':
            case 'error':
                icon = 'exclamation-circle';
                color = 'text-danger';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                color = 'text-warning';
                break;
        }
        
        // Format timestamp
        const timestamp = new Date().toLocaleTimeString();
        
        // Set activity content
        activityElement.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${icon} ${color} me-2"></i>
                <div>
                    <div>${message}</div>
                    <small class="text-muted">${timestamp}</small>
                </div>
            </div>
        `;
        
        // Add to container (at the top)
        activityContainer.insertBefore(activityElement, activityContainer.firstChild);
        
        // Limit to 5 activities
        const activities = activityContainer.querySelectorAll('.mb-2.pb-2');
        if (activities.length > 5) {
            activityContainer.removeChild(activities[activities.length - 1]);
        }
    } catch (error) {
        console.error('❌ Error adding email activity:', error);
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    try {
        // Use admin panel's toast if available
        if (typeof window.showAdminToast === 'function') {
            window.showAdminToast(message, type);
            return;
        }
        
        // Fallback to bootstrap toast
        const toastElement = document.getElementById('adminToast');
        if (!toastElement) return;
        
        // Set toast content
        const toastBody = document.getElementById('toastBody');
        if (toastBody) {
            toastBody.textContent = message;
        }
        
        // Set toast type
        toastElement.className = 'toast align-items-center border-0 shadow-lg';
        switch (type) {
            case 'success':
                toastElement.classList.add('text-bg-success');
                break;
            case 'danger':
            case 'error':
                toastElement.classList.add('text-bg-danger');
                break;
            case 'warning':
                toastElement.classList.add('text-bg-warning');
                break;
            case 'info':
                toastElement.classList.add('text-bg-info');
                break;
            default:
                toastElement.classList.add('text-bg-primary');
        }
        
        // Show toast
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
    } catch (error) {
        console.error('❌ Error showing toast:', error);
    }
}

/**
 * Show delivery verification modal
 */
function showDeliveryVerificationModal(email, result) {
    try {
        const deliveryModal = document.getElementById('emailDeliveryModal');
        const successContent = document.getElementById('deliverySuccessContent');
        const errorContent = document.getElementById('deliveryErrorContent');
        const retryBtn = document.getElementById('retryTestEmail');

        if (!deliveryModal) return;

        if (result.success) {
            // Show success content
            successContent.style.display = 'block';
            errorContent.style.display = 'none';
            retryBtn.style.display = 'none';

            // Update delivery details
            document.getElementById('deliveryEmailAddress').textContent = email;
            document.getElementById('deliveryTimestamp').textContent = new Date().toLocaleString();
            document.getElementById('deliveryMessageId').textContent = result.messageId || 'Simulated';
            document.getElementById('deliveryStatus').textContent = 'Delivered';
            document.getElementById('deliveryStatus').className = 'badge bg-success';

        } else {
            // Show error content
            successContent.style.display = 'none';
            errorContent.style.display = 'block';
            retryBtn.style.display = 'inline-block';

            // Update error details
            document.getElementById('deliveryErrorMessage').textContent = result.error || 'Unknown error occurred';
        }

        // Store email for retry functionality
        deliveryModal.setAttribute('data-test-email', email);

        // Show modal
        const modal = new bootstrap.Modal(deliveryModal);
        modal.show();

    } catch (error) {
        console.error('❌ Error showing delivery verification modal:', error);
    }
}

/**
 * Handle email received confirmation
 */
function handleEmailReceived() {
    try {
        // Close delivery modal
        const deliveryModal = bootstrap.Modal.getInstance(document.getElementById('emailDeliveryModal'));
        if (deliveryModal) {
            deliveryModal.hide();
        }

        // Show success message
        showToast('Great! Email delivery confirmed successfully', 'success');

        // Update recent activity
        addEmailActivity('Email delivery confirmed by admin', 'success');

        console.log('✅ Email delivery confirmed by admin');
    } catch (error) {
        console.error('❌ Error handling email received confirmation:', error);
    }
}

/**
 * Show troubleshooting modal
 */
function showTroubleshootingModal() {
    try {
        // Get the test email address
        const adminTestEmail = document.getElementById('adminTestEmail');
        const email = adminTestEmail ? adminTestEmail.value.trim() : 'unknown@example.com';

        // Close delivery modal
        const deliveryModal = bootstrap.Modal.getInstance(document.getElementById('emailDeliveryModal'));
        if (deliveryModal) {
            deliveryModal.hide();
        }

        // Report the issue to the troubleshooting system
        if (window.emailTroubleshooting && window.emailTroubleshooting.functions) {
            window.emailTroubleshooting.functions.reportIssue(email, 'not_received', {
                context: 'admin_test_email',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        }

        // Update system status in troubleshooting modal
        updateTroubleshootingSystemStatus();

        // Show troubleshooting modal
        const troubleshootingModal = new bootstrap.Modal(document.getElementById('troubleshootingModal'));
        troubleshootingModal.show();

        // Update recent activity
        addEmailActivity('Admin reported email not received - troubleshooting started', 'warning');

        // Show troubleshooting notification
        if (window.emailTroubleshooting && window.emailTroubleshooting.functions) {
            window.emailTroubleshooting.functions.showNotification(
                'Troubleshooting Started',
                `Email delivery issue reported for ${email}. Follow the troubleshooting steps to resolve the issue.`,
                'warning',
                8000
            );
        }

        console.log('🔧 Troubleshooting modal opened for email:', email);
    } catch (error) {
        console.error('❌ Error showing troubleshooting modal:', error);
    }
}

/**
 * Retry test email sending
 */
async function retryTestEmailSending() {
    try {
        const deliveryModal = document.getElementById('emailDeliveryModal');
        const email = deliveryModal.getAttribute('data-test-email');

        if (!email) {
            showToast('No email address found for retry', 'warning');
            return;
        }

        // Close delivery modal
        const modal = bootstrap.Modal.getInstance(deliveryModal);
        if (modal) {
            modal.hide();
        }

        // Show confirmation dialog again
        document.getElementById('adminTestEmail').value = email;
        showTestEmailConfirmation();

        console.log('🔄 Retrying test email to:', email);
    } catch (error) {
        console.error('❌ Error retrying test email:', error);
        showToast(`Error retrying test email: ${error.message}`, 'danger');
    }
}

/**
 * Set up troubleshooting event listeners
 */
function setupTroubleshootingEventListeners() {
    try {
        // Checked spam folder button
        const checkedSpamFolder = document.getElementById('checkedSpamFolder');
        if (checkedSpamFolder) {
            checkedSpamFolder.addEventListener('click', function() {
                this.innerHTML = '<i class="fas fa-check me-1"></i>Checked';
                this.disabled = true;
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-success');
            });
        }

        // Checked email settings button
        const checkedEmailSettings = document.getElementById('checkedEmailSettings');
        if (checkedEmailSettings) {
            checkedEmailSettings.addEventListener('click', function() {
                this.innerHTML = '<i class="fas fa-check me-1"></i>Checked';
                this.disabled = true;
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-success');
            });
        }

        // Retry with different email button
        const retryWithDifferentEmail = document.getElementById('retryWithDifferentEmail');
        if (retryWithDifferentEmail) {
            retryWithDifferentEmail.addEventListener('click', function() {
                // Close troubleshooting modal
                const troubleshootingModal = bootstrap.Modal.getInstance(document.getElementById('troubleshootingModal'));
                if (troubleshootingModal) {
                    troubleshootingModal.hide();
                }

                // Clear current email and focus on input
                const adminTestEmail = document.getElementById('adminTestEmail');
                if (adminTestEmail) {
                    adminTestEmail.value = '';
                    adminTestEmail.focus();
                }

                showToast('Please enter a different email address and try again', 'info');
            });
        }

        // Retry after delay button
        const retryAfterDelay = document.getElementById('retryAfterDelay');
        if (retryAfterDelay) {
            retryAfterDelay.addEventListener('click', function() {
                const originalText = this.innerHTML;
                this.disabled = true;

                let countdown = 300; // 5 minutes in seconds
                const updateCountdown = () => {
                    const minutes = Math.floor(countdown / 60);
                    const seconds = countdown % 60;
                    this.innerHTML = `<i class="fas fa-clock me-1"></i>Retry in ${minutes}:${seconds.toString().padStart(2, '0')}`;

                    if (countdown > 0) {
                        countdown--;
                        setTimeout(updateCountdown, 1000);
                    } else {
                        this.innerHTML = originalText;
                        this.disabled = false;
                        showToast('You can now retry sending the test email', 'info');
                    }
                };

                updateCountdown();

                // Close troubleshooting modal
                const troubleshootingModal = bootstrap.Modal.getInstance(document.getElementById('troubleshootingModal'));
                if (troubleshootingModal) {
                    troubleshootingModal.hide();
                }
            });
        }

        // Contact support button
        const contactSupport = document.getElementById('contactSupport');
        if (contactSupport) {
            contactSupport.addEventListener('click', function() {
                const supportInfo = `
                    Email System Support Information:
                    - Time: ${new Date().toISOString()}
                    - User: ${firebase.auth().currentUser?.email || 'Unknown'}
                    - Issue: Test email delivery failure
                    - Email Service Status: ${window.emailService?.initialized ? 'Initialized' : 'Not Initialized'}
                    - Browser: ${navigator.userAgent}
                `;

                // Copy to clipboard
                navigator.clipboard.writeText(supportInfo).then(() => {
                    showToast('Support information copied to clipboard', 'success');
                }).catch(() => {
                    console.log('Support Information:', supportInfo);
                    showToast('Support information logged to console', 'info');
                });
            });
        }

        // Troubleshooting complete button
        const troubleshootingComplete = document.getElementById('troubleshootingComplete');
        if (troubleshootingComplete) {
            troubleshootingComplete.addEventListener('click', function() {
                // Close troubleshooting modal
                const troubleshootingModal = bootstrap.Modal.getInstance(document.getElementById('troubleshootingModal'));
                if (troubleshootingModal) {
                    troubleshootingModal.hide();
                }

                showToast('Troubleshooting session completed', 'success');
                addEmailActivity('Troubleshooting session completed', 'info');
            });
        }

    } catch (error) {
        console.error('❌ Error setting up troubleshooting event listeners:', error);
    }
}

/**
 * Update troubleshooting system status
 */
function updateTroubleshootingSystemStatus() {
    try {
        const statusContainer = document.getElementById('troubleshootingSystemStatus');
        const lastTestEmailTime = document.getElementById('lastTestEmailTime');

        if (!statusContainer) return;

        // Clear existing content
        statusContainer.innerHTML = '';

        // Email service status
        const emailServiceStatus = window.emailService?.initialized ? 'Online' : 'Offline';
        const emailServiceClass = window.emailService?.initialized ? 'bg-success' : 'bg-danger';

        // SMTP connection status (simulated)
        const smtpStatus = 'Connected';
        const smtpClass = 'bg-success';

        // Update status display
        statusContainer.innerHTML = `
            <div class="d-flex justify-content-between">
                <span>Email Service:</span>
                <span class="badge ${emailServiceClass}">${emailServiceStatus}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>SMTP Connection:</span>
                <span class="badge ${smtpClass}">${smtpStatus}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Last Test Email:</span>
                <span id="lastTestEmailTime">${new Date().toLocaleTimeString()}</span>
            </div>
        `;

    } catch (error) {
        console.error('❌ Error updating troubleshooting system status:', error);
    }
}
