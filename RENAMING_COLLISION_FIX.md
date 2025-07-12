# Admin Panel Initialization Naming Collision Fix

## Issue
`admin.js` originally imported `initializeApp` from the Firebase SDK **and** declared a local function named `initializeApp()`.  In ES-modules this causes a *duplicate binding* error:

```
Uncaught SyntaxError: Identifier 'initializeApp' has already been declared
```

Because the import is treated as a constant binding it cannot be re-declared.  Browsers will refuse to parse the script, preventing the admin panel from loading.

## Resolution
1.  The Firebase import has been **aliased** so that its binding no longer clashes with the local helper function:

```javascript
// Before
import { initializeApp } from "firebase-app.js";

// After
import { initializeApp as initFirebaseApp } from "firebase-app.js";
```

2.  The Firebase project is now initialised with `initFirebaseApp`:

```javascript
const app = initFirebaseApp(firebaseConfig);
```

No other code changes were required, because all subsequent calls referenced the `app` instance, not the original initializer.

## Testing
- Loaded `admin.html` in Chrome/Firefox – the console no longer shows a syntax error and the panel initialises correctly.
- Performed smoke-tests: authentication check, dashboard cards, and subject management all work as expected.

## Take-away
When working with ES-modules, make sure imported names never collide with locally declared variables or functions.  Use aliases (`as`) or rename your own functions to keep each binding unique.