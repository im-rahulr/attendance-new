/**
 * Admin Panel Email Test Script
 * Run this in the browser console on the admin panel page to test email functionality
 */

console.log('🧪 Starting Admin Panel Email Test...');

// Test configuration
const TEST_EMAIL = 'your-test-email@example.com'; // Change this to your email
const EMAIL_SERVER_URL = 'http://localhost:3002';

/**
 * Test 1: Check if email server is running
 */
async function testEmailServerHealth() {
    console.log('\n📡 Test 1: Email Server Health Check');
    try {
        const response = await fetch(`${EMAIL_SERVER_URL}/health`);
        const data = await response.json();
        
        if (response.ok && data.status === 'healthy') {
            console.log('✅ Email server is healthy');
            console.log('   SMTP Connected:', data.smtp_connected);
            console.log('   Timestamp:', data.timestamp);
            return true;
        } else {
            console.error('❌ Email server is not healthy:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Cannot connect to email server:', error.message);
        console.error('   Make sure the server is running: npm run email-server');
        return false;
    }
}

/**
 * Test 2: Check email service initialization
 */
async function testEmailServiceInit() {
    console.log('\n🔧 Test 2: Email Service Initialization');
    
    if (typeof window.emailService === 'undefined') {
        console.error('❌ window.emailService is not defined');
        return false;
    }
    
    console.log('✅ window.emailService exists');
    console.log('   Type:', typeof window.emailService);
    console.log('   Initialized:', window.emailService.initialized);
    
    if (!window.emailService.initialized) {
        console.log('🔧 Initializing email service...');
        try {
            await window.emailService.init();
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            return false;
        }
    }
    
    // Check required methods
    const requiredMethods = ['sendEmailViaService', 'sendWelcomeEmail', 'getEmailTemplate'];
    const missingMethods = requiredMethods.filter(method => 
        typeof window.emailService[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
        console.error('❌ Missing required methods:', missingMethods);
        return false;
    }
    
    console.log('✅ All required methods are available');
    return true;
}

/**
 * Test 3: Test direct API call
 */
async function testDirectAPICall() {
    console.log('\n📧 Test 3: Direct API Call');
    
    const emailData = {
        to_email: TEST_EMAIL,
        to_name: 'Test User',
        subject: 'Admin Panel Direct API Test',
        html_content: '<h2>Direct API Test</h2><p>This email was sent via direct API call from the admin panel test.</p>',
        from_name: 'Attendly Team',
        from_email: 'website.po45@gmail.com'
    };
    
    try {
        console.log('📤 Sending email via direct API call...');
        const response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Direct API call successful');
            console.log('   Message ID:', result.messageId);
            console.log('   Status:', result.deliveryStatus);
            console.log('   Provider:', result.provider);
            return true;
        } else {
            console.error('❌ Direct API call failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Direct API call error:', error);
        return false;
    }
}

/**
 * Test 4: Test email service method
 */
async function testEmailServiceMethod() {
    console.log('\n🔧 Test 4: Email Service Method');
    
    if (!window.emailService || !window.emailService.initialized) {
        console.error('❌ Email service not available or not initialized');
        return false;
    }
    
    const emailData = {
        to_email: TEST_EMAIL,
        to_name: 'Test User',
        subject: 'Admin Panel Email Service Test',
        html_content: '<h2>Email Service Test</h2><p>This email was sent via the email service method from the admin panel test.</p>',
        from_name: 'Attendly Team',
        from_email: 'website.po45@gmail.com'
    };
    
    try {
        console.log('📤 Sending email via email service...');
        const result = await window.emailService.sendEmailViaService(emailData);
        
        if (result.success) {
            console.log('✅ Email service method successful');
            console.log('   Message ID:', result.messageId);
            console.log('   Status:', result.deliveryStatus);
            console.log('   Provider:', result.provider);
            return true;
        } else {
            console.error('❌ Email service method failed:', result.error);
            console.error('   Full result:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ Email service method error:', error);
        return false;
    }
}

/**
 * Test 5: Test admin panel UI elements
 */
function testAdminPanelUI() {
    console.log('\n🖥️ Test 5: Admin Panel UI Elements');
    
    const requiredElements = [
        'email-templates-tab',
        'emailSubject',
        'emailBody',
        'adminTestEmail',
        'testEmailBtn',
        'saveEmailTemplateBtn'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('❌ Missing UI elements:', missingElements);
        return false;
    }
    
    console.log('✅ All required UI elements are present');
    
    // Check if email templates tab is active
    const emailTab = document.getElementById('email-templates-tab');
    if (emailTab && !emailTab.classList.contains('active')) {
        console.log('ℹ️ Email templates tab is not active. Click it to activate email functionality.');
    }
    
    return true;
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Running Admin Panel Email Tests...');
    console.log('=====================================');
    
    const results = {
        serverHealth: await testEmailServerHealth(),
        serviceInit: await testEmailServiceInit(),
        directAPI: await testDirectAPICall(),
        serviceMethod: await testEmailServiceMethod(),
        uiElements: testAdminPanelUI()
    };
    
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log('Server Health:', results.serverHealth ? '✅ PASS' : '❌ FAIL');
    console.log('Service Init:', results.serviceInit ? '✅ PASS' : '❌ FAIL');
    console.log('Direct API:', results.directAPI ? '✅ PASS' : '❌ FAIL');
    console.log('Service Method:', results.serviceMethod ? '✅ PASS' : '❌ FAIL');
    console.log('UI Elements:', results.uiElements ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
        console.log('\n🎉 All tests passed! Admin panel email functionality is working correctly.');
        console.log('\n💡 Next steps:');
        console.log('   1. Check your email inbox for test emails');
        console.log('   2. Try using the admin panel email interface');
        console.log('   3. Test with different email addresses');
    } else {
        console.log('\n⚠️ Some tests failed. Check the errors above for details.');
        
        if (!results.serverHealth) {
            console.log('\n🔧 To fix server health issues:');
            console.log('   1. Make sure the email server is running: npm run email-server');
            console.log('   2. Check if port 3002 is available');
        }
        
        if (!results.serviceInit) {
            console.log('\n🔧 To fix service initialization issues:');
            console.log('   1. Check browser console for JavaScript errors');
            console.log('   2. Ensure all email service scripts are loaded');
        }
    }
    
    return results;
}

// Auto-run tests if TEST_EMAIL is set
if (TEST_EMAIL !== 'your-test-email@example.com') {
    runAllTests();
} else {
    console.log('⚠️ Please set TEST_EMAIL to your email address and run runAllTests()');
}

// Make functions globally available
window.adminEmailTest = {
    runAllTests,
    testEmailServerHealth,
    testEmailServiceInit,
    testDirectAPICall,
    testEmailServiceMethod,
    testAdminPanelUI
};
