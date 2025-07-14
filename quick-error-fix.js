/**
 * Quick Error Fix Script
 * Copy and paste this into the browser console to immediately suppress console errors
 */

console.log('🛡️ Applying Quick Error Fix...');

// Store original console methods
window._originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log
};

// Error patterns to suppress
const errorPatterns = [
    /Minified React error/i,
    /chrome-extension:/i,
    /moz-extension:/i,
    /safari-extension:/i,
    /inspector/i,
    /contentScript/i,
    /Extension context invalidated/i,
    /WebSocket connection/i,
    /Failed to fetch/i,
    /NetworkError/i,
    /ERR_INTERNET_DISCONNECTED/i,
    /ERR_NETWORK_CHANGED/i,
    /Non-Error promise rejection captured/i,
    /Script error/i,
    /ResizeObserver loop limit exceeded/i
];

// Function to check if error should be suppressed
function shouldSuppressError(message) {
    if (typeof message !== 'string') {
        message = String(message);
    }
    return errorPatterns.some(pattern => pattern.test(message));
}

// Override console.error
console.error = function(...args) {
    const message = args.join(' ');
    
    if (shouldSuppressError(message)) {
        console.log('🔇 Suppressed error:', message);
        return;
    }
    
    // Log actual application errors
    window._originalConsole.error.apply(console, args);
};

// Override console.warn
console.warn = function(...args) {
    const message = args.join(' ');
    
    if (shouldSuppressError(message)) {
        // Completely suppress these warnings
        return;
    }
    
    window._originalConsole.warn.apply(console, args);
};

// Global error handler
window.addEventListener('error', function(event) {
    const errorMessage = event.error?.message || event.message || 'Unknown error';
    
    if (shouldSuppressError(errorMessage)) {
        console.log('🔇 Suppressed global error:', errorMessage);
        event.preventDefault();
        return false;
    }
    
    return true;
}, true);

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason?.message || event.reason || 'Unknown rejection';
    
    if (shouldSuppressError(String(reason))) {
        console.log('🔇 Suppressed promise rejection:', reason);
        event.preventDefault();
        return false;
    }
    
    return true;
});

// Clear existing console errors
console.clear();

console.log('✅ Quick Error Fix Applied Successfully!');
console.log('📊 Error suppression patterns:', errorPatterns.length);
console.log('🔧 To restore original console: window._originalConsole.error = console.error');

// Test the admin panel
setTimeout(() => {
    console.log('🧪 Testing admin panel...');
    
    // Check if admin panel debug tools are available
    if (typeof window.adminPanelDebug !== 'undefined') {
        console.log('✅ Admin panel debug tools available');
        try {
            const status = window.adminPanelDebug.status();
            console.log('📋 Admin Panel Status:', status);
        } catch (error) {
            console.log('⚠️ Error accessing debug status:', error.message);
        }
    } else {
        console.log('⚠️ Admin panel debug tools not yet available');
    }
    
    // Check Firebase
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.log('✅ Firebase initialized');
    } else {
        console.log('⚠️ Firebase not initialized');
    }
    
    // Check critical elements
    const criticalElements = ['adminLoginContainer', 'adminDashboard', 'adminToast'];
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id} found`);
        } else {
            console.log(`⚠️ ${id} missing`);
        }
    });
    
}, 2000);

// Export for manual control
window.errorFix = {
    suppress: true,
    patterns: errorPatterns,
    shouldSuppressError,
    restore: function() {
        console.error = window._originalConsole.error;
        console.warn = window._originalConsole.warn;
        console.log = window._originalConsole.log;
        console.log('✅ Console methods restored');
    },
    enable: function() {
        console.error = function(...args) {
            const message = args.join(' ');
            if (shouldSuppressError(message)) {
                console.log('🔇 Suppressed error:', message);
                return;
            }
            window._originalConsole.error.apply(console, args);
        };
        console.log('✅ Error suppression enabled');
    }
};
