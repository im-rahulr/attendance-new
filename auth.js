// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl4gC04HoBGzttBrNtVYu0-xWCzI9qYc0",
  authDomain: "attendance-a9a19.firebaseapp.com",
  projectId: "attendance-a9a19",
  storageBucket: "attendance-a9a19.appspot.com",
  messagingSenderId: "1055787262218",
  appId: "1:1055787262218:web:c0c9c33d771456888d5af3",
  measurementId: "G-3XPB4VLFYH"
};

// Define auth and db at file level scope so they're accessible throughout the file
let auth;
let db;

// Function to initialize Firebase with retry mechanism
function initializeFirebase(maxRetries = 3) {
  let retries = 0;
  
  const tryInitialize = () => {
    try {
      // Check if Firebase is already initialized
      if (firebase.apps.length > 0) {
        console.log("Firebase already initialized");
        auth = firebase.auth();
        db = firebase.firestore();
        return true;
      }
      
      // Initialize Firebase
      firebase.initializeApp(firebaseConfig);
      
      // Enable offline persistence for Firestore
      firebase.firestore().enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
          if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence');
          }
        });
        
      // Initialize auth and db
      auth = firebase.auth();
      db = firebase.firestore();
      
      // Set auth persistence to LOCAL to help with development environments
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((error) => {
          console.error("Auth persistence error:", error);
        });
      
      // Set network timeout settings
      firebase.firestore().settings({
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
      });
      
      // Handle the OAuth domain warning for local development
      const isLocalhost = 
        window.location.hostname === "localhost" || 
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname.includes("192.168.");
        
      if (isLocalhost) {
        console.warn("Running on localhost/development environment. Some OAuth features may not work.");
        console.warn("To fix this, add your development domain to Firebase Console -> Authentication -> Settings -> Authorized domains");
      }
      
      console.log("Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error(`Firebase initialization attempt ${retries + 1} failed:`, error);
      return false;
    }
  };

  const initWithRetry = () => {
    if (tryInitialize()) return;
    
    retries++;
    if (retries < maxRetries) {
      console.log(`Retrying Firebase initialization (${retries}/${maxRetries})...`);
      setTimeout(initWithRetry, 1500 * retries); // Incremental backoff
    } else {
      console.error(`Failed to initialize Firebase after ${maxRetries} attempts.`);
      alert("Error initializing Firebase. Please check your internet connection and try again.");
    }
  };

  initWithRetry();
}

// Initialize Firebase when the script loads
initializeFirebase();

// DOM elements
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page
    if (document.getElementById('loginTab')) {
        setupAuthUI();
        setupAuthListeners();
    }
    
    // Check if user is logged in for all pages
    checkAuthState();
});

// Set up the authentication UI
function setupAuthUI() {
    // Tab switching functionality
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginContent = document.getElementById('loginContent');
    const signupContent = document.getElementById('signupContent');
    
    loginTab.addEventListener('click', function() {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginContent.classList.remove('d-none');
        signupContent.classList.add('d-none');
    });
    
    signupTab.addEventListener('click', function() {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupContent.classList.remove('d-none');
        loginContent.classList.add('d-none');
    });
    
    // Password toggle functionality
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach(toggle => {
        const targetId = toggle.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);
        
        toggle.addEventListener('click', function() {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
            } else {
                passwordInput.type = 'password';
            }
        });
    });
}

