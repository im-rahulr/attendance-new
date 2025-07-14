# Attendance Application

A comprehensive attendance tracking system with admin panel built with Firebase and vanilla JavaScript.

## Project Structure

```
attendance/
├── src/                    # Source code directory
│   ├── components/         # Reusable UI components and scripts
│   │   ├── theme.js       # Theme management
│   │   ├── notifications.js # Notification handling
│   │   ├── notifications-ui.js # Notification UI components
│   │   ├── dashboard-ui.js # Dashboard UI components
│   │   ├── admin.js       # Admin panel functionality
│   │   └── admin-script.js # Additional admin scripts
│   ├── pages/             # HTML pages
│   │   ├── index.html     # Entry point (redirects to login)
│   │   ├── login.html     # Authentication page
│   │   ├── dashboard.html # Main dashboard
│   │   ├── profile.html   # User profile management
│   │   ├── report.html    # Attendance reports
│   │   ├── notifications.html # Notification center
│   │   ├── admin.html     # Administrative panel
│   │   └── contact.html   # Contact page
│   ├── styles/            # CSS stylesheets
│   │   └── style.css      # Main stylesheet with theme support
│   ├── utils/             # Utility functions
│   │   ├── script.js      # Core functionality
│   │   └── validation.js  # Form validation utilities
│   ├── api/               # API and authentication
│   │   ├── auth.js        # Firebase authentication
│   │   └── get_users.php  # PHP API endpoint
│   ├── assets/            # Static assets (images, fonts, icons)
│   ├── hooks/             # Custom hooks (for future React migration)
│   └── context/           # State management (for future React migration)
├── public/                # Static files served directly
│   ├── _redirects         # Netlify redirects
│   └── netlify.toml       # Netlify configuration
├── config/                # Configuration files (empty - moved to root)
├── tests/                 # Test files
├── database/              # Database schemas and migrations
├── docs/                  # Project documentation
│   ├── README.md          # Main documentation
│   ├── TESTING_PLAN.md    # Testing documentation
│   ├── FIXES_SUMMARY.md   # Summary of fixes
│   └── website.md         # Website documentation
├── node_modules/          # Dependencies
├── .taskmaster/           # Task management files
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── storage.rules          # Firebase Storage rules
├── package.json           # Project dependencies and scripts
├── .gitignore            # Git ignore rules
└── index.html            # Root entry point
```

## Features

- **User Authentication**: Firebase Authentication with email/password
- **Attendance Tracking**: Real-time attendance monitoring with per-subject breakdown
- **Admin Panel**: Comprehensive administrative interface with user management
- **Dark/Light Theme**: User preference-based theming
- **Notifications System**: Real-time notifications with unread indicators and admin authoring
- **Data Export**: PDF and Excel export capabilities for attendance reports
- **Error Management**: Unique error IDs with comprehensive logging
- **Activity Tracking**: Detailed user activity monitoring and analytics
- **Mobile Navigation**: Apple-style minimalist bottom navigation
- **Input Validation**: XSS protection and comprehensive form validation
- **Testing Suite**: Automated tests for system reliability
- **Responsive Design**: Mobile-first responsive design
- **Real-time Updates**: Firebase Firestore real-time synchronization
- **Notification System**: In-app notifications with admin authoring
- **Data Export**: PDF and spreadsheet export functionality
- **User Management**: Individual user profile views and management

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Firebase Setup**:
   - Configure your Firebase project
   - Update Firebase configuration in `src/api/auth.js`
   - Deploy Firestore rules: `firebase deploy --only firestore:rules`

3. **Development**:
   ```bash
   npm start
   # or
   firebase serve
   ```

4. **Deployment**:
   ```bash
   npm run deploy
   # or
   firebase deploy
   ```

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **Styling**: CSS Custom Properties, Bootstrap 5
- **Icons**: Font Awesome
- **Charts**: Chart.js
- **Build Tools**: Firebase CLI

## Development Guidelines

- All HTML pages are in `src/pages/`
- Reusable JavaScript components go in `src/components/`
- Utility functions go in `src/utils/`
- API and authentication logic goes in `src/api/`
- Styles are centralized in `src/styles/`
- Use relative paths for local resources
- Follow the established naming conventions

## Contributing

1. Follow the established project structure
2. Update import paths when moving files
3. Test all functionality after changes
4. Update documentation as needed

## License

MIT License - see LICENSE file for details
