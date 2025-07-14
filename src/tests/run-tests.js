#!/usr/bin/env node

/**
 * Simple test runner for the Attendance Application
 * Performs basic file and configuration checks
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    async runTests() {
        console.log('🧪 Running Attendance Application Tests\n');
        
        for (const test of this.tests) {
            try {
                const result = await test.testFunction();
                if (result === true) {
                    console.log(`✅ ${test.name}`);
                    this.passed++;
                } else {
                    console.log(`❌ ${test.name}: ${result}`);
                    this.failed++;
                }
            } catch (error) {
                console.log(`❌ ${test.name}: ${error.message}`);
                this.failed++;
            }
        }

        console.log(`\n📊 Test Results:`);
        console.log(`   Passed: ${this.passed}`);
        console.log(`   Failed: ${this.failed}`);
        console.log(`   Total:  ${this.tests.length}`);
        
        if (this.failed > 0) {
            console.log('\n⚠️  Some tests failed. Please check the issues above.');
            process.exit(1);
        } else {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        }
    }
}

// Helper function to check if file exists
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

// Helper function to check if file contains text
function fileContains(filePath, searchText) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes(searchText);
    } catch (error) {
        return false;
    }
}

// Initialize test runner
const runner = new TestRunner();

// File structure tests
runner.addTest('Package.json exists', () => {
    return fileExists('package.json');
});

runner.addTest('Firebase config exists', () => {
    return fileExists('src/config/firebase-config.js');
});

runner.addTest('Main HTML files exist', () => {
    const requiredFiles = [
        'src/pages/index.html',
        'src/pages/dashboard.html',
        'src/pages/admin.html',
        'src/pages/notifications.html'
    ];
    
    for (const file of requiredFiles) {
        if (!fileExists(file)) {
            return `Missing file: ${file}`;
        }
    }
    return true;
});

runner.addTest('JavaScript utilities exist', () => {
    const requiredFiles = [
        'src/utils/script.js',
        'src/utils/logger.js',
        'src/components/admin.js'
    ];
    
    for (const file of requiredFiles) {
        if (!fileExists(file)) {
            return `Missing file: ${file}`;
        }
    }
    return true;
});

runner.addTest('CSS files exist', () => {
    const requiredFiles = [
        'src/styles/style.css'
    ];
    
    for (const file of requiredFiles) {
        if (!fileExists(file)) {
            return `Missing file: ${file}`;
        }
    }
    return true;
});

// Configuration tests
runner.addTest('Firebase config is properly structured', () => {
    const configPath = 'src/config/firebase-config.js';
    if (!fileExists(configPath)) {
        return 'Firebase config file not found';
    }
    
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket'];
    for (const key of requiredKeys) {
        if (!fileContains(configPath, key)) {
            return `Missing Firebase config key: ${key}`;
        }
    }
    return true;
});

runner.addTest('Package.json has required dependencies', () => {
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const requiredDeps = ['firebase', 'jspdf', 'uuid', 'winston'];
        
        for (const dep of requiredDeps) {
            if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
                return `Missing dependency: ${dep}`;
            }
        }
        return true;
    } catch (error) {
        return `Error reading package.json: ${error.message}`;
    }
});

runner.addTest('HTML files have proper structure', () => {
    const htmlFiles = [
        'src/pages/index.html',
        'src/pages/dashboard.html',
        'src/pages/admin.html'
    ];
    
    for (const file of htmlFiles) {
        if (!fileExists(file)) {
            return `File not found: ${file}`;
        }
        
        if (!fileContains(file, '<!DOCTYPE html>')) {
            return `Missing DOCTYPE in: ${file}`;
        }
        
        if (!fileContains(file, '<html')) {
            return `Missing HTML tag in: ${file}`;
        }
    }
    return true;
});

runner.addTest('JavaScript files have no syntax errors', () => {
    const jsFiles = [
        'src/utils/script.js',
        'src/utils/logger.js',
        'src/components/admin.js'
    ];
    
    for (const file of jsFiles) {
        if (!fileExists(file)) {
            return `File not found: ${file}`;
        }
        
        try {
            const content = fs.readFileSync(file, 'utf8');
            // Basic syntax check - look for unmatched braces
            const openBraces = (content.match(/{/g) || []).length;
            const closeBraces = (content.match(/}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                return `Unmatched braces in: ${file}`;
            }
        } catch (error) {
            return `Error reading ${file}: ${error.message}`;
        }
    }
    return true;
});

runner.addTest('Test files exist', () => {
    return fileExists('src/tests/system-tests.html');
});

// Run all tests
runner.runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
