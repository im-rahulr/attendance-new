/**
 * Quick Admin Panel Email Test
 * Copy and paste this into the browser console on the admin panel page
 */

console.log('🧪 Quick Admin Panel Email Test Starting...');

// Test configuration - CHANGE THIS TO YOUR EMAIL
const TEST_EMAIL = 'your-email@example.com';

if (TEST_EMAIL === 'your-email@example.com') {
    console.error('❌ Please change TEST_EMAIL to your actual email address in the script');
} else {
    runQuickTest();
}

async function runQuickTest() {
    console.log('📧 Testing with email:', TEST_EMAIL);
    
    // Step 1: Check email server
    console.log('\n1️⃣ Testing email server connectivity...');
    try {
        const healthResponse = await fetch('http://localhost:3002/health');
        const healthData = await healthResponse.json();
        
        if (healthData.status === 'healthy') {
            console.log('✅ Email server is healthy');
        } else {
            console.error('❌ Email server is not healthy:', healthData);
            return;
        }
    } catch (error) {
        console.error('❌ Cannot connect to email server:', error.message);
        console.error('   Make sure to run: npm run email-server');
        return;
    }
    
    // Step 2: Check email service
    console.log('\n2️⃣ Testing email service...');
    if (!window.emailService) {
        console.error('❌ window.emailService not found');
        return;
    }
    
    if (!window.emailService.initialized) {
        console.log('🔧 Email service not initialized, initializing...');
        try {
            await window.emailService.init();
            console.log('✅ Email service initialized');
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            return;
        }
    } else {
        console.log('✅ Email service already initialized');
    }
    
    // Step 3: Test direct API call
    console.log('\n3️⃣ Testing direct API call...');
    try {
        const directResponse = await fetch('http://localhost:3002/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to_email: TEST_EMAIL,
                to_name: 'Test User',
                subject: 'Direct API Test from Admin Panel',
                html_content: '<h2>Direct API Test</h2><p>This email was sent via direct API call.</p>',
                from_name: 'Attendly Team',
                from_email: 'website.po45@gmail.com'
            })
        });
        
        const directResult = await directResponse.json();
        
        if (directResult.success) {
            console.log('✅ Direct API call successful');
            console.log('   Message ID:', directResult.messageId);
        } else {
            console.error('❌ Direct API call failed:', directResult.error);
        }
    } catch (error) {
        console.error('❌ Direct API call error:', error);
    }
    
    // Step 4: Test email service method
    console.log('\n4️⃣ Testing email service method...');
    try {
        const serviceResult = await window.emailService.sendEmailViaService({
            to_email: TEST_EMAIL,
            to_name: 'Test User',
            subject: 'Email Service Test from Admin Panel',
            html_content: '<h2>Email Service Test</h2><p>This email was sent via the email service method.</p>',
            from_name: 'Attendly Team',
            from_email: 'website.po45@gmail.com'
        });
        
        if (serviceResult.success) {
            console.log('✅ Email service method successful');
            console.log('   Message ID:', serviceResult.messageId);
            console.log('   Status:', serviceResult.deliveryStatus);
        } else {
            console.error('❌ Email service method failed:', serviceResult.error);
            console.error('   Full result:', serviceResult);
        }
    } catch (error) {
        console.error('❌ Email service method error:', error);
    }
    
    // Step 5: Test admin panel UI function
    console.log('\n5️⃣ Testing admin panel UI function...');
    
    // Fill in the admin test email field
    const adminEmailInput = document.getElementById('adminTestEmail');
    if (adminEmailInput) {
        adminEmailInput.value = TEST_EMAIL;
        console.log('✅ Admin email input field found and filled');
    } else {
        console.error('❌ Admin email input field not found');
    }
    
    // Check if email templates are loaded
    const emailSubject = document.getElementById('emailSubject');
    const emailBody = document.getElementById('emailBody');
    
    if (emailSubject && emailBody) {
        console.log('✅ Email template fields found');
        
        // Fill in test content if empty
        if (!emailSubject.value.trim()) {
            emailSubject.value = 'Admin Panel UI Test Email';
        }
        
        if (!emailBody.value.trim()) {
            emailBody.value = '<h2>Admin Panel UI Test</h2><p>This email was sent using the admin panel UI test.</p>';
        }
        
        console.log('✅ Email template fields filled with test content');
    } else {
        console.error('❌ Email template fields not found');
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('================');
    console.log('1. Email server: Check console output above');
    console.log('2. Email service: Check console output above');
    console.log('3. Direct API: Check console output above');
    console.log('4. Service method: Check console output above');
    console.log('5. UI elements: Check console output above');
    console.log('\n📧 Check your email inbox for test messages!');
    console.log('\n💡 To test the admin panel UI manually:');
    console.log('   1. Go to the Email Templates tab');
    console.log('   2. Click "Send Test Email" button');
    console.log('   3. Confirm in the modal dialog');
    console.log('   4. Check for success/error messages');
}

// Make the function globally available
window.runQuickEmailTest = runQuickTest;
