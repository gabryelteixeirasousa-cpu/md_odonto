import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBXKrsa85nXGgZtgmvV8-y7uOT32h_LvHY",
  authDomain: "clinica-md-odontologia.firebaseapp.com",
  projectId: "clinica-md-odontologia",
  storageBucket: "clinica-md-odontologia.firebasestorage.app",
  messagingSenderId: "517727630167",
  appId: "1:517727630167:web:76789059d8e7c86ca00412"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