// Set up authentication event listeners
function setupAuthListeners() {
    // Login functionality
    const loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', function() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showMessage('Please fill in all fields');
            return;
        }
        
        // Show loading state
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';
        
        // Check network connectivity first
        if (!navigator.onLine) {
            showMessage('Network error. Please check your internet connection.');
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
            return;
        }
        
        // Check if auth is defined
        if (!auth) {
            showMessage('Authentication service is not available. Please refresh the page and try again.');
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
            return;
        }
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Redirect to dashboard - without .html extension for Netlify compatibility
                window.location.href = 'dashboard';
            })
            .catch((error) => {
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
                
                // Handle specific errors
                if (error.code === 'auth/network-request-failed') {
                    showMessage('Network error. Please check your internet connection.');
                } else if (error.code === 'auth/wrong-password') {
                    showMessage('Invalid email or password. Please try again.');
                } else if (error.code === 'auth/user-not-found') {
                    showMessage('No account found with this email. Please sign up.');
                } else {
                    showMessage(`Error: ${error.message}`);
                }
            });
    });
    
    // Signup functionality
    const signupButton = document.getElementById('signupButton');
    if (signupButton) {
        signupButton.addEventListener('click', function() {
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            
            if (!name || !email || !password) {
                showMessage('Please fill in all fields');
                return;
            }
            
            // Show loading state
            signupButton.disabled = true;
            signupButton.textContent = 'Creating Account...';
            
            // Check network connectivity first
            if (!navigator.onLine) {
                showMessage('Network error. Please check your internet connection.');
                signupButton.disabled = false;
                signupButton.textContent = 'Create Account';
                return;
            }
            
            // Check if auth and db are defined
            if (!auth || !db) {
                showMessage('Authentication service is not available. Please refresh the page and try again.');
                signupButton.disabled = false;
                signupButton.textContent = 'Create Account';
                return;
            }
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Update the user's profile with their name
                    return userCredential.user.updateProfile({
                        displayName: name
                    }).then(() => {
                        // Create a user document in Firestore
                        return db.collection('users').doc(userCredential.user.uid).set({
                            name: name,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            attendanceData: {
                                subjects: {
                                    'English': { 
                                        present: 0, 
                                        absent: 0,
                                        sessions: []
                                    },
                                    'Mathematics': { 
                                        present: 0, 
                                        absent: 0,
                                        sessions: []
                                    }
                                },
                                todaysClasses: [
                                    {
                                        id: 1,
                                        subject: 'English',
                                        status: 'unmarked',
                                        label: '1st class'
                                    },
                                    {
                                        id: 2,
                                        subject: 'Mathematics',
                                        status: 'unmarked',
                                        label: '2nd class'
                                    },
                                    {
                                        id: 3,
                                        subject: 'Mathematics',
                                        status: 'unmarked',
                                        label: '3rd class'
                                    }
                                ]
                            }
                        });
                    }).then(() => {
                        // Redirect to dashboard
                        window.location.href = 'dashboard';
                    });
                })
                .catch((error) => {
                    signupButton.disabled = false;
                    signupButton.textContent = 'Create Account';
                    
                    // Handle specific errors
                    if (error.code === 'auth/network-request-failed') {
                        showMessage('Network error. Please check your internet connection.');
                    } else if (error.code === 'auth/email-already-in-use') {
                        showMessage('Email already in use. Try logging in instead.');
                    } else if (error.code === 'auth/weak-password') {
                        showMessage('Password is too weak. Please use a stronger password.');
                    } else {
                        showMessage(`Error: ${error.message}`);
                    }
                });
        });
    }
    
    // Google Sign In
    const googleLogin = document.getElementById('googleLogin');
    if (googleLogin) {
        googleLogin.addEventListener('click', function() {
            // Check network connectivity first
            if (!navigator.onLine) {
                showMessage('Network error. Please check your internet connection.');
                return;
            }
            
            // Check if auth and db are defined
            if (!auth || !db) {
                showMessage('Authentication service is not available. Please refresh the page and try again.');
                return;
            }
            
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    // Check if this is a new user
                    const isNewUser = result.additionalUserInfo.isNewUser;
                    if (isNewUser) {
                        // Create a user document in Firestore
                        return db.collection('users').doc(result.user.uid).set({
                            name: result.user.displayName,
                            email: result.user.email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            attendanceData: {
                                subjects: {
                                    'English': { 
                                        present: 0, 
                                        absent: 0,
                                        sessions: []
                                    },
                                    'Mathematics': { 
                                        present: 0, 
                                        absent: 0,
                                        sessions: []
                                    }
                                },
                                todaysClasses: [
                                    {
                                        id: 1,
                                        subject: 'English',
                                        status: 'present',
                                        label: '1st class'
                                    },
                                    {
                                        id: 2,
                                        subject: 'Mathematics',
                                        status: 'present',
                                        label: '2nd class'
                                    },
                                    {
                                        id: 3,
                                        subject: 'Mathematics',
                                        status: 'present',
                                        label: '3rd class'
                                    }
                                ]
                            }
                        }).then(() => {
                            // Redirect to dashboard
                            window.location.href = 'dashboard';
                        });
                    } else {
                        // Redirect to dashboard
                        window.location.href = 'dashboard';
                    }
                })
                .catch((error) => {
                    if (error.code === 'auth/network-request-failed') {
                        showMessage('Network error. Please check your internet connection.');
                    } else {
                        showMessage(`Error: ${error.message}`);
                    }
                });
        });
    }
    
    // Reset password functionality
    const forgotPassword = document.getElementById('forgotPassword');
    if (forgotPassword) {
        forgotPassword.addEventListener('click', function(e) {
            e.preventDefault();
            const email = prompt('Enter your email to reset your password:');
            if (email) {
                // Check network connectivity first
                if (!navigator.onLine) {
                    showMessage('Network error. Please check your internet connection.');
                    return;
                }
                
                // Check if auth is defined
                if (!auth) {
                    showMessage('Authentication service is not available. Please refresh the page and try again.');
                    return;
                }
                
                auth.sendPasswordResetEmail(email)
                    .then(() => {
                        alert('Password reset email sent. Check your inbox.');
                    })
                    .catch((error) => {
                        if (error.code === 'auth/network-request-failed') {
                            showMessage('Network error. Please check your internet connection.');
                        } else if (error.code === 'auth/user-not-found') {
                            showMessage('No account found with this email.');
                        } else {
                            showMessage(`Error: ${error.message}`);
                        }
                    });
            }
        });
    }
}

// Check authentication state
function checkAuthState() {
    // Check if auth is defined before using it
    if (!auth) {
        console.error('Authentication service is not initialized');
        return;
    }
    
    auth.onAuthStateChanged((user) => {
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('login') || currentPath.endsWith('/');

        // If we're on login page and user is logged in, redirect to dashboard
        if (user && isAuthPage) {
            window.location.href = 'dashboard'; // No .html extension for Netlify compatibility
        }
        
        // If we're on a protected page and user is not logged in, redirect to login
        if (!user && !isAuthPage) {
            window.location.href = 'login.html';
        }
        
        // Update profile icon with user's initial if available
        if (user) {
            const profileIcon = document.querySelector('.profile-icon');
            if (profileIcon) {
                profileIcon.textContent = getInitials(user.displayName || user.email || 'U');
            }
            
            // Update greeting if on index.html
            const greeting = document.querySelector('.greeting');
            if (greeting && (currentPath.includes('dashboard') || currentPath.endsWith('/'))) {
                const userName = user.displayName?.split(' ')[0] || 'User';
                greeting.innerHTML = `Hello, <span id="userName">${userName}</span>!`;
            }
        }
    });
}

// Helper functions
function showMessage(message) {
    // You can replace this with a more sophisticated notification system
    alert(message);
}

function getInitials(name) {
    return name.split(' ').map(part => part[0]).join('').toUpperCase();
} 