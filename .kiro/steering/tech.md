# Technology Stack & Build System

## Core Technologies

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication, Hosting, Storage)
- **Styling**: CSS Custom Properties with theme variables, Bootstrap 5
- **Icons**: Font Awesome
- **Charts**: Chart.js for analytics
- **PDF Generation**: jsPDF with jsPDF-autotable
- **Email**: Nodemailer with Express server
- **Build Tools**: Firebase CLI, npm scripts

## Key Dependencies

```json
{
  "firebase": "^9.23.0",
  "jspdf": "^3.0.1", 
  "jspdf-autotable": "^5.0.2",
  "nodemailer": "^6.9.7",
  "express": "^4.18.2",
  "winston": "^3.17.0"
}
```

## Common Commands

### Development
```bash
npm start              # Start Firebase local server (port 5000)
npm run dev           # Start with host binding for network access
firebase serve        # Alternative Firebase serve command
```

### Testing
```bash
npm test              # Run automated tests
npm run test:browser  # Open browser-based system tests
npm run lint          # Lint JavaScript files
```

### Build & Deploy
```bash
npm run build         # Build and test
npm run deploy        # Full deployment (build + deploy)
npm run deploy:hosting # Deploy hosting only
npm run deploy:functions # Deploy functions only
```

### Email System
```bash
npm run email-server  # Start email server
npm run start-email   # Alternative email server start
```

### Setup
```bash
npm run setup         # Install deps + Firebase login + project setup
```

## Firebase Configuration

- **Emulators**: Auth (9099), Firestore (8080), Hosting (5000), Storage (9199)
- **Security Rules**: Firestore rules with admin email validation
- **Offline Support**: Firestore persistence enabled with tab synchronization
- **Real-time Database**: Used for presence/online status tracking

## Code Style Conventions

- Use ES6+ features (async/await, arrow functions, destructuring)
- Prefer `const` over `let`, avoid `var`
- Use template literals for string interpolation
- Implement comprehensive error handling with try/catch
- Use Firebase SDK v9+ modular approach
- Follow consistent naming: camelCase for variables/functions, PascalCase for classes