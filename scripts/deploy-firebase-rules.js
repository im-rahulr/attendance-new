#!/usr/bin/env node

/**
 * Firebase Rules Deployment Script
 * Deploys the updated Firestore security rules to fix admin panel permissions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Firebase Rules Deployment Script');
console.log('=====================================');

// Check if Firebase CLI is installed
try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log('✅ Firebase CLI is installed');
} catch (error) {
    console.error('❌ Firebase CLI is not installed');
    console.log('Please install it with: npm install -g firebase-tools');
    process.exit(1);
}

// Check if firestore.rules file exists
const rulesPath = path.join(process.cwd(), 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
    console.error('❌ firestore.rules file not found');
    console.log('Expected location:', rulesPath);
    process.exit(1);
}

console.log('✅ firestore.rules file found');

// Read and validate the rules file
try {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    console.log('📄 Rules file content preview:');
    console.log('---');
    console.log(rulesContent.substring(0, 500) + (rulesContent.length > 500 ? '...' : ''));
    console.log('---');
    
    // Check for admin emails in rules
    const adminEmails = ['admin@admin.com', 'admin@example.com', 'administrator@attendance.com'];
    const hasAdminEmails = adminEmails.some(email => rulesContent.includes(email));
    
    if (hasAdminEmails) {
        console.log('✅ Admin emails found in rules');
    } else {
        console.warn('⚠️ Admin emails not found in rules - this may cause permission issues');
    }
    
} catch (error) {
    console.error('❌ Error reading rules file:', error.message);
    process.exit(1);
}

// Check if user is logged in to Firebase
try {
    const loginCheck = execSync('firebase projects:list', { stdio: 'pipe', encoding: 'utf8' });
    console.log('✅ Firebase authentication verified');
} catch (error) {
    console.error('❌ Not logged in to Firebase');
    console.log('Please login with: firebase login');
    process.exit(1);
}

// Check current project
try {
    const projectInfo = execSync('firebase use', { stdio: 'pipe', encoding: 'utf8' });
    console.log('📋 Current Firebase project:', projectInfo.trim());
} catch (error) {
    console.warn('⚠️ No Firebase project selected');
    console.log('Please select a project with: firebase use <project-id>');
}

// Deploy the rules
console.log('\n🚀 Deploying Firestore rules...');

try {
    // First, validate the rules
    console.log('🔍 Validating rules...');
    execSync('firebase firestore:rules', { stdio: 'inherit' });
    
    // Deploy the rules
    console.log('📤 Deploying rules...');
    execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
    
    console.log('\n✅ Firestore rules deployed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test admin login at: file:///c:/Users/rahul/Downloads/attendance/src/pages/admin.html');
    console.log('2. Use one of these admin emails:');
    console.log('   - admin@admin.com');
    console.log('   - admin@example.com');
    console.log('   - administrator@attendance.com');
    console.log('3. Check the browser console for any remaining errors');
    
} catch (error) {
    console.error('\n❌ Error deploying rules:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if you have the correct permissions for the Firebase project');
    console.log('2. Verify the rules syntax is correct');
    console.log('3. Make sure you are using the correct Firebase project');
    process.exit(1);
}

console.log('\n🎉 Deployment complete!');
