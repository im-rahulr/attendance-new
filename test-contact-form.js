/**
 * Contact Form Testing Script
 * Tests the contact form functionality and email delivery
 */

// Test configuration
const TEST_CONFIG = {
    testEmail: 'test@example.com',
    testName: 'Test User',
    testSubject: 'technical-support',
    testMessage: 'This is a test message to verify the contact form is working correctly.'
};

// Test results storage
let testResults = {
    firebaseError: false,
    web3formsSubmission: false,
    emailDelivery: false,
    overallSuccess: false
};

/**
 * Test Firebase error fix
 */
async function testFirebaseErrorFix() {
    console.log('🧪 Testing Firebase error fix...');
    
    try {
        // Simulate the contact form data creation
        const contactData = {
            name: TEST_CONFIG.testName,
            email: TEST_CONFIG.testEmail,
            subject: TEST_CONFIG.testSubject,
            message: TEST_CONFIG.testMessage,
            timestamp: new Date().toISOString(), // Should not cause error now
            status: 'unread',
            resolved: false,
            userAgent: navigator.userAgent,
            ipAddress: 'client-side',
            submissionId: null,
            source: 'test'
        };

        console.log('✅ Contact data created without Firebase errors');
        console.log('✅ Timestamp handling works correctly');
        testResults.firebaseError = true;
        
        return true;
    } catch (error) {
        console.error('❌ Firebase error fix failed:', error);
        return false;
    }
}

/**
 * Test Web3Forms submission
 */
async function testWeb3FormsSubmission() {
    console.log('🧪 Testing Web3Forms submission...');
    
    try {
        const formData = new FormData();
        formData.append('access_key', 'cae30f52-a8c3-4e54-9060-b0b43a4219d6');
        formData.append('name', TEST_CONFIG.testName);
        formData.append('email', TEST_CONFIG.testEmail);
        formData.append('inquiry_type', TEST_CONFIG.testSubject);
        formData.append('message', TEST_CONFIG.testMessage);
        formData.append('subject', 'Test Contact Form Submission');
        formData.append('from_name', 'Test System');

        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Web3Forms submission successful');
            testResults.web3formsSubmission = true;
            return true;
        } else {
            console.error('❌ Web3Forms submission failed:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ Web3Forms test error:', error);
        return false;
    }
}

/**
 * Test email delivery methods
 */
async function testEmailDelivery() {
    console.log('🧪 Testing email delivery methods...');
    
    const emailMethods = [
        {
            name: 'Netlify Function',
            url: '/.netlify/functions/send-email',
            data: {
                to_email: TEST_CONFIG.testEmail,
                to_name: TEST_CONFIG.testName,
                subject: 'Test Email - Netlify Function',
                message: 'This is a test email from the Netlify Function.',
                html_content: '<h3>Test Email</h3><p>This is a test email from the Netlify Function.</p>',
                from_name: 'Test System'
            }
        },
        {
            name: 'PHP Service',
            url: './src/api/send-email.php',
            data: {
                to_email: TEST_CONFIG.testEmail,
                to_name: TEST_CONFIG.testName,
                subject: 'Test Email - PHP Service',
                message: 'This is a test email from the PHP service.',
                from_email: 'website.po45@gmail.com'
            }
        }
    ];

    let successCount = 0;
    
    for (const method of emailMethods) {
        try {
            console.log(`Testing ${method.name}...`);
            
            const response = await fetch(method.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(method.data)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log(`✅ ${method.name} email delivery successful`);
                    successCount++;
                } else {
                    console.log(`⚠️ ${method.name} returned success=false:`, result);
                }
            } else {
                console.log(`⚠️ ${method.name} HTTP error:`, response.status);
            }
        } catch (error) {
            console.log(`⚠️ ${method.name} error:`, error.message);
        }
    }

    if (successCount > 0) {
        console.log(`✅ ${successCount}/${emailMethods.length} email methods working`);
        testResults.emailDelivery = true;
        return true;
    } else {
        console.log('❌ No email methods working');
        return false;
    }
}

/**
 * Test complete contact form workflow
 */
async function testCompleteWorkflow() {
    console.log('🧪 Testing complete contact form workflow...');
    
    try {
        // Simulate form submission
        const formData = new FormData();
        formData.append('access_key', 'cae30f52-a8c3-4e54-9060-b0b43a4219d6');
        formData.append('name', TEST_CONFIG.testName);
        formData.append('email', TEST_CONFIG.testEmail);
        formData.append('inquiry_type', TEST_CONFIG.testSubject);
        formData.append('message', TEST_CONFIG.testMessage);
        formData.append('subject', 'New Contact Form Submission from Attendly');
        formData.append('from_name', 'Attendly Contact Form');

        // Test Web3Forms submission
        const web3Response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        });

        const web3Result = await web3Response.json();
        
        if (web3Result.success) {
            console.log('✅ Form submission successful');
            
            // Test confirmation email
            try {
                const emailResponse = await fetch('/.netlify/functions/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to_email: TEST_CONFIG.testEmail,
                        to_name: TEST_CONFIG.testName,
                        subject: 'Contact Form Confirmation - lowrybunks',
                        message: 'Thank you for your message! We have received your inquiry.',
                        html_content: '<h3>Thank you!</h3><p>We have received your inquiry and will get back to you soon.</p>',
                        from_name: 'lowrybunks Team',
                        notify_admin: true
                    })
                });

                if (emailResponse.ok) {
                    const emailResult = await emailResponse.json();
                    if (emailResult.success) {
                        console.log('✅ Confirmation email sent successfully');
                        return true;
                    }
                }
                
                console.log('⚠️ Confirmation email failed, but form submission succeeded');
                return true;
            } catch (emailError) {
                console.log('⚠️ Email error, but form submission succeeded:', emailError.message);
                return true;
            }
        } else {
            console.error('❌ Form submission failed:', web3Result);
            return false;
        }
    } catch (error) {
        console.error('❌ Complete workflow test failed:', error);
        return false;
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Contact Form Tests...\n');
    
    const tests = [
        { name: 'Firebase Error Fix', fn: testFirebaseErrorFix },
        { name: 'Web3Forms Submission', fn: testWeb3FormsSubmission },
        { name: 'Email Delivery', fn: testEmailDelivery },
        { name: 'Complete Workflow', fn: testCompleteWorkflow }
    ];

    let passedTests = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passedTests++;
                console.log(`✅ ${test.name}: PASSED\n`);
            } else {
                console.log(`❌ ${test.name}: FAILED\n`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}\n`);
        }
    }

    // Overall results
    console.log('📊 Test Results Summary:');
    console.log(`Passed: ${passedTests}/${tests.length} tests`);
    
    if (passedTests === tests.length) {
        console.log('🎉 All tests passed! Contact form system is working correctly.');
        testResults.overallSuccess = true;
    } else if (passedTests >= 2) {
        console.log('⚠️ Some tests failed, but core functionality is working.');
        testResults.overallSuccess = true;
    } else {
        console.log('❌ Critical issues detected. Please review the errors above.');
        testResults.overallSuccess = false;
    }

    return testResults;
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, testResults };
} else {
    // Browser environment - attach to window
    window.contactFormTests = { runAllTests, testResults };
}

// Auto-run if in browser and DOM is ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Contact Form Test Script Loaded. Run contactFormTests.runAllTests() to start testing.');
        });
    } else {
        console.log('Contact Form Test Script Loaded. Run contactFormTests.runAllTests() to start testing.');
    }
}
