// Attendance Calculator JavaScript
// This file handles the attendance simulation functionality

let currentUser = null;
let originalAttendanceData = null;
let simulatedAttendanceData = null;
let firebaseDb = null;

// Initialize Firebase and load data when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Attendance Calculator: DOM loaded');

    // Function to check Firebase readiness
    function checkFirebaseReady() {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            console.log('Firebase is ready, initializing calculator...');
            initializeCalculator();
        } else {
            console.log('Firebase not ready yet, waiting...');
            setTimeout(checkFirebaseReady, 500);
        }
    }

    checkFirebaseReady();
});

// Initialize the calculator
function initializeCalculator() {
    console.log('✅ Initializing attendance calculator...');
    console.log('✅ renderCalculatorInterface function available:', typeof renderCalculatorInterface);
    
    try {
        // Initialize Firebase database reference
        firebaseDb = firebase.firestore();
        
        // Check authentication state
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                console.log('User authenticated:', user.email);
                loadUserAttendanceData();
            } else {
                console.log('User not authenticated, redirecting to login...');
                window.location.href = 'login.html';
            }
        });
        
        // Set up event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing calculator:', error);
        showToast('Error initializing calculator', 'danger');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Reset all button
    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAllSimulations);
    }

    // Detect button
    const detectBtn = document.getElementById('detectBtn');
    if (detectBtn) {
        detectBtn.addEventListener('click', async () => {
            const results = await detectDeletedSubjects();
            if (results) {
                let message = `Analysis Results:\n`;
                message += `✅ Valid subjects: ${results.valid.length}\n`;
                message += `🗑️ Deleted subjects: ${results.deleted.length}\n`;
                message += `📭 Empty subjects: ${results.empty.length}\n\n`;

                if (results.deleted.length > 0) {
                    message += `Deleted subjects found:\n`;
                    results.deleted.forEach(s => {
                        message += `- ${s.name} (${s.total} total classes)\n`;
                    });
                }

                if (results.empty.length > 0) {
                    message += `\nEmpty subjects found:\n`;
                    results.empty.forEach(s => {
                        message += `- ${s.name} (no attendance data)\n`;
                    });
                }

                alert(message);
                console.log('Full analysis results:', results);
            }
        });
    }

    // Cleanup button
    const cleanupBtn = document.getElementById('cleanupBtn');
    if (cleanupBtn) {
        cleanupBtn.addEventListener('click', () => {
            if (confirm('This will permanently remove subjects with no attendance data AND deleted subjects from your Firebase database. Are you sure?')) {
                cleanupUserAttendanceData();
            }
        });
    }
}

