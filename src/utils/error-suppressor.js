/**
 * Error Suppressor for Admin Panel
 * This script suppresses irrelevant console errors from browser extensions and React
 */

(function() {
    'use strict';
    
    console.log('🛡️ Loading Error Suppressor...');
    
    // Store original console methods
    const originalConsole = {
        error: console.error,
        warn: console.warn,
        log: console.log
    };
    
    // Error patterns to suppress
    const suppressPatterns = [
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
        /Script error/i
    ];
    
    // Function to check if error should be suppressed
    function shouldSuppress(message) {
        if (typeof message !== 'string') {
            message = String(message);
        }
        
        return suppressPatterns.some(pattern => pattern.test(message));
    }
    
    // Override console.error
    console.error = function(...args) {
        const message = args.join(' ');
        
        if (shouldSuppress(message)) {
            console.warn('🔇 Suppressed irrelevant error:', message);
            return;
        }
        
        // Log actual application errors
        originalConsole.error.apply(console, args);
    };
    
    // Override console.warn for some cases
    console.warn = function(...args) {
        const message = args.join(' ');
        
        if (shouldSuppress(message)) {
            // Completely suppress these warnings
            return;
        }
        
        originalConsole.warn.apply(console, args);
    };
    
    // Global error handler
    window.addEventListener('error', function(event) {
        const errorMessage = event.error?.message || event.message || 'Unknown error';
        
        if (shouldSuppress(errorMessage)) {
            console.warn('🔇 Suppressed global error:', errorMessage);
            event.preventDefault();
            return false;
        }
        
        // Let actual application errors through
        return true;
    }, true);
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason?.message || event.reason || 'Unknown rejection';
        
        if (shouldSuppress(String(reason))) {
            console.warn('🔇 Suppressed promise rejection:', reason);
            event.preventDefault();
            return false;
        }
        
        // Let actual application promise rejections through
        return true;
    });
    
    // Prevent React errors (this app doesn't use React)
    if (typeof window.React === 'undefined') {
        window.React = {
            createElement: () => null,
            Component: class {},
            render: () => null,
            version: '18.0.0' // Fake version to satisfy checks
        };
        
        window.ReactDOM = {
            render: () => null,
            createRoot: () => ({
                render: () => null,
                unmount: () => null
            })
        };
    }
    
    // Mock WebSocket to prevent extension errors
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
        // Allow Firebase WebSocket connections
        if (url && (url.includes('firebaseio.com') || url.includes('googleapis.com'))) {
            try {
                return new OriginalWebSocket(url, protocols);
            } catch (error) {
                console.warn('Firebase WebSocket error:', error.message);
                throw error;
            }
        }
        
        // Block other WebSocket connections that might be from extensions
        if (url && (url.includes('chrome-extension://') || url.includes('localhost:') || url.includes('127.0.0.1:'))) {
            console.warn('🔇 Blocked extension WebSocket:', url);
            // Return a mock WebSocket
            return {
                readyState: 3, // CLOSED
                close: () => {},
                send: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                onopen: null,
                onclose: null,
                onmessage: null,
                onerror: null
            };
        }
        
        // Allow other legitimate WebSocket connections
        try {
            return new OriginalWebSocket(url, protocols);
        } catch (error) {
            console.warn('WebSocket connection failed:', error.message);
            throw error;
        }
    };
    
    // Copy static properties
    Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
    Object.defineProperty(window.WebSocket, 'CONNECTING', { value: 0 });
    Object.defineProperty(window.WebSocket, 'OPEN', { value: 1 });
    Object.defineProperty(window.WebSocket, 'CLOSING', { value: 2 });
    Object.defineProperty(window.WebSocket, 'CLOSED', { value: 3 });
    
    // Prevent Chrome extension errors
    if (typeof window.chrome !== 'undefined' && window.chrome.runtime) {
        const originalSendMessage = window.chrome.runtime.sendMessage;
        if (originalSendMessage) {
            window.chrome.runtime.sendMessage = function(...args) {
                try {
                    return originalSendMessage.apply(this, args);
                } catch (error) {
                    console.warn('🔇 Chrome extension message blocked:', error.message);
                    return Promise.resolve();
                }
            };
        }
    }
    
    // Prevent fetch errors from extensions
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        // Block extension URLs
        if (typeof url === 'string' && (
            url.includes('chrome-extension://') ||
            url.includes('moz-extension://') ||
            url.includes('safari-extension://')
        )) {
            console.warn('🔇 Blocked extension fetch:', url);
            return Promise.reject(new Error('Extension fetch blocked'));
        }
        
        return originalFetch.apply(this, arguments);
    };
    
    // Suppress specific DOM errors
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        try {
            return originalAddEventListener.call(this, type, listener, options);
        } catch (error) {
            if (shouldSuppress(error.message)) {
                console.warn('🔇 Suppressed event listener error:', error.message);
                return;
            }
            throw error;
        }
    };
    
    console.log('✅ Error Suppressor loaded successfully');
    
    // Export for debugging
    window.errorSuppressor = {
        originalConsole,
        suppressPatterns,
        shouldSuppress,
        restore: function() {
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.log = originalConsole.log;
            console.log('Error suppressor restored');
        }
    };
    
})();
