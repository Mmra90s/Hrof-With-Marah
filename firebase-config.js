// ===== FIREBASE CONFIGURATION =====
// تم تحديث البيانات بناءً على مدخلاتك الأخيرة
// Data updated based on your last input

const firebaseConfig = {
    apiKey: "AIzaSyCJryCJ50khZKLczrs8pTHVBn7AYqWZt-o",
    authDomain: "hrof-with-marah.firebaseapp.com",
    databaseURL: "https://hrof-with-marah-default-rtdb.firebaseio.com",
    projectId: "hrof-with-marah",
    storageBucket: "hrof-with-marah.firebasestorage.app",
    messagingSenderId: "935326971899",
    appId: "1:935326971899:web:ea3a0e77e30a9c48923d5e",
    measurementId: "G-9WZ1GSGC79"
};

// Initialize Firebase (طريقة الربط المباشر للمتصفح)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ===== FIREBASE HELPER FUNCTIONS =====

// دالة حفظ البيانات
function firebaseSave(path, data) {
    return database.ref(path).set(data);
}

// دالة قراءة البيانات
function firebaseRead(path, callback) {
    database.ref(path).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

// دالة تحديث البيانات
function firebaseUpdate(path, data) {
    return database.ref(path).update(data);
}

// دالة حذف البيانات
function firebaseRemove(path) {
    return database.ref(path).remove();
}

// دالة الاستماع للتغييرات اللحظية
function firebaseListener(path, callback) {
    database.ref(path).on('value', (snapshot) => {
        callback(snapshot.val());
    });
}

// دالة إيقاف الاستماع
function firebaseRemoveListener(path) {
    database.ref(path).off();
}
