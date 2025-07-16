/**
 * Initialize EmailJS Database Collections
 * Run this script to set up the initial email templates and settings
 */

// This script should be run in the browser console with Firebase initialized
// Or can be adapted to run with Firebase Admin SDK

async function initializeEmailJSDatabase() {
    try {
        console.log('🔧 Initializing EmailJS database collections...');

        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase not initialized. Please ensure Firebase is loaded.');
        }

        const db = firebase.firestore();

        // 1. Create default welcome email template
        console.log('📧 Creating default welcome email template...');
        await db.collection('emailTemplates').doc('welcome').set({
            id: "welcome",
            name: "Welcome Email",
            description: "Email sent to new users upon registration",
            subject: "Welcome to Attendly - Your Attendance Tracking Journey Begins!",
            content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0D1117; color: #F0F6FC; padding: 20px; border-radius: 8px;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #58A6FF; margin: 0; font-size: 28px;">Welcome to Attendly!</h1>
        <p style="color: #8B949E; margin: 10px 0 0 0; font-size: 16px;">Your Attendance Tracking Journey Begins</p>
    </div>
    
    <div style="background-color: #161B22; padding: 25px; border-radius: 6px; border: 1px solid #30363D; margin-bottom: 25px;">
        <h2 style="color: #F0F6FC; margin: 0 0 15px 0; font-size: 20px;">Hello {{userName}}!</h2>
        <p style="color: #C9D1D9; line-height: 1.6; margin: 0 0 15px 0;">
            Thank you for joining Attendly! We're excited to help you track and manage your attendance efficiently.
        </p>
        <p style="color: #C9D1D9; line-height: 1.6; margin: 0;">
            Your account has been successfully created and you can now start using all the features of our platform.
        </p>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
        <a href="{{dashboardUrl}}" style="background-color: #238636; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Access Your Dashboard
        </a>
    </div>
    
    <div style="background-color: #161B22; padding: 20px; border-radius: 6px; border: 1px solid #30363D; margin-bottom: 25px;">
        <h3 style="color: #F0F6FC; margin: 0 0 15px 0; font-size: 18px;">What's Next?</h3>
        <ul style="color: #C9D1D9; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Set up your subjects and attendance preferences</li>
            <li>Start tracking your daily attendance</li>
            <li>View detailed reports and analytics</li>
            <li>Customize your dashboard to fit your needs</li>
        </ul>
    </div>
    
    <div style="text-align: center; padding: 20px 0; border-top: 1px solid #30363D; color: #8B949E; font-size: 14px;">
        <p style="margin: 0 0 10px 0;">Need help? Contact us at {{supportEmail}}</p>
        <p style="margin: 0;">© {{currentDate}} Attendly Team. All rights reserved.</p>
    </div>
</div>
            `,
            variables: [
                "userName",
                "userEmail",
                "dashboardUrl",
                "currentDate",
                "supportEmail"
            ],
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: "system",
            version: 1
        });
        console.log('✅ Welcome email template created');

        // 2. Create EmailJS settings
        console.log('⚙️ Creating EmailJS settings...');
        await db.collection('emailSettings').doc('emailjs').set({
            provider: "EmailJS",
            publicKey: "7dVX0Su-MyNkMUoP_",
            serviceId: "service_emailjs",
            templateId: "template_welcome",
            fromName: "Attendly Team",
            fromEmail: "website.po45@gmail.com",
            isEnabled: true,
            dailyLimit: 200,
            monthlyLimit: 1000,
            currentDailyCount: 0,
            currentMonthlyCount: 0,
            lastResetDate: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: "system"
        });
        console.log('✅ EmailJS settings created');

        // 3. Verify collections were created
        console.log('🔍 Verifying database setup...');
        
        const templateDoc = await db.collection('emailTemplates').doc('welcome').get();
        const settingsDoc = await db.collection('emailSettings').doc('emailjs').get();
        
        if (templateDoc.exists && settingsDoc.exists) {
            console.log('✅ Database initialization completed successfully!');
            console.log('📊 Collections created:');
            console.log('  - emailTemplates (1 document)');
            console.log('  - emailSettings (1 document)');
            console.log('  - emailDeliveryLogs (ready for logging)');
            
            return {
                success: true,
                message: 'EmailJS database initialized successfully',
                collections: ['emailTemplates', 'emailSettings', 'emailDeliveryLogs']
            };
        } else {
            throw new Error('Verification failed - documents not found');
        }

    } catch (error) {
        console.error('❌ Error initializing EmailJS database:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    // Wait for Firebase to be ready
    document.addEventListener('DOMContentLoaded', () => {
        // Check if Firebase is loaded
        if (typeof firebase !== 'undefined') {
            console.log('🚀 EmailJS database initialization script loaded');
            console.log('💡 Run initializeEmailJSDatabase() to set up the database');
        } else {
            console.warn('⚠️ Firebase not detected. Please load Firebase before running this script.');
        }
    });
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeEmailJSDatabase };
}

// Make function globally available
if (typeof window !== 'undefined') {
    window.initializeEmailJSDatabase = initializeEmailJSDatabase;
}
