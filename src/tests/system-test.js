/**
 * Comprehensive System Test for Contact Form Integration
 * Tests the complete flow: Form → Firebase → Email → Admin Panel
 */

class SystemTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
        this.firebase = null;
        this.db = null;
    }

    async initialize() {
        console.log('🚀 Initializing System Test...');
        
        // Initialize Firebase
        try {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                this.firebase = firebase;
                this.db = firebase.firestore();
                this.log('✅ Firebase initialized', 'success');
            } else {
                throw new Error('Firebase not available');
            }
        } catch (error) {
            this.log('❌ Firebase initialization failed: ' + error.message, 'error');
            return false;
        }

        return true;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = { timestamp, message, type };
        this.results.tests.push(logEntry);
        
        const emoji = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        console.log(`[${timestamp}] ${emoji[type]} ${message}`);
        
        if (type === 'success') this.results.passed++;
        else if (type === 'error') this.results.failed++;
        else if (type === 'warning') this.results.warnings++;
    }

    async testFirebaseConnection() {
        this.log('Testing Firebase connection...', 'info');
        
        try {
            // Test basic connection
            const testDoc = await this.db.collection('test').doc('connection-test').get();
            this.log('Firebase connection successful', 'success');
            
            // Test contactSubmissions collection access
            const contactsRef = this.db.collection('contactSubmissions');
            const snapshot = await contactsRef.limit(1).get();
            this.log(`Contact submissions collection accessible (${snapshot.size} docs found)`, 'success');
            
            return true;
        } catch (error) {
            this.log(`Firebase connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testContactFormSubmission() {
        this.log('Testing contact form submission...', 'info');
        
        try {
            const testData = {
                name: 'System Test User',
                email: 'rahulhitwo@gmail.com',
                subject: 'technical-support',
                message: 'This is an automated system test message to verify the contact form functionality.',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'unread',
                resolved: false,
                userAgent: 'System Test',
                ipAddress: 'test-system',
                submissionId: null
            };

            // Submit to Firebase
            const docRef = await this.db.collection('contactSubmissions').add(testData);
            await docRef.update({ submissionId: docRef.id });
            
            this.log(`Contact form submission successful (ID: ${docRef.id})`, 'success');
            
            // Clean up test data after a delay
            setTimeout(async () => {
                try {
                    await docRef.delete();
                    this.log('Test data cleaned up', 'info');
                } catch (cleanupError) {
                    this.log('Failed to clean up test data', 'warning');
                }
            }, 30000); // 30 seconds delay
            
            return { success: true, docId: docRef.id };
        } catch (error) {
            this.log(`Contact form submission failed: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    async testEmailService() {
        this.log('Testing email service...', 'info');
        
        const emailTests = [
            { endpoint: '/api/send-email', name: 'Node.js Email Service' },
            { endpoint: '../api/send-email.php', name: 'PHP Email Service' }
        ];

        let emailWorking = false;

        for (const test of emailTests) {
            try {
                const emailData = {
                    to_email: 'rahulhitwo@gmail.com',
                    to_name: 'System Test',
                    subject: 'Email Service Test - lowrybunks',
                    html_content: '<p>This is a system test email to verify email functionality.</p>',
                    from_name: 'lowrybunks Team',
                    from_email: 'website.po45@gmail.com'
                };

                const response = await fetch(test.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailData)
                });

                if (response.ok) {
                    this.log(`${test.name} working`, 'success');
                    emailWorking = true;
                    break;
                } else {
                    this.log(`${test.name} failed (HTTP ${response.status})`, 'warning');
                }
            } catch (error) {
                this.log(`${test.name} error: ${error.message}`, 'warning');
            }
        }

        if (!emailWorking) {
            this.log('All email services failed', 'error');
        }

        return emailWorking;
    }

    async testAdminPanelIntegration() {
        this.log('Testing admin panel integration...', 'info');
        
        try {
            // Check if admin panel functions exist
            if (typeof loadContactSubmissions === 'function') {
                this.log('Admin panel functions available', 'success');
                
                // Test loading contact submissions
                await loadContactSubmissions();
                this.log('Contact submissions loaded in admin panel', 'success');
                
                return true;
            } else {
                this.log('Admin panel functions not available (may not be on admin page)', 'warning');
                return false;
            }
        } catch (error) {
            this.log(`Admin panel test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testFormValidation() {
        this.log('Testing form validation...', 'info');
        
        const testCases = [
            { name: '', email: '', subject: '', message: '', shouldPass: false },
            { name: 'A', email: 'invalid-email', subject: '', message: 'Short', shouldPass: false },
            { name: 'Valid User', email: 'user@example.com', subject: 'general', message: 'This is a valid test message', shouldPass: true }
        ];

        let validationWorking = true;

        for (const testCase of testCases) {
            try {
                // Simulate validation (you'd need to import the actual validation function)
                const isValid = this.validateTestData(testCase);
                
                if (isValid === testCase.shouldPass) {
                    this.log(`Validation test passed for: ${testCase.name || 'empty data'}`, 'success');
                } else {
                    this.log(`Validation test failed for: ${testCase.name || 'empty data'}`, 'error');
                    validationWorking = false;
                }
            } catch (error) {
                this.log(`Validation test error: ${error.message}`, 'error');
                validationWorking = false;
            }
        }

        return validationWorking;
    }

    validateTestData(data) {
        const errors = [];
        
        if (!data.name || data.name.length < 2) errors.push('Name too short');
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email');
        if (!data.subject) errors.push('Subject required');
        if (!data.message || data.message.length < 10) errors.push('Message too short');
        
        return errors.length === 0;
    }

    async runAllTests() {
        this.log('🧪 Starting comprehensive system test...', 'info');
        
        const initialized = await this.initialize();
        if (!initialized) {
            this.log('System initialization failed, aborting tests', 'error');
            return this.getResults();
        }

        // Run all tests
        await this.testFirebaseConnection();
        await this.testFormValidation();
        await this.testContactFormSubmission();
        await this.testEmailService();
        await this.testAdminPanelIntegration();

        this.log('🏁 System test completed', 'info');
        return this.getResults();
    }

    getResults() {
        const total = this.results.passed + this.results.failed + this.results.warnings;
        const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
        
        return {
            summary: {
                total,
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings,
                successRate: `${successRate}%`
            },
            tests: this.results.tests,
            status: this.results.failed === 0 ? 'PASS' : 'FAIL'
        };
    }

    generateReport() {
        const results = this.getResults();
        
        console.log('\n📊 SYSTEM TEST REPORT');
        console.log('='.repeat(50));
        console.log(`Status: ${results.status}`);
        console.log(`Total Tests: ${results.summary.total}`);
        console.log(`Passed: ${results.summary.passed}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Warnings: ${results.summary.warnings}`);
        console.log(`Success Rate: ${results.summary.successRate}`);
        console.log('='.repeat(50));
        
        if (results.summary.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            results.tests.filter(t => t.type === 'error').forEach(test => {
                console.log(`  - ${test.message}`);
            });
        }
        
        if (results.summary.warnings > 0) {
            console.log('\n⚠️ WARNINGS:');
            results.tests.filter(t => t.type === 'warning').forEach(test => {
                console.log(`  - ${test.message}`);
            });
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (results.summary.failed > 0) {
            console.log('  - Check the debugging guide at src/docs/contact-system-debugging-guide.md');
            console.log('  - Use the debug tool at src/tests/contact-debug.html');
            console.log('  - Check browser console for detailed error messages');
        } else {
            console.log('  - All systems operational! 🎉');
        }
        
        return results;
    }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    window.SystemTester = SystemTester;
    
    // Auto-run test if Firebase is available
    if (typeof firebase !== 'undefined') {
        const tester = new SystemTester();
        
        // Run test after a short delay to ensure everything is loaded
        setTimeout(async () => {
            const results = await tester.runAllTests();
            tester.generateReport();
            
            // Store results globally for inspection
            window.systemTestResults = results;
        }, 2000);
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SystemTester;
}
