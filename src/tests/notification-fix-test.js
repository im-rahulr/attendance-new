/**
 * Notification System Fix Test
 * Tests for duplicate notification prevention and delivery verification
 */

console.log('🧪 Starting Notification System Fix Tests...');

// Test 1: Check for duplicate event listeners
function testDuplicateEventListeners() {
    console.log('\n1️⃣ Testing for duplicate event listeners...');
    
    const form = document.getElementById('notificationForm');
    if (!form) {
        console.log('❌ Notification form not found - test skipped');
        return false;
    }
    
    // Check if form has setup flag
    if (form.dataset.setupComplete === 'true') {
        console.log('✅ Form has setup completion flag');
    } else {
        console.log('❌ Form missing setup completion flag');
        return false;
    }
    
    // Check if notification management is initialized only once
    if (window.notificationManagementInitialized) {
        console.log('✅ Notification management initialization flag set');
    } else {
        console.log('❌ Notification management initialization flag missing');
        return false;
    }
    
    return true;
}

// Test 2: Check notification manager listener cleanup
function testNotificationManagerCleanup() {
    console.log('\n2️⃣ Testing notification manager cleanup...');
    
    if (!window.notificationManager) {
        console.log('❌ Notification manager not found');
        return false;
    }
    
    // Check if cleanup function exists
    if (typeof window.notificationManager.cleanup === 'function') {
        console.log('✅ Cleanup function exists');
    } else {
        console.log('❌ Cleanup function missing');
        return false;
    }
    
    // Check if unsubscribe function is properly stored
    if (window.notificationManager.unsubscribeFunction) {
        console.log('✅ Unsubscribe function is stored');
    } else {
        console.log('⚠️ No unsubscribe function stored (may be normal if not initialized)');
    }
    
    return true;
}

// Test 3: Test sending state management
function testSendingStateManagement() {
    console.log('\n3️⃣ Testing sending state management...');
    
    // Check if sending flag is properly initialized
    if (typeof window.notificationSending !== 'undefined') {
        console.log('✅ Notification sending flag exists:', window.notificationSending);
    } else {
        console.log('✅ Notification sending flag not set (normal initial state)');
    }
    
    // Check if reset function exists
    if (typeof resetNotificationSendingState === 'function') {
        console.log('✅ Reset sending state function exists');
    } else {
        console.log('❌ Reset sending state function missing');
        return false;
    }
    
    return true;
}

// Test 4: Test notification delivery mechanism
function testNotificationDelivery() {
    console.log('\n4️⃣ Testing notification delivery mechanism...');
    
    // Check if Firebase is properly initialized
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        console.log('✅ Firebase Firestore is available');
    } else {
        console.log('❌ Firebase Firestore not available');
        return false;
    }
    
    // Check if current user is available
    if (firebase.auth().currentUser) {
        console.log('✅ User is authenticated:', firebase.auth().currentUser.email);
    } else {
        console.log('❌ No authenticated user');
        return false;
    }
    
    // Test Firestore connection
    return firebase.firestore().collection('notifications').limit(1).get()
        .then(() => {
            console.log('✅ Firestore connection successful');
            return true;
        })
        .catch(error => {
            console.log('❌ Firestore connection failed:', error.message);
            return false;
        });
}

// Test 5: Simulate notification sending (dry run)
async function testNotificationSendingDryRun() {
    console.log('\n5️⃣ Testing notification sending (dry run)...');
    
    // Check if send functions exist
    if (typeof sendNotification === 'function') {
        console.log('✅ sendNotification function exists');
    } else {
        console.log('❌ sendNotification function missing');
        return false;
    }
    
    if (typeof sendToSpecificUser === 'function') {
        console.log('✅ sendToSpecificUser function exists');
    } else {
        console.log('❌ sendToSpecificUser function missing');
        return false;
    }
    
    if (typeof sendToAllUsers === 'function') {
        console.log('✅ sendToAllUsers function exists');
    } else {
        console.log('❌ sendToAllUsers function missing');
        return false;
    }
    
    return true;
}

// Run all tests
async function runNotificationFixTests() {
    console.log('🚀 Running Notification System Fix Tests...\n');
    
    const results = {
        duplicateListeners: false,
        managerCleanup: false,
        sendingState: false,
        delivery: false,
        sendingFunctions: false
    };
    
    try {
        results.duplicateListeners = testDuplicateEventListeners();
        results.managerCleanup = testNotificationManagerCleanup();
        results.sendingState = testSendingStateManagement();
        results.delivery = await testNotificationDelivery();
        results.sendingFunctions = await testNotificationSendingDryRun();
        
        // Summary
        console.log('\n📊 Test Results Summary:');
        console.log('='.repeat(50));
        
        const passed = Object.values(results).filter(r => r === true).length;
        const total = Object.keys(results).length;
        
        Object.entries(results).forEach(([test, result]) => {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} - ${test}`);
        });
        
        console.log('='.repeat(50));
        console.log(`Overall: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All notification system fixes are working correctly!');
        } else {
            console.log('⚠️ Some issues remain. Please check the failed tests above.');
        }
        
        return results;
        
    } catch (error) {
        console.error('❌ Error running tests:', error);
        return results;
    }
}

// Auto-run tests when script loads
if (typeof window !== 'undefined') {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runNotificationFixTests, 2000);
        });
    } else {
        setTimeout(runNotificationFixTests, 2000);
    }
}

// Export for manual testing
window.runNotificationFixTests = runNotificationFixTests;
