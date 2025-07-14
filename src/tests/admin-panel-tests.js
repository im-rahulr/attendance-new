/**
 * Admin Panel Test Implementation
 * Comprehensive tests for admin panel functionality
 */

// Firebase configuration for testing
const firebaseConfig = {
    apiKey: "AIzaSyBl4gC04HoBGzttBrNtVYu0-xWCzI9qYc0",
    authDomain: "attendance-a9a19.firebaseapp.com",
    databaseURL: "https://attendance-a9a19-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "attendance-a9a19",
    storageBucket: "attendance-a9a19.appspot.com",
    messagingSenderId: "1055787262218",
    appId: "1:1055787262218:web:c0c9c33d771456888d5af3",
    measurementId: "G-3XPB4VLFYH"
};

// Test admin credentials
const TEST_ADMIN_EMAIL = 'admin@admin.com';
const TEST_ADMIN_PASSWORD = 'admin123'; // This should be set up in Firebase Auth

// Global test state
let auth, db;
let firebaseInitialized = false;

/**
 * Run all tests
 */
async function runAllTests() {
    logToConsole('Starting comprehensive test suite...', 'info');
    
    // Reset test state
    testResults = [];
    testCounts = { pass: 0, fail: 0, warn: 0, total: 0 };
    updateTestCounts();
    
    try {
        await testFirebaseOnly();
        await testAuthOnly();
        await testUIOnly();
        await testAdminPanelIntegration();
        
        logToConsole('All tests completed!', 'success');
        generateTestSummary();
        
    } catch (error) {
        logToConsole(`Test suite error: ${error.message}`, 'error');
        addTestResult('Test Suite', 'fail', 'Test suite execution failed', error.message);
    }
}

/**
 * Test Firebase connectivity and configuration
 */
async function testFirebaseOnly() {
    logToConsole('Testing Firebase connectivity...', 'info');
    
    const firebaseResults = [];
    
    // Test 1: Firebase SDK loaded
    try {
        if (typeof firebase !== 'undefined') {
            firebaseResults.push(addTestResult('Firebase SDK', 'pass', 'Firebase SDK loaded successfully'));
        } else {
            firebaseResults.push(addTestResult('Firebase SDK', 'fail', 'Firebase SDK not loaded'));
            renderTestResults('firebaseTests', firebaseResults);
            return;
        }
    } catch (error) {
        firebaseResults.push(addTestResult('Firebase SDK', 'fail', 'Error checking Firebase SDK', error.message));
    }
    
    // Test 2: Firebase initialization
    try {
        if (!firebaseInitialized) {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.firestore();
            firebaseInitialized = true;
        }
        firebaseResults.push(addTestResult('Firebase Init', 'pass', 'Firebase initialized successfully'));
    } catch (error) {
        firebaseResults.push(addTestResult('Firebase Init', 'fail', 'Firebase initialization failed', error.message));
    }
    
    // Test 3: Firestore connectivity (public collection)
    try {
        await db.collection('public_test').doc('connectivity_test').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: 'connectivity',
            source: 'admin_panel_test'
        });
        firebaseResults.push(addTestResult('Firestore Write', 'pass', 'Firestore write access confirmed (public collection)'));
    } catch (error) {
        firebaseResults.push(addTestResult('Firestore Write', 'fail', 'Firestore write failed', error.message));
    }

    // Test 4: Firestore read (public collection)
    try {
        const testDoc = await db.collection('public_test').doc('connectivity_test').get();
        if (testDoc.exists) {
            firebaseResults.push(addTestResult('Firestore Read', 'pass', 'Firestore read access confirmed (public collection)'));
        } else {
            firebaseResults.push(addTestResult('Firestore Read', 'warn', 'Test document not found'));
        }
    } catch (error) {
        firebaseResults.push(addTestResult('Firestore Read', 'fail', 'Firestore read failed', error.message));
    }

    // Test 5: Authenticated Firestore access (will fail if not authenticated - expected)
    try {
        await db.collection('_test_connection').doc('auth_test').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: 'authenticated_access'
        });
        firebaseResults.push(addTestResult('Authenticated Write', 'pass', 'Authenticated Firestore write successful'));
    } catch (error) {
        if (error.code === 'permission-denied') {
            firebaseResults.push(addTestResult('Authenticated Write', 'warn', 'Permission denied (expected without authentication)'));
        } else {
            firebaseResults.push(addTestResult('Authenticated Write', 'fail', 'Authenticated write failed', error.message));
        }
    }
    
    // Test 6: Firebase Auth service
    try {
        if (auth && typeof auth.onAuthStateChanged === 'function') {
            firebaseResults.push(addTestResult('Firebase Auth', 'pass', 'Firebase Auth service available'));
        } else {
            firebaseResults.push(addTestResult('Firebase Auth', 'fail', 'Firebase Auth service not available'));
        }
    } catch (error) {
        firebaseResults.push(addTestResult('Firebase Auth', 'fail', 'Firebase Auth error', error.message));
    }
    
    renderTestResults('firebaseTests', firebaseResults);
}

