/**
 * Command Line Email Test
 * Tests the email server functionality from command line
 */

const https = require('http');

// Test configuration
const EMAIL_SERVER_URL = 'http://localhost:3002';
const TEST_EMAIL = 'your-test-email@example.com'; // Change this to your email

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (error) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

/**
 * Test server health
 */
async function testServerHealth() {
    console.log('🔍 Testing email server health...');
    
    try {
        const response = await makeRequest(`${EMAIL_SERVER_URL}/health`);
        
        if (response.status === 200 && response.data.status === 'healthy') {
            console.log('✅ Email server is healthy');
            console.log(`   SMTP Connected: ${response.data.smtp_connected}`);
            console.log(`   Timestamp: ${response.data.timestamp}`);
            return true;
        } else {
            console.log('❌ Email server is unhealthy');
            console.log('   Response:', response.data);
            return false;
        }
    } catch (error) {
        console.log('❌ Failed to connect to email server');
        console.log('   Error:', error.message);
        console.log('   Make sure the server is running: npm run email-server');
        return false;
    }
}

/**
 * Test email sending
 */
async function testEmailSending() {
    console.log('\n📧 Testing email sending...');
    
    const emailData = {
        to_email: TEST_EMAIL,
        to_name: 'Test User',
        subject: 'CLI Test Email from Attendly System',
        html_content: `
            <h2>Test Email</h2>
            <p>Hello!</p>
            <p>This is a test email sent from the command line test script.</p>
            <p>If you receive this email, it means the email delivery system is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p>Best regards,<br>Attendly Team</p>
        `,
        text_content: `
Test Email

Hello!

This is a test email sent from the command line test script.

If you receive this email, it means the email delivery system is working correctly.

Timestamp: ${new Date().toISOString()}

Best regards,
Attendly Team
        `,
        from_name: 'Attendly Team',
        from_email: 'website.po45@gmail.com'
    };

    try {
        const response = await makeRequest(`${EMAIL_SERVER_URL}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });

        if (response.status === 200 && response.data.success) {
            console.log('✅ Email sent successfully!');
            console.log(`   Message ID: ${response.data.messageId}`);
            console.log(`   Delivered At: ${response.data.deliveredAt}`);
            console.log(`   Provider: ${response.data.provider}`);
            console.log(`   Status: ${response.data.deliveryStatus}`);
            console.log(`   To: ${emailData.to_email}`);
            console.log('\n📬 Please check the recipient\'s inbox (and spam folder) for the test email.');
            return true;
        } else {
            console.log('❌ Email sending failed');
            console.log(`   Status Code: ${response.status}`);
            console.log(`   Error: ${response.data.error || 'Unknown error'}`);
            console.log(`   Delivery Status: ${response.data.deliveryStatus || 'Unknown'}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Failed to send email');
        console.log('   Error:', error.message);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🧪 Starting Email System Tests');
    console.log('================================\n');

    // Test 1: Server Health
    const healthOk = await testServerHealth();
    
    if (!healthOk) {
        console.log('\n❌ Cannot proceed with email tests - server is not healthy');
        process.exit(1);
    }

    // Test 2: Email Sending
    const emailOk = await testEmailSending();

    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Server Health: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Email Sending: ${emailOk ? '✅ PASS' : '❌ FAIL'}`);

    if (healthOk && emailOk) {
        console.log('\n🎉 All tests passed! Email system is working correctly.');
        console.log('\n💡 Next steps:');
        console.log('   1. Check the recipient email inbox');
        console.log('   2. Test the frontend email functionality');
        console.log('   3. Monitor email logs for any issues');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
        process.exit(1);
    }
}

// Handle command line arguments
if (process.argv.length > 2) {
    const testEmail = process.argv[2];
    if (testEmail.includes('@')) {
        TEST_EMAIL = testEmail;
        console.log(`📧 Using test email: ${TEST_EMAIL}`);
    } else {
        console.log('❌ Invalid email address provided');
        console.log('Usage: node test-email-cli.js [email@example.com]');
        process.exit(1);
    }
}

// Check if test email is set
if (TEST_EMAIL === 'your-test-email@example.com') {
    console.log('⚠️  Please update TEST_EMAIL in the script or provide email as argument');
    console.log('Usage: node test-email-cli.js your-email@example.com');
    process.exit(1);
}

// Run the tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});
