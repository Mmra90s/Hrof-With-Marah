// ===== FIREBASE CONFIGURATION =====
// تم تحديث البيانات تلقائياً بناءً على ملف الـ JSON المرفق
// Data updated automatically based on the attached JSON file

const firebaseConfig = {
    // ملاحظة: ملف الـ JSON لا يحتوي على apiKey أو appId لأنها بيانات خاصة بالواجهة الأمامية (Web App)
    // سأضع الـ project_id والـ databaseURL وسأترك الـ apiKey كقالب ليقوم المستخدم بوضعه إذا لزم الأمر
    // ولكن غالباً الـ Realtime Database ستعمل بالـ databaseURL والـ project_id في حال كانت القواعد مفتوحة
    
    apiKey: "AIzaSy" + "PLEASE_GET_API_KEY_FROM_FIREBASE_CONSOLE", // يجب الحصول عليه من إعدادات المشروع في Firebase
    authDomain: "hrof-with-marah.firebaseapp.com",
    projectId: "hrof-with-marah",
    storageBucket: "hrof-with-marah.appspot.com",
    messagingSenderId: "114203081433", // مستخرج من الجزء الأول من client_id
    appId: "PLEASE_GET_APP_ID_FROM_FIREBASE_CONSOLE", // يجب الحصول عليه من إعدادات المشروع في Firebase
    databaseURL: "https://hrof-with-marah-default-rtdb.firebaseio.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ===== FIREBASE HELPER FUNCTIONS =====

// Save data to Firebase
function firebaseSave(path, data) {
    return database.ref(path).set(data);
}

// Read data from Firebase
function firebaseRead(path, callback) {
    database.ref(path).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

// Update data in Firebase
function firebaseUpdate(path, data) {
    return database.ref(path).update(data);
}

// Remove data from Firebase
function firebaseRemove(path) {
    return database.ref(path).remove();
}

// Listen for real-time changes
function firebaseListener(path, callback) {
    database.ref(path).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

// Remove listener
function firebaseRemoveListener(path) {
    database.ref(path).off();
}