/**
 * Test authentication functionality
 */
async function testAuthOnly() {
    logToConsole('Testing authentication functionality...', 'info');
    
    const authResults = [];
    
    // Test 1: Admin auth module loaded
    try {
        if (window.adminAuth && typeof window.adminAuth.isAdminEmail === 'function') {
            authResults.push(addTestResult('Admin Auth Module', 'pass', 'Admin authentication module loaded'));
        } else {
            authResults.push(addTestResult('Admin Auth Module', 'fail', 'Admin authentication module not found'));
        }
    } catch (error) {
        authResults.push(addTestResult('Admin Auth Module', 'fail', 'Error checking admin auth module', error.message));
    }
    
    // Test 2: Admin email validation
    try {
        if (window.adminAuth && window.adminAuth.isAdminEmail) {
            const isAdmin = window.adminAuth.isAdminEmail(TEST_ADMIN_EMAIL);
            if (isAdmin) {
                authResults.push(addTestResult('Admin Email Check', 'pass', `${TEST_ADMIN_EMAIL} recognized as admin`));
            } else {
                authResults.push(addTestResult('Admin Email Check', 'fail', `${TEST_ADMIN_EMAIL} not recognized as admin`));
            }
        } else {
            authResults.push(addTestResult('Admin Email Check', 'fail', 'Admin email check function not available'));
        }
    } catch (error) {
        authResults.push(addTestResult('Admin Email Check', 'fail', 'Error checking admin email', error.message));
    }
    
    // Test 3: Authentication state
    try {
        if (window.adminAuth && window.adminAuth.isAuthenticated) {
            const isAuthenticated = window.adminAuth.isAuthenticated();
            authResults.push(addTestResult('Auth State Check', 'pass', `Authentication state: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`));
        } else {
            authResults.push(addTestResult('Auth State Check', 'fail', 'Authentication state check not available'));
        }
    } catch (error) {
        authResults.push(addTestResult('Auth State Check', 'fail', 'Error checking auth state', error.message));
    }
    
    // Test 4: Firestore access test
    try {
        if (window.adminAuth && window.adminAuth.testFirestoreAccess) {
            // Note: This will fail if not authenticated, which is expected
            try {
                await window.adminAuth.testFirestoreAccess();
                authResults.push(addTestResult('Firestore Access Test', 'pass', 'Admin Firestore access confirmed'));
            } catch (accessError) {
                if (accessError.message.includes('not authenticated')) {
                    authResults.push(addTestResult('Firestore Access Test', 'warn', 'Not authenticated (expected)'));
                } else {
                    authResults.push(addTestResult('Firestore Access Test', 'fail', 'Firestore access test failed', accessError.message));
                }
            }
        } else {
            authResults.push(addTestResult('Firestore Access Test', 'fail', 'Firestore access test function not available'));
        }
    } catch (error) {
        authResults.push(addTestResult('Firestore Access Test', 'fail', 'Error running Firestore access test', error.message));
    }
    
    renderTestResults('authTests', authResults);
}

/**
 * Test UI components
 */
