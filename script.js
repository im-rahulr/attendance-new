/**
 * Frontend Email Form Handler for Resend Integration
 * Handles form submissions and connects to the Resend backend endpoint
 */

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show message function
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Form submission handler
document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('emailForm');
    if (!emailForm) return;
    
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userEmail = document.getElementById('userEmail').value.trim();
        const userName = document.getElementById('userName').value.trim() || 'Friend';
        const submitBtn = document.getElementById('submitBtn');
        
        // Validate email
        if (!userEmail || !isValidEmail(userEmail)) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }
        
        // Disable button and show loading
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
        }
        
        try {
            console.log('Sending email to:', userEmail, 'with name:', userName);
            
            const response = await fetch('/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: userEmail,
                    name: userName
                })
            });
            
            const result = await response.json();
            console.log('Server response:', result);
            
            if (response.ok && result.success) {
                showMessage('🎉 Hello email sent successfully! Check your inbox.', 'success');
                emailForm.reset();
            } else {
                showMessage(`❌ Failed to send email: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Error sending email:', error);
            showMessage('❌ Failed to send email. Please try again later.', 'error');
        } finally {
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Hello Email';
            }
        }
    });
});

// Additional utility functions for enhanced functionality

/**
 * Test the email service connectivity
 */
async function testEmailService() {
    try {
        const response = await fetch('/health');
        const result = await response.json();
        console.log('Email service status:', result);
        return result.status === 'OK';
    } catch (error) {
        console.error('Email service test failed:', error);
        return false;
    }
}

/**
 * Send a test email (for debugging purposes)
 */
async function sendTestEmail(testEmail = 'test@example.com') {
    try {
        const response = await fetch('/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: testEmail,
                name: 'Test User'
            })
        });
        
        const result = await response.json();
        console.log('Test email result:', result);
        return result;
    } catch (error) {
        console.error('Test email failed:', error);
        return { success: false, error: error.message };
    }
}

// Make functions available globally for debugging
window.emailUtils = {
    isValidEmail,
    showMessage,
    testEmailService,
    sendTestEmail
};

// Auto-test service on page load (optional)
document.addEventListener('DOMContentLoaded', async function() {
    const isServiceReady = await testEmailService();
    if (isServiceReady) {
        console.log('✅ Email service is ready');
    } else {
        console.warn('⚠️ Email service may not be available');
    }
});