// Load user's attendance data - CALCULATOR SPECIFIC VERSION
async function loadUserAttendanceData() {
    try {
        showLoading('Loading your attendance data...');

        // Validate Firebase connection
        if (!firebaseDb) {
            throw new Error('Firebase database not initialized');
        }

        if (!currentUser) {
            throw new Error('No authenticated user found');
        }

        console.log('Loading data for user:', currentUser.uid);

        // Get user's attendance data from Firestore
        const userDoc = await firebaseDb.collection('users').doc(currentUser.uid).get();

        if (!userDoc.exists) {
            hideLoading();
            showToast('User data not found', 'danger');
            return;
        }

        const userData = userDoc.data();
        const rawAttendanceData = userData.attendanceData || { subjects: {} };

        // DETAILED DEBUG LOGGING
        console.log('=== CALCULATOR DEBUG START ===');
        console.log('Full user document:', userData);
        console.log('Raw attendance data from Firebase:', rawAttendanceData);

        // Check what's in the admin subjects collection and get active subjects
        let activeSubjectNames = new Set();
        try {
            const subjectsSnapshot = await firebaseDb.collection('subjects').get();
            console.log('Admin subjects collection:');
            subjectsSnapshot.forEach(doc => {
                const subjectData = doc.data();
                activeSubjectNames.add(subjectData.name);
                console.log(`  - ${doc.id}: ${JSON.stringify(subjectData)}`);
            });
            console.log('Active subject names:', Array.from(activeSubjectNames));
        } catch (error) {
            console.log('Error fetching admin subjects:', error);
        }

        // FILTER OUT SUBJECTS WITH NO ACTUAL ATTENDANCE DATA AND DELETED SUBJECTS
        const filteredSubjects = {};
        const allSubjects = rawAttendanceData.subjects || {};

        console.log('Filtering subjects...');
        console.log('Checking subjects against active subjects list...');

        Object.keys(allSubjects).forEach(subjectName => {
            const subject = allSubjects[subjectName];
            const present = subject.present || 0;
            const absent = subject.absent || 0;
            const total = present + absent;
            const hasAttendanceData = total > 0;
            const isActiveSubject = activeSubjectNames.has(subjectName);

            console.log(`  ${subjectName}:`);
            console.log(`    - Present=${present}, Absent=${absent}, Total=${total}`);
            console.log(`    - Has attendance data: ${hasAttendanceData}`);
            console.log(`    - Is active subject: ${isActiveSubject}`);

            // Only include subjects that have attendance data AND are still active
            if (hasAttendanceData && isActiveSubject) {
                filteredSubjects[subjectName] = subject;
                console.log(`    ✓ INCLUDED: ${subjectName} (has ${total} total classes and is active)`);
            } else {
                if (!hasAttendanceData) {
                    console.log(`    ✗ EXCLUDED: ${subjectName} (no attendance data)`);
                }
                if (!isActiveSubject) {
                    console.log(`    ✗ EXCLUDED: ${subjectName} (subject has been deleted)`);
                }
            }
        });

        // Create clean attendance data with only subjects that have records
        originalAttendanceData = {
            subjects: filteredSubjects,
            todaysClasses: rawAttendanceData.todaysClasses || [],
            lastResetDate: rawAttendanceData.lastResetDate
        };

        console.log('Final filtered subjects for calculator:', Object.keys(filteredSubjects));
        console.log('=== CALCULATOR DEBUG END ===');

        // Create a deep copy for simulation
        simulatedAttendanceData = JSON.parse(JSON.stringify(originalAttendanceData));

        // Render the calculator interface
        renderCalculatorInterface();

        hideLoading();

    } catch (error) {
        console.error('Error loading attendance data:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        hideLoading();
        showToast(`Error loading attendance data: ${error.message}`, 'danger');
    }
}

// Helper function to check if a subject has actual attendance data
function hasActualAttendanceData(subjectData) {
    const present = subjectData.present || 0;
    const absent = subjectData.absent || 0;
    const total = present + absent;
    return total > 0;
}

// Debug function to analyze attendance data (can be called from browser console)
function debugAttendanceData() {
    console.log('=== ATTENDANCE DATA DEBUG ===');
    console.log('Original data:', originalAttendanceData);
    console.log('Simulated data:', simulatedAttendanceData);

    const subjects = originalAttendanceData?.subjects || {};
    console.log(`Total subjects in database: ${Object.keys(subjects).length}`);

    Object.keys(subjects).forEach(subjectName => {
        const subject = subjects[subjectName];
        const present = subject.present || 0;
        const absent = subject.absent || 0;
        const total = present + absent;
        const hasData = hasActualAttendanceData(subject);

        console.log(`${subjectName}:`);
        console.log(`  - Present: ${present}`);
        console.log(`  - Absent: ${absent}`);
        console.log(`  - Total: ${total}`);
        console.log(`  - Has attendance data: ${hasData}`);
        console.log(`  - Will show in calculator: ${hasData ? 'YES' : 'NO'}`);
    });

    console.log('=== END DEBUG ===');
}

// Function to clean up user's Firebase data (remove subjects with no attendance and deleted subjects)
async function cleanupUserAttendanceData() {
    if (!currentUser || !firebaseDb) {
        console.error('No user or database connection');
        return;
    }

    try {
        console.log('=== CLEANUP STARTING ===');

        // Get current user data
        const userDoc = await firebaseDb.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            console.error('User document not found');
            return;
        }

        // Get active subjects from admin collection
        const subjectsSnapshot = await firebaseDb.collection('subjects').get();
        const activeSubjectNames = new Set();
        subjectsSnapshot.forEach(doc => {
            const subjectData = doc.data();
            activeSubjectNames.add(subjectData.name);
        });

        console.log('Active subjects in system:', Array.from(activeSubjectNames));

        const userData = userDoc.data();
        const attendanceData = userData.attendanceData || { subjects: {} };
        const allSubjects = attendanceData.subjects || {};

        // Filter to keep only subjects with actual attendance AND that still exist
        const cleanedSubjects = {};
        let removedCount = 0;
        let deletedSubjectsCount = 0;

        Object.keys(allSubjects).forEach(subjectName => {
            const subject = allSubjects[subjectName];
            const present = subject.present || 0;
            const absent = subject.absent || 0;
            const total = present + absent;
            const hasAttendanceData = total > 0;
            const isActiveSubject = activeSubjectNames.has(subjectName);

            if (hasAttendanceData && isActiveSubject) {
                cleanedSubjects[subjectName] = subject;
                console.log(`Keeping: ${subjectName} (${total} total classes, active subject)`);
            } else {
                removedCount++;
                if (!hasAttendanceData) {
                    console.log(`Removing: ${subjectName} (no attendance data)`);
                }
                if (!isActiveSubject) {
                    deletedSubjectsCount++;
                    console.log(`Removing: ${subjectName} (subject has been deleted from system)`);
                }
            }
        });

        if (removedCount > 0) {
            // Update the user document with cleaned data
            const cleanedAttendanceData = {
                ...attendanceData,
                subjects: cleanedSubjects
            };

            await firebaseDb.collection('users').doc(currentUser.uid).update({
                attendanceData: cleanedAttendanceData,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log(`✅ Cleanup complete! Removed ${removedCount} subjects (${deletedSubjectsCount} deleted subjects, ${removedCount - deletedSubjectsCount} empty subjects).`);

            let message = `Cleaned up ${removedCount} subjects from your data`;
            if (deletedSubjectsCount > 0) {
                message += ` (${deletedSubjectsCount} deleted subjects, ${removedCount - deletedSubjectsCount} empty subjects)`;
            }
            showToast(message, 'success');

            // Reload the calculator
            loadUserAttendanceData();
        } else {
            console.log('✅ No cleanup needed - all subjects have attendance data.');
            showToast('No cleanup needed - all subjects have attendance data', 'info');
        }

        console.log('=== CLEANUP COMPLETE ===');

    } catch (error) {
        console.error('Error during cleanup:', error);
        showToast('Error during cleanup: ' + error.message, 'danger');
    }
}

// Render the calculator interface
function renderCalculatorInterface() {
    const container = document.getElementById('subjectsContainer');
    if (!container) return;

    const subjects = simulatedAttendanceData.subjects || {};

    console.log('Rendering calculator interface...');
    console.log('All subjects in data:', Object.keys(subjects));

    // Filter subjects to only show those with actual attendance records
    const subjectsWithAttendance = {};
    Object.keys(subjects).forEach(subjectName => {
        const subjectData = subjects[subjectName];

        // Only include subjects that have actual attendance records
        if (hasActualAttendanceData(subjectData)) {
            subjectsWithAttendance[subjectName] = subjectData;
            console.log(`Including subject: ${subjectName} (has attendance data)`);
        } else {
            console.log(`Excluding subject: ${subjectName} (no attendance data)`);
        }
    });

    console.log('Subjects with attendance:', Object.keys(subjectsWithAttendance));

    if (Object.keys(subjectsWithAttendance).length === 0) {
        console.log('No subjects with attendance data found, showing empty state');

        // Check if there are subjects in the data but with no attendance
        const totalSubjects = Object.keys(subjects).length;
        const hasSubjectsButNoAttendance = totalSubjects > 0;

        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-info-circle text-muted mb-3" style="font-size: 48px;"></i>
                <h5 class="text-muted">No Attendance Records Found</h5>
                <p class="text-muted">
                    ${hasSubjectsButNoAttendance ?
                        `You have ${totalSubjects} subject(s) set up, but no attendance has been marked yet. Start marking attendance on the dashboard to use the calculator.` :
                        'You don\'t have any attendance records yet. Start marking attendance on the dashboard to use the calculator.'
                    }
                </p>
                <div class="mt-3">
                    <a href="dashboard.html" class="btn btn-primary">
                        <i class="fas fa-arrow-left me-2"></i>Go to Dashboard
                    </a>
                </div>
                ${hasSubjectsButNoAttendance ? `
                    <div class="mt-3">
                        <small class="text-muted">
                            <i class="fas fa-lightbulb me-1"></i>
                            Tip: The calculator only shows subjects where you have marked at least one attendance record.
                        </small>
                    </div>
                ` : ''}
            </div>
        `;
        // Hide summary card when no data
        const summaryCard = document.getElementById('summaryCard');
        if (summaryCard) {
            summaryCard.style.display = 'none';
        }
        return;
    }

    container.innerHTML = '';

    // Render each subject that has attendance records
    Object.keys(subjectsWithAttendance).forEach(subjectName => {
        const subjectData = subjectsWithAttendance[subjectName];
        const subjectCard = createSubjectCard(subjectName, subjectData);
        container.appendChild(subjectCard);
    });

    // Show summary card
    updateSummaryCard();
    document.getElementById('summaryCard').style.display = 'block';
}

// Create a subject card
function createSubjectCard(subjectName, subjectData) {
    const present = subjectData.present || 0;
    const absent = subjectData.absent || 0;
    const total = present + absent;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    
    // Get original data for comparison
    const originalSubject = originalAttendanceData.subjects[subjectName] || { present: 0, absent: 0 };
    const originalPresent = originalSubject.present || 0;
    const originalAbsent = originalSubject.absent || 0;
    const originalTotal = originalPresent + originalAbsent;
    
    // Calculate simulation changes
    const presentChange = present - originalPresent;
    const absentChange = absent - originalAbsent;
    
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
        <div class="subject-header">
            <div class="subject-name">${subjectName}</div>
            <div class="attendance-percentage ${getPercentageClass(percentage)}">
                ${percentage}%
            </div>
        </div>
        
        <div class="stats-row">
            <div class="stat-item">
                <div class="stat-value text-success">${present}</div>
                <div class="stat-label">Present</div>
                ${presentChange !== 0 ? `<small class="text-muted">(${presentChange > 0 ? '+' : ''}${presentChange})</small>` : ''}
            </div>
            <div class="stat-item">
                <div class="stat-value text-danger">${absent}</div>
                <div class="stat-label">Absent</div>
                ${absentChange !== 0 ? `<small class="text-muted">(${absentChange > 0 ? '+' : ''}${absentChange})</small>` : ''}
            </div>
            <div class="stat-item">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Total</div>
            </div>
        </div>
        
        <div class="controls-row">
            <button class="control-btn btn-remove" onclick="simulateAttendance('${subjectName}', 'absent')" title="Add absent day">
                <i class="fas fa-minus"></i>
            </button>
            
            <div class="scenario-display">
                <div class="scenario-label">Simulation</div>
                <div class="scenario-value">
                    ${presentChange === 0 && absentChange === 0 ? 'Original' : 
                      (presentChange > 0 ? `+${presentChange}P` : '') + 
                      (absentChange > 0 ? ` +${absentChange}A` : '')}
                </div>
            </div>
            
            <button class="control-btn btn-add" onclick="simulateAttendance('${subjectName}', 'present')" title="Add present day">
                <i class="fas fa-plus"></i>
            </button>
        </div>
        
        <div class="mt-3 text-center">
            <button class="reset-btn" onclick="resetSubjectSimulation('${subjectName}')">
                <i class="fas fa-undo me-1"></i>Reset Subject
            </button>
        </div>
    `;
    
    return card;
}

// Get percentage class for styling
function getPercentageClass(percentage) {
    if (percentage >= 90) return 'percentage-excellent';
    if (percentage >= 75) return 'percentage-good';
    if (percentage >= 60) return 'percentage-warning';
    return 'percentage-danger';
}

// Simulate attendance change
function simulateAttendance(subjectName, status) {
    if (!simulatedAttendanceData.subjects[subjectName]) {
        simulatedAttendanceData.subjects[subjectName] = { present: 0, absent: 0 };
    }
    
    if (status === 'present') {
        simulatedAttendanceData.subjects[subjectName].present++;
    } else if (status === 'absent') {
        simulatedAttendanceData.subjects[subjectName].absent++;
    }
    
    // Re-render the interface
    renderCalculatorInterface();
    
    // Show feedback
    const action = status === 'present' ? 'attendance day' : 'absent day';
    showToast(`Added simulated ${action} for ${subjectName}`, 'info');
}

// Reset simulation for a specific subject
function resetSubjectSimulation(subjectName) {
    if (originalAttendanceData.subjects[subjectName]) {
        simulatedAttendanceData.subjects[subjectName] = JSON.parse(JSON.stringify(originalAttendanceData.subjects[subjectName]));
    } else {
        simulatedAttendanceData.subjects[subjectName] = { present: 0, absent: 0 };
    }
    
    // Re-render the interface
    renderCalculatorInterface();
    
    showToast(`Reset simulation for ${subjectName}`, 'success');
}

// Reset all simulations
function resetAllSimulations() {
    simulatedAttendanceData = JSON.parse(JSON.stringify(originalAttendanceData));
    renderCalculatorInterface();
    showToast('All simulations reset to original data', 'success');
}

// Update summary card
function updateSummaryCard() {
    const summaryStats = document.getElementById('summaryStats');
    if (!summaryStats) return;

    const subjects = simulatedAttendanceData.subjects || {};
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalSessions = 0;

    // Calculate totals only for subjects with actual attendance records
    Object.values(subjects).forEach(subject => {
        const present = subject.present || 0;
        const absent = subject.absent || 0;
        const total = present + absent;

        // Only count subjects that have actual attendance records
        if (total > 0) {
            totalPresent += present;
            totalAbsent += absent;
        }
    });

    totalSessions = totalPresent + totalAbsent;
    const overallPercentage = totalSessions > 0 ? ((totalPresent / totalSessions) * 100).toFixed(1) : 0;

    // Calculate original totals for comparison (only subjects with attendance)
    const originalSubjects = originalAttendanceData.subjects || {};
    let originalTotalPresent = 0;
    let originalTotalAbsent = 0;

    Object.values(originalSubjects).forEach(subject => {
        const present = subject.present || 0;
        const absent = subject.absent || 0;
        const total = present + absent;

        // Only count subjects that have actual attendance records
        if (total > 0) {
            originalTotalPresent += present;
            originalTotalAbsent += absent;
        }
    });

    const originalTotalSessions = originalTotalPresent + originalTotalAbsent;
    const originalPercentage = originalTotalSessions > 0 ? ((originalTotalPresent / originalTotalSessions) * 100).toFixed(1) : 0;

    const percentageChange = (overallPercentage - originalPercentage).toFixed(1);

    summaryStats.innerHTML = `
        <div class="summary-stat">
            <div class="summary-stat-value">${overallPercentage}%</div>
            <div class="summary-stat-label">Overall Percentage</div>
            ${percentageChange != 0 ? `<small>(${percentageChange > 0 ? '+' : ''}${percentageChange}%)</small>` : ''}
        </div>
        <div class="summary-stat">
            <div class="summary-stat-value">${totalPresent}</div>
            <div class="summary-stat-label">Total Present</div>
            ${totalPresent !== originalTotalPresent ? `<small>(${totalPresent - originalTotalPresent > 0 ? '+' : ''}${totalPresent - originalTotalPresent})</small>` : ''}
        </div>
        <div class="summary-stat">
            <div class="summary-stat-value">${totalAbsent}</div>
            <div class="summary-stat-label">Total Absent</div>
            ${totalAbsent !== originalTotalAbsent ? `<small>(${totalAbsent - originalTotalAbsent > 0 ? '+' : ''}${totalAbsent - originalTotalAbsent})</small>` : ''}
        </div>
        <div class="summary-stat">
            <div class="summary-stat-value">${totalSessions}</div>
            <div class="summary-stat-label">Total Sessions</div>
            ${totalSessions !== originalTotalSessions ? `<small>(${totalSessions - originalTotalSessions > 0 ? '+' : ''}${totalSessions - originalTotalSessions})</small>` : ''}
        </div>
    `;
}

// Utility functions
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const text = document.getElementById('loadingText');
    if (overlay && text) {
        text.textContent = message;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        // Update message
        toastMessage.textContent = message;
        
        // Update toast styling based on type
        toast.className = `toast align-items-center text-white border-0 shadow-lg`;
        
        switch (type) {
            case 'success':
                toast.classList.add('bg-success');
                break;
            case 'danger':
            case 'error':
                toast.classList.add('bg-danger');
                break;
            case 'warning':
                toast.classList.add('bg-warning');
                break;
            case 'info':
                toast.classList.add('bg-info');
                break;
            default:
                toast.classList.add('bg-success');
        }
        
        // Show toast
        const bootstrapToast = new bootstrap.Toast(toast);
        bootstrapToast.show();
    }
}

// Function to detect deleted subjects in user data
async function detectDeletedSubjects() {
    if (!currentUser || !firebaseDb) {
        console.error('No user or database connection');
        return;
    }

    try {
        console.log('=== DETECTING DELETED SUBJECTS ===');

        // Get current user data
        const userDoc = await firebaseDb.collection('users').doc(currentUser.uid).get();
        if (!userDoc.exists) {
            console.error('User document not found');
            return;
        }

        // Get active subjects from admin collection
        const subjectsSnapshot = await firebaseDb.collection('subjects').get();
        const activeSubjectNames = new Set();
        subjectsSnapshot.forEach(doc => {
            const subjectData = doc.data();
            activeSubjectNames.add(subjectData.name);
        });

        const userData = userDoc.data();
        const attendanceData = userData.attendanceData || { subjects: {} };
        const allSubjects = attendanceData.subjects || {};

        const deletedSubjects = [];
        const emptySubjects = [];
        const validSubjects = [];

        Object.keys(allSubjects).forEach(subjectName => {
            const subject = allSubjects[subjectName];
            const present = subject.present || 0;
            const absent = subject.absent || 0;
            const total = present + absent;
            const hasAttendanceData = total > 0;
            const isActiveSubject = activeSubjectNames.has(subjectName);

            if (!isActiveSubject) {
                deletedSubjects.push({ name: subjectName, present, absent, total });
            } else if (!hasAttendanceData) {
                emptySubjects.push({ name: subjectName, present, absent, total });
            } else {
                validSubjects.push({ name: subjectName, present, absent, total });
            }
        });

        console.log('📊 ANALYSIS RESULTS:');
        console.log(`✅ Valid subjects (${validSubjects.length}):`, validSubjects);
        console.log(`🗑️ Deleted subjects (${deletedSubjects.length}):`, deletedSubjects);
        console.log(`📭 Empty subjects (${emptySubjects.length}):`, emptySubjects);

        return {
            valid: validSubjects,
            deleted: deletedSubjects,
            empty: emptySubjects
        };

    } catch (error) {
        console.error('Error detecting deleted subjects:', error);
        return null;
    }
}

// Make functions available globally
window.debugAttendanceData = debugAttendanceData;
window.cleanupUserAttendanceData = cleanupUserAttendanceData;
window.detectDeletedSubjects = detectDeletedSubjects;