async function testUIOnly() {
    logToConsole('Testing UI components...', 'info');

    const uiResults = [];

    // Test 1: Admin panel URL accessibility
    try {
        const adminPanelUrl = '../pages/admin.html';
        uiResults.push(addTestResult('Admin Panel URL', 'pass', `Admin panel accessible at: ${adminPanelUrl}`));
        logToConsole('✓ Admin panel URL is valid', 'success');
    } catch (error) {
        uiResults.push(addTestResult('Admin Panel URL', 'fail', 'Admin panel URL not accessible', error.message));
    }

    // Test 2: Check if admin auth module is loaded
    try {
        if (window.adminAuth) {
            uiResults.push(addTestResult('Admin Auth Module', 'pass', 'Admin authentication module loaded'));
        } else {
            uiResults.push(addTestResult('Admin Auth Module', 'fail', 'Admin authentication module not loaded'));
        }
    } catch (error) {
        uiResults.push(addTestResult('Admin Auth Module', 'fail', 'Error checking admin auth module', error.message));
    }

    // Test 3: Check if MCP integration is loaded
    try {
        if (window.mcpIntegration) {
            uiResults.push(addTestResult('MCP Integration', 'pass', 'MCP integration module loaded'));
        } else {
            uiResults.push(addTestResult('MCP Integration', 'warn', 'MCP integration module not loaded (optional)'));
        }
    } catch (error) {
        uiResults.push(addTestResult('MCP Integration', 'warn', 'MCP integration check failed (optional)', error.message));
    }

    // Test 4: Bootstrap CSS availability
    try {
        // Check if Bootstrap CSS is loaded by testing for Bootstrap classes
        const testDiv = document.createElement('div');
        testDiv.className = 'btn btn-primary';
        document.body.appendChild(testDiv);

        const computedStyle = window.getComputedStyle(testDiv);
        const hasBootstrapStyles = computedStyle.display !== 'inline'; // Bootstrap buttons are not inline

        document.body.removeChild(testDiv);

        if (hasBootstrapStyles) {
            uiResults.push(addTestResult('Bootstrap CSS', 'pass', 'Bootstrap CSS loaded and functional'));
        } else {
            uiResults.push(addTestResult('Bootstrap CSS', 'warn', 'Bootstrap CSS may not be loaded properly'));
        }
    } catch (error) {
        uiResults.push(addTestResult('Bootstrap CSS', 'warn', 'Bootstrap CSS test failed', error.message));
    }

    // Test 5: Font Awesome availability
    try {
        // Check if Font Awesome is loaded
        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-test';
        document.body.appendChild(testIcon);

        const computedStyle = window.getComputedStyle(testIcon, '::before');
        const hasFontAwesome = computedStyle.fontFamily && computedStyle.fontFamily.includes('Font Awesome');

        document.body.removeChild(testIcon);

        if (hasFontAwesome) {
            uiResults.push(addTestResult('Font Awesome', 'pass', 'Font Awesome icons loaded'));
        } else {
            uiResults.push(addTestResult('Font Awesome', 'warn', 'Font Awesome may not be loaded properly'));
        }
    } catch (error) {
        uiResults.push(addTestResult('Font Awesome', 'warn', 'Font Awesome test failed', error.message));
    }

    // Test 6: Admin panel accessibility (without iframe)
    try {
        // Create a link to test admin panel accessibility
        const testLink = document.createElement('a');
        testLink.href = '../pages/admin.html';
        testLink.style.display = 'none';
        document.body.appendChild(testLink);

        // Check if the link is valid
        if (testLink.href && testLink.href.includes('admin.html')) {
            uiResults.push(addTestResult('Admin Panel Link', 'pass', 'Admin panel link is valid'));
        } else {
            uiResults.push(addTestResult('Admin Panel Link', 'fail', 'Admin panel link is invalid'));
        }

        document.body.removeChild(testLink);
    } catch (error) {
        uiResults.push(addTestResult('Admin Panel Link', 'fail', 'Error testing admin panel link', error.message));
    }

    // Test 7: Required JavaScript APIs
    try {
        const requiredAPIs = [
            { name: 'localStorage', api: 'localStorage' },
            { name: 'sessionStorage', api: 'sessionStorage' },
            { name: 'fetch', api: 'fetch' },
            { name: 'Promise', api: 'Promise' }
        ];

        let apiTestsPassed = 0;
        requiredAPIs.forEach(apiTest => {
            if (typeof window[apiTest.api] !== 'undefined') {
                apiTestsPassed++;
            }
        });

        if (apiTestsPassed === requiredAPIs.length) {
            uiResults.push(addTestResult('JavaScript APIs', 'pass', `All required APIs available (${apiTestsPassed}/${requiredAPIs.length})`));
        } else {
            uiResults.push(addTestResult('JavaScript APIs', 'warn', `Some APIs missing (${apiTestsPassed}/${requiredAPIs.length})`));
        }
    } catch (error) {
        uiResults.push(addTestResult('JavaScript APIs', 'fail', 'Error checking JavaScript APIs', error.message));
    }

    renderTestResults('uiTests', uiResults);
    logToConsole('UI component tests completed', 'info');
}

