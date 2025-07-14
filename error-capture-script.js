/**
 * Error Capture Script
 * Run this in the browser console to capture and analyze all console errors
 */

console.log('🔍 Starting Error Capture and Analysis...');

// Error collection arrays
window.capturedErrors = {
    consoleErrors: [],
    globalErrors: [],
    promiseRejections: [],
    networkErrors: [],
    startTime: new Date().toISOString()
};

// Store original console methods
const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log,
    info: console.info
};

// Override console.error to capture errors
console.error = function(...args) {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        type: 'console.error',
        message: args.join(' '),
        stack: new Error().stack,
        args: args
    };
    
    window.capturedErrors.consoleErrors.push(errorInfo);
    
    // Still show the error in console
    originalConsole.error.apply(console, args);
};

// Override console.warn to capture warnings
console.warn = function(...args) {
    const warnInfo = {
        timestamp: new Date().toISOString(),
        type: 'console.warn',
        message: args.join(' '),
        args: args
    };
    
    window.capturedErrors.consoleErrors.push(warnInfo);
    
    // Still show the warning in console
    originalConsole.warn.apply(console, args);
};

// Capture global errors
window.addEventListener('error', function(event) {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        type: 'global.error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? {
            name: event.error.name,
            message: event.error.message,
            stack: event.error.stack
        } : null
    };
    
    window.capturedErrors.globalErrors.push(errorInfo);
    console.log('🚨 Global Error Captured:', errorInfo);
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    const rejectionInfo = {
        timestamp: new Date().toISOString(),
        type: 'promise.rejection',
        reason: event.reason,
        reasonString: String(event.reason),
        stack: event.reason?.stack || 'No stack trace'
    };
    
    window.capturedErrors.promiseRejections.push(rejectionInfo);
    console.log('🚨 Promise Rejection Captured:', rejectionInfo);
});

// Monitor network errors
const originalFetch = window.fetch;
window.fetch = function(...args) {
    return originalFetch.apply(this, args)
        .catch(error => {
            const networkError = {
                timestamp: new Date().toISOString(),
                type: 'network.fetch',
                url: args[0],
                error: error.message,
                stack: error.stack
            };
            
            window.capturedErrors.networkErrors.push(networkError);
            console.log('🌐 Network Error Captured:', networkError);
            throw error;
        });
};

// Function to analyze captured errors
function analyzeErrors() {
    const analysis = {
        summary: {
            totalErrors: window.capturedErrors.consoleErrors.length,
            globalErrors: window.capturedErrors.globalErrors.length,
            promiseRejections: window.capturedErrors.promiseRejections.length,
            networkErrors: window.capturedErrors.networkErrors.length,
            captureStartTime: window.capturedErrors.startTime,
            analysisTime: new Date().toISOString()
        },
        errorPatterns: {},
        topErrors: [],
        recommendations: []
    };
    
    // Analyze error patterns
    window.capturedErrors.consoleErrors.forEach(error => {
        const message = error.message;
        
        // Categorize errors
        if (message.includes('React')) {
            analysis.errorPatterns.react = (analysis.errorPatterns.react || 0) + 1;
        } else if (message.includes('chrome-extension')) {
            analysis.errorPatterns.extensions = (analysis.errorPatterns.extensions || 0) + 1;
        } else if (message.includes('inspector')) {
            analysis.errorPatterns.inspector = (analysis.errorPatterns.inspector || 0) + 1;
        } else if (message.includes('contentScript')) {
            analysis.errorPatterns.contentScript = (analysis.errorPatterns.contentScript || 0) + 1;
        } else if (message.includes('Firebase')) {
            analysis.errorPatterns.firebase = (analysis.errorPatterns.firebase || 0) + 1;
        } else if (message.includes('WebSocket')) {
            analysis.errorPatterns.websocket = (analysis.errorPatterns.websocket || 0) + 1;
        } else {
            analysis.errorPatterns.application = (analysis.errorPatterns.application || 0) + 1;
        }
    });
    
    // Get top 5 most frequent errors
    const errorCounts = {};
    window.capturedErrors.consoleErrors.forEach(error => {
        const key = error.message.substring(0, 100); // First 100 chars
        errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    analysis.topErrors = Object.entries(errorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([message, count]) => ({ message, count }));
    
    // Generate recommendations
    if (analysis.errorPatterns.react > 0) {
        analysis.recommendations.push('React errors detected - likely from browser extensions. Consider suppressing React-related errors.');
    }
    
    if (analysis.errorPatterns.extensions > 0) {
        analysis.recommendations.push('Browser extension errors detected. These can be safely suppressed.');
    }
    
    if (analysis.errorPatterns.firebase > 0) {
        analysis.recommendations.push('Firebase errors detected. Check Firebase configuration and network connectivity.');
    }
    
    if (analysis.errorPatterns.application > 0) {
        analysis.recommendations.push('Application errors detected. These need to be fixed in the code.');
    }
    
    return analysis;
}

// Function to export error data
function exportErrorData() {
    const data = {
        capturedErrors: window.capturedErrors,
        analysis: analyzeErrors(),
        browserInfo: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        }
    };
    
    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-panel-errors-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📁 Error data exported to file');
    return data;
}

// Function to display error summary
function showErrorSummary() {
    const analysis = analyzeErrors();
    
    console.log('\n📊 ERROR ANALYSIS SUMMARY');
    console.log('========================');
    console.log('Total Errors:', analysis.summary.totalErrors);
    console.log('Global Errors:', analysis.summary.globalErrors);
    console.log('Promise Rejections:', analysis.summary.promiseRejections);
    console.log('Network Errors:', analysis.summary.networkErrors);
    
    console.log('\n🏷️ ERROR PATTERNS');
    console.log('==================');
    Object.entries(analysis.errorPatterns).forEach(([pattern, count]) => {
        console.log(`${pattern}: ${count} errors`);
    });
    
    console.log('\n🔝 TOP ERRORS');
    console.log('=============');
    analysis.topErrors.forEach((error, index) => {
        console.log(`${index + 1}. (${error.count}x) ${error.message}`);
    });
    
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
    });
    
    return analysis;
}

// Auto-run analysis after 10 seconds
setTimeout(() => {
    console.log('\n🔍 Auto-running error analysis...');
    showErrorSummary();
}, 10000);

// Export functions for manual use
window.errorCapture = {
    analyze: analyzeErrors,
    summary: showErrorSummary,
    export: exportErrorData,
    data: () => window.capturedErrors,
    clear: () => {
        window.capturedErrors = {
            consoleErrors: [],
            globalErrors: [],
            promiseRejections: [],
            networkErrors: [],
            startTime: new Date().toISOString()
        };
        console.log('🧹 Error capture data cleared');
    },
    restore: () => {
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.log = originalConsole.log;
        console.log('🔄 Console methods restored');
    }
};

console.log('✅ Error capture system active');
console.log('📋 Available commands:');
console.log('  - window.errorCapture.summary() - Show error summary');
console.log('  - window.errorCapture.export() - Export error data');
console.log('  - window.errorCapture.clear() - Clear captured data');
console.log('  - window.errorCapture.restore() - Restore original console');
console.log('\n⏱️ Auto-analysis will run in 10 seconds...');
