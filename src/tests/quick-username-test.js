/**
 * Quick Username Test Script
 * Copy and paste this into the browser console on any page with email service
 */

console.log('🧪 Quick Username Test Starting...');

// Test configuration - CHANGE THESE VALUES
const TEST_EMAIL = 'your-email@example.com';
const TEST_USER_NAME = 'John Doe';

if (TEST_EMAIL === 'your-email@example.com') {
    console.error('❌ Please change TEST_EMAIL and TEST_USER_NAME to your actual values in the script');
} else {
    runUsernameTest();
}

async function runUsernameTest() {
    console.log('👤 Testing username functionality...');
    console.log('📧 Test email:', TEST_EMAIL);
    console.log('👤 Test name:', TEST_USER_NAME);
    
    // Step 1: Check email service availability
    console.log('\n1️⃣ Checking email service...');
    if (!window.emailService) {
        console.error('❌ window.emailService not found');
        return;
    }
    
    if (!window.emailService.initialized) {
        console.log('🔧 Initializing email service...');
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
    
    // Step 2: Test template variable processing
    console.log('\n2️⃣ Testing template variable processing...');
    try {
        const testTemplate = 'Hello {{userName}}! Your email is {{userEmail}}. Welcome to {{companyName}}!';
        const testVariables = {
            userName: TEST_USER_NAME,
            userEmail: TEST_EMAIL,
            companyName: 'Attendly'
        };
        
        const processed = window.emailService.processTemplateVariables(testTemplate, testVariables);
        
        console.log('✅ Template processing successful');
        console.log('   Original:', testTemplate);
        console.log('   Processed:', processed);
        
        if (processed.includes(TEST_USER_NAME)) {
            console.log('✅ Username substitution working correctly');
        } else {
            console.error('❌ Username not substituted properly');
        }
    } catch (error) {
        console.error('❌ Template processing failed:', error);
    }
    
    // Step 3: Test email template preview
    console.log('\n3️⃣ Testing email template preview...');
    try {
        const preview = window.emailService.previewEmailTemplate('welcome', {
            userName: TEST_USER_NAME,
            userEmail: TEST_EMAIL
        });
        
        if (preview) {
            console.log('✅ Template preview generated');
            console.log('   Subject:', preview.subject);
            
            if (preview.subject.includes(TEST_USER_NAME)) {
                console.log('✅ Username in subject substituted correctly');
            } else {
                console.warn('⚠️ Username not found in subject - check if template uses {{userName}}');
            }
            
            if (preview.body.includes(TEST_USER_NAME)) {
                console.log('✅ Username in body substituted correctly');
            } else {
                console.warn('⚠️ Username not found in body - check if template uses {{userName}}');
            }
        } else {
            console.error('❌ No preview generated');
        }
    } catch (error) {
        console.error('❌ Template preview failed:', error);
    }
    
    // Step 4: Test processed email sending
    console.log('\n4️⃣ Testing processed email sending...');
    try {
        const emailData = {
            to_email: TEST_EMAIL,
            to_name: TEST_USER_NAME,
            subject: 'Username Test for {{userName}}',
            html_content: '<h2>Hello {{userName}}!</h2><p>This is a test email sent to {{userEmail}}.</p><p>Welcome to {{companyName}}!</p>',
            from_name: 'Attendly Team',
            from_email: 'website.po45@gmail.com'
        };

        const templateVariables = {
            userName: TEST_USER_NAME,
            userEmail: TEST_EMAIL,
            companyName: 'Attendly'
        };

        console.log('📤 Sending processed email...');
        const result = await window.emailService.sendProcessedEmail(emailData, templateVariables);

        if (result.success) {
            console.log('✅ Processed email sent successfully');
            console.log('   Message ID:', result.messageId);
            console.log('   Status:', result.deliveryStatus);
            console.log('   📧 Check your email inbox for the test message');
        } else {
            console.error('❌ Processed email failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Processed email error:', error);
    }
    
    // Step 5: Test welcome email
    console.log('\n5️⃣ Testing welcome email...');
    try {
        console.log('📤 Sending welcome email...');
        const welcomeResult = await window.emailService.sendWelcomeEmail(
            TEST_EMAIL,
            TEST_USER_NAME,
            'test-user-id-' + Date.now()
        );

        if (welcomeResult.success) {
            console.log('✅ Welcome email sent successfully');
            console.log('   Message ID:', welcomeResult.messageId);
            console.log('   Status:', welcomeResult.deliveryStatus);
            console.log('   📧 Check your email inbox for the welcome message');
        } else {
            console.error('❌ Welcome email failed:', welcomeResult.error);
        }
    } catch (error) {
        console.error('❌ Welcome email error:', error);
    }
    
    // Step 6: Test user name retrieval
    console.log('\n6️⃣ Testing user name retrieval...');
    try {
        const currentUser = firebase.auth().currentUser;
        
        console.log('👤 Current user info:');
        console.log('   Display Name:', currentUser?.displayName || 'Not set');
        console.log('   Email:', currentUser?.email || 'Not available');
        
        // Test name extraction from email
        const emailName = TEST_EMAIL.split('@')[0];
        const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1).replace(/[._]/g, ' ');
        
        console.log('📧 Name extraction from email:');
        console.log('   Raw:', emailName);
        console.log('   Formatted:', formattedName);
        
        // Test admin panel name logic
        let adminPanelName = 'Admin User';
        if (currentUser) {
            adminPanelName = currentUser.displayName || 
                           currentUser.email?.split('@')[0] || 
                           'Admin User';
        }
        
        if (TEST_EMAIL !== currentUser?.email) {
            const testEmailName = TEST_EMAIL.split('@')[0];
            adminPanelName = testEmailName.charAt(0).toUpperCase() + testEmailName.slice(1).replace(/[._]/g, ' ');
        }
        
        console.log('🔧 Admin panel name logic result:', adminPanelName);
        
        console.log('✅ User name retrieval test complete');
    } catch (error) {
        console.error('❌ User name retrieval error:', error);
    }
    
    console.log('\n🎯 Username Test Summary:');
    console.log('========================');
    console.log('1. Email service: Check console output above');
    console.log('2. Template processing: Check console output above');
    console.log('3. Template preview: Check console output above');
    console.log('4. Processed email: Check console output above');
    console.log('5. Welcome email: Check console output above');
    console.log('6. Name retrieval: Check console output above');
    console.log('\n📧 Check your email inbox for test messages with proper usernames!');
    console.log('\n💡 If usernames are still showing as {{userName}}, check:');
    console.log('   1. Email templates in database have {{userName}} placeholders');
    console.log('   2. Admin panel is using sendProcessedEmail() function');
    console.log('   3. Template variables are being passed correctly');
}

// Make the function globally available
window.runUsernameTest = runUsernameTest;