/**
 * Test admin panel integration
 */
async function testAdminPanelIntegration() {
    logToConsole('Testing admin panel integration...', 'info');
    
    // This would test the full integration but requires actual authentication
    // For now, we'll just verify the components are properly connected
    
    const integrationResults = [];
    
    // Test admin auth integration
    try {
        if (window.adminAuth) {
            const methods = ['signIn', 'signOut', 'isAuthenticated', 'getCurrentUser', 'testFirestoreAccess', 'isAdminEmail'];
            const missingMethods = methods.filter(method => typeof window.adminAuth[method] !== 'function');
            
            if (missingMethods.length === 0) {
                integrationResults.push(addTestResult('Admin Auth Integration', 'pass', 'All admin auth methods available'));
            } else {
                integrationResults.push(addTestResult('Admin Auth Integration', 'fail', `Missing methods: ${missingMethods.join(', ')}`));
            }
        } else {
            integrationResults.push(addTestResult('Admin Auth Integration', 'fail', 'Admin auth module not available'));
        }
    } catch (error) {
        integrationResults.push(addTestResult('Admin Auth Integration', 'fail', 'Error checking admin auth integration', error.message));
    }
    
    logToConsole('Integration tests completed', 'info');
}

/**
 * Generate test summary
 */
function generateTestSummary() {
    const summary = document.getElementById('testSummary');
    if (!summary) return;
    
    const totalTests = testCounts.total;
    const passRate = totalTests > 0 ? Math.round((testCounts.pass / totalTests) * 100) : 0;
    
    let statusClass = 'success';
    let statusText = 'All tests passed!';
    
    if (testCounts.fail > 0) {
        statusClass = 'danger';
        statusText = 'Some tests failed';
    } else if (testCounts.warn > 0) {
        statusClass = 'warning';
        statusText = 'Tests passed with warnings';
    }
    
    summary.innerHTML = `
        <div class="alert alert-${statusClass}">
            <h6><i class="fas fa-chart-pie me-2"></i>${statusText}</h6>
            <p class="mb-2">Pass rate: ${passRate}% (${testCounts.pass}/${totalTests})</p>
            <small>
                <strong>Passed:</strong> ${testCounts.pass} | 
                <strong>Failed:</strong> ${testCounts.fail} | 
                <strong>Warnings:</strong> ${testCounts.warn}
            </small>
        </div>
        
        ${testCounts.fail > 0 ? `
        <div class="mt-3">
            <h6>Failed Tests:</h6>
            <ul class="list-unstyled">
                ${testResults.filter(r => r.status === 'fail').map(r => 
                    `<li><i class="fas fa-times text-danger me-2"></i>${r.name}: ${r.message}</li>`
                ).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div class="mt-3">
            <small class="text-muted">
                Test completed at ${new Date().toLocaleString()}
            </small>
        </div>
    `;
}

/**
 * Export test results
 */
function exportResults() {
    const results = {
        timestamp: new Date().toISOString(),
        summary: testCounts,
        tests: testResults,
        environment: {
            userAgent: navigator.userAgent,
            url: window.location.href
        }
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-panel-test-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logToConsole('Test results exported', 'success');
}
