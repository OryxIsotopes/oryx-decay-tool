
    import {initializeApp} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
    import {getAuth, signInAnonymously} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
    import {
        getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp,
        query, orderBy, limit, getDocs
    } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

    const firebaseConfig = {
        apiKey: "AIzaSyAUJ9xwa340hdxU_0x1lv_9kU8U1MpKwjA",
    authDomain: "oryxcustomeractivitytracker.firebaseapp.com",
    projectId: "oryxcustomeractivitytracker",
    storageBucket: "oryxcustomeractivitytracker.appspot.com",
    messagingSenderId: "50216766361",
    appId: "1:50216766361:web:f305502c52e0f76e4e6108"
        };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    await signInAnonymously(auth);

    window.OryxFS = {
        db,

        async ensureCustomer(customerName) {
                const ref = doc(db, "customers", customerName);
    const snap = await getDoc(ref);
    if (!snap.exists())
    await setDoc(ref, {name: customerName, created_at: new Date().toISOString() });
    return ref;
            },

    async ensureBatch(customerName, batchNo, meta = { }) {
                const ref = doc(db, "customers", customerName, "batches", batchNo);
    const snap = await getDoc(ref);
    if (!snap.exists())
    await setDoc(ref, {batch_no: batchNo, created_at: new Date().toISOString(), ...meta });
    return ref;
            },

    // ✅ ADD THIS FUNCTION
    async upsertBatchMeta(customerName, batchNo, meta) {
                const ref = doc(db, "customers", customerName, "batches", batchNo);
    await setDoc(ref, meta, {merge: true });
    console.log(`📦 Batch metadata updated for ${batchNo}`, meta);
            },

    async addLog(customerName, batchNo, data) {
                const logsPath = ["customers", customerName, "batches", batchNo, "log"];
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const logId = now.toISOString().replace(/[:.]/g, "-"); // Local-time ID
    const logDocRef = doc(db, ...logsPath, logId);

    await setDoc(logDocRef, {
        ...data,
        log_id: logId,
    timestamp: serverTimestamp(),
    saved_at: new Date().toISOString()
                });
    // Also update the batch "latest" summary
    const latestRef = doc(db, "customers", customerName, "batches", batchNo, "meta", "latest");
    await setDoc(latestRef, data, {merge: true });


    console.log(`🕒 Log saved with ID ${logId}`);
            },


    async readLatestLog(customerName, batchNo) {
                const logRef = collection(db, "customers", customerName, "batches", batchNo, "log");
    const q = query(logRef, orderBy("timestamp", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data();
            }
        };

    window.__fsReady = true;



