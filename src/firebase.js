import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  runTransaction, 
  onValue 
} from 'firebase/database';

// READ FIREBASE CONFIG FROM VITE ENVIRONMENT VARIABLES
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Helper to check if Firebase is configured with actual credentials
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.databaseURL && 
    !firebaseConfig.databaseURL.includes("YOUR_") &&
    firebaseConfig.databaseURL.trim() !== "" &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_") &&
    firebaseConfig.apiKey.trim() !== ""
  );
};

let dbInstance = null;

if (isFirebaseConfigured()) {
  try {
    const app = initializeApp(firebaseConfig);
    dbInstance = getDatabase(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  console.log("Firebase is running in local-only demo mode. Update src/firebase.js with real keys to sync with the cloud.");
}

export const db = dbInstance;

// ----------------------------------------------------
// LOCAL STORAGE MOCK DATABASE (DEMO FALLBACK)
// ----------------------------------------------------
const getMockData = () => {
  const data = localStorage.getItem('qc_queue_token_system');
  if (!data) {
    const defaultData = {
      currentToken: 0,
      avgConsultationTime: 10,
      lastTokenIssued: 0,
      patients: {}
    };
    localStorage.setItem('qc_queue_token_system', JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(data);
};

const saveMockData = (data) => {
  localStorage.setItem('qc_queue_token_system', JSON.stringify(data));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('mock-db-token-update', { detail: data }));
};

// ----------------------------------------------------
// EXPORTED FIREBASE DATABASE HELPER FUNCTIONS
// ----------------------------------------------------

/**
 * 1. initializeQueue()
 * Sets up default values if queue doesn't exist.
 */
export const initializeQueue = async () => {
  if (isFirebaseConfigured() && db) {
    const queueRef = ref(db, 'queue');
    const snapshot = await get(queueRef);
    if (!snapshot.exists()) {
      await set(queueRef, {
        currentToken: 0,
        avgConsultationTime: 10,
        lastTokenIssued: 0,
        patients: {}
      });
    }
  } else {
    // Local mock initialization
    getMockData();
  }
};

/**
 * 2. addPatient(name)
 * Generates next token (T001, T002...), adds to patients, increments lastTokenIssued.
 * Returns the generated token key (e.g. "T001").
 */
export const addPatient = async (name, label = 'Walk-in') => {
  if (isFirebaseConfigured() && db) {
    const queueRef = ref(db, 'queue');
    let generatedToken = '';
    
    await runTransaction(queueRef, (currentData) => {
      // Handle empty node
      if (currentData === null) {
        currentData = {
          currentToken: 0,
          avgConsultationTime: 10,
          lastTokenIssued: 0,
          patients: {}
        };
      }
      
      const nextTokenNum = (currentData.lastTokenIssued || 0) + 1;
      const tokenKey = 'T' + String(nextTokenNum).padStart(3, '0');
      generatedToken = tokenKey;
      
      currentData.lastTokenIssued = nextTokenNum;
      
      if (!currentData.patients) {
        currentData.patients = {};
      }
      
      currentData.patients[tokenKey] = {
        tokenNumber: nextTokenNum,
        name: name,
        addedAt: Date.now(),
        status: "waiting",
        label: label
      };
      
      return currentData;
    });
    
    return generatedToken;
  } else {
    // Local mock implementation
    const data = getMockData();
    const nextTokenNum = (data.lastTokenIssued || 0) + 1;
    const tokenKey = 'T' + String(nextTokenNum).padStart(3, '0');
    
    data.lastTokenIssued = nextTokenNum;
    if (!data.patients) {
      data.patients = {};
    }
    
    data.patients[tokenKey] = {
      tokenNumber: nextTokenNum,
      name: name,
      addedAt: Date.now(),
      status: "waiting",
      label: label
    };
    
    saveMockData(data);
    return tokenKey;
  }
};

/**
 * 3. callNextToken()
 * Finds the lowest waiting token, sets it as currentToken, marks it as "called".
 * Returns the patient object of the called patient (or null if none waiting).
 */
export const callNextToken = async () => {
  if (isFirebaseConfigured() && db) {
    const queueRef = ref(db, 'queue');
    let calledPatient = null;
    
    await runTransaction(queueRef, (currentData) => {
      if (!currentData) return currentData;
      if (!currentData.patients) return currentData;
      
      // Find all waiting patients
      const waitingList = Object.entries(currentData.patients)
        .filter(([_, p]) => p.status === 'waiting')
        .sort((a, b) => a[1].tokenNumber - b[1].tokenNumber);
        
      if (waitingList.length > 0) {
        const [tokenKey, patient] = waitingList[0];
        
        currentData.currentToken = patient.tokenNumber;
        currentData.patients[tokenKey].status = 'called';
        currentData.patients[tokenKey].calledAt = Date.now();
        
        calledPatient = { 
          id: tokenKey,
          ...currentData.patients[tokenKey]
        };
      }
      
      return currentData;
    });
    
    return calledPatient;
  } else {
    // Local mock implementation
    const data = getMockData();
    if (!data.patients) return null;
    
    const waitingList = Object.entries(data.patients)
      .filter(([_, p]) => p.status === 'waiting')
      .sort((a, b) => a[1].tokenNumber - b[1].tokenNumber);
      
    if (waitingList.length > 0) {
      const [tokenKey, patient] = waitingList[0];
      
      data.currentToken = patient.tokenNumber;
      data.patients[tokenKey].status = 'called';
      data.patients[tokenKey].calledAt = Date.now();
      
      const calledPatient = {
        id: tokenKey,
        ...data.patients[tokenKey]
      };
      
      saveMockData(data);
      return calledPatient;
    }
    
    return null;
  }
};

/**
 * 4. setAvgTime(minutes)
 * Updates avgConsultationTime.
 */
export const setAvgTime = async (minutes) => {
  const avgTimeNum = Number(minutes) || 10;
  if (isFirebaseConfigured() && db) {
    const timeRef = ref(db, 'queue/avgConsultationTime');
    await set(timeRef, avgTimeNum);
  } else {
    // Local mock implementation
    const data = getMockData();
    data.avgConsultationTime = avgTimeNum;
    saveMockData(data);
  }
};

/**
 * 5. subscribeToQueue(callback)
 * Real-time listener using onValue, returns unsubscribe function.
 */
export const subscribeToQueue = (callback) => {
  if (isFirebaseConfigured() && db) {
    const queueRef = ref(db, 'queue');
    return onValue(queueRef, (snapshot) => {
      const val = snapshot.val() || {
        currentToken: 0,
        avgConsultationTime: 10,
        lastTokenIssued: 0,
        patients: {}
      };
      callback(val);
    });
  } else {
    // Local mock listener
    const handleUpdate = () => {
      const val = getMockData();
      callback(val);
    };
    
    // Initial run
    handleUpdate();
    
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('mock-db-token-update', handleUpdate);
    
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('mock-db-token-update', handleUpdate);
    };
  }
};

/**
 * 6. getWaitingPatients()
 * Returns array of waiting patients sorted by token number.
 */
export const getWaitingPatients = async () => {
  if (isFirebaseConfigured() && db) {
    const patientsRef = ref(db, 'queue/patients');
    const snapshot = await get(patientsRef);
    const patients = snapshot.val() || {};
    
    return Object.entries(patients)
      .map(([key, val]) => ({ id: key, ...val }))
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  } else {
    // Local mock implementation
    const data = getMockData();
    const patients = data.patients || {};
    
    return Object.entries(patients)
      .map(([key, val]) => ({ id: key, ...val }))
      .filter(p => p.status === 'waiting')
      .sort((a, b) => a.tokenNumber - b.tokenNumber);
  }
};

// ----------------------------------------------------
// ADDITIONAL HELPERS FOR ENHANCED CONSOLE EXPERIENCE
// ----------------------------------------------------

/**
 * Complete a patient (marks status as 'completed')
 */
export const completePatient = async (tokenKey) => {
  if (isFirebaseConfigured() && db) {
    const statusRef = ref(db, `queue/patients/${tokenKey}/status`);
    await set(statusRef, 'completed');
  } else {
    const data = getMockData();
    if (data.patients && data.patients[tokenKey]) {
      data.patients[tokenKey].status = 'completed';
      saveMockData(data);
    }
  }
};

/**
 * Cancel/remove a patient (marks status as 'cancelled')
 */
export const cancelPatient = async (tokenKey) => {
  if (isFirebaseConfigured() && db) {
    const statusRef = ref(db, `queue/patients/${tokenKey}/status`);
    await set(statusRef, 'cancelled');
  } else {
    const data = getMockData();
    if (data.patients && data.patients[tokenKey]) {
      data.patients[tokenKey].status = 'cancelled';
      saveMockData(data);
    }
  }
};

/**
 * Reset Queue data (clears current, last token, and patient list)
 */
export const resetQueueData = async () => {
  if (isFirebaseConfigured() && db) {
    const queueRef = ref(db, 'queue');
    await set(queueRef, {
      currentToken: 0,
      avgConsultationTime: 10,
      lastTokenIssued: 0,
      patients: {}
    });
  } else {
    const defaultData = {
      currentToken: 0,
      avgConsultationTime: 10,
      lastTokenIssued: 0,
      patients: {}
    };
    saveMockData(defaultData);
  }
};

// ----------------------------------------------------
// CONNECTION STATUS MONITOR
// ----------------------------------------------------

/**
 * Monitor connection status using Firebase .info/connected
 * @param {function} callback - Receives connection boolean state (true = connected, false = disconnected)
 * @returns {function} - Unsubscribe function
 */
export const subscribeToConnectionStatus = (callback) => {
  if (isFirebaseConfigured() && db) {
    const connectedRef = ref(db, '.info/connected');
    return onValue(connectedRef, (snapshot) => {
      callback(snapshot.val() === true);
    });
  } else {
    // Local demo mode is always "connected"
    callback(true);
    return () => {};
  }
};

