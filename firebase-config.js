// =========================================================
// FIREBASE CONFIGURATION
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyDbm7NsDyud7SRwQjpHKxOYS0h05mC4_4U",
    authDomain: "stex-editor.firebaseapp.com",
    projectId: "stex-editor",
    storageBucket: "stex-editor.firebasestorage.app",
    messagingSenderId: "893095912638",
    appId: "1:893095912638:web:aab80d4bea85e2c0552aef",
    measurementId: "G-N8BQRX8Y81"
};

// Initialize Firebase (Compat API)
if (typeof firebase === 'undefined') {
    console.error("Firebase SDK not loaded. Check index.html");
} else {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    // Make these global so app_11.js can use them
    window.auth = firebase.auth();
    window.db = firebase.firestore();
    window.storage = firebase.storage();

    console.log("Firebase initialized and globals set (window.db, window.auth)");
}
