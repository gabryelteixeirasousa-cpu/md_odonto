import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function getUserProfile(uid) {
  const reference = doc(db, "users", uid);
  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error("Perfil de utilizador não encontrado.");
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

export async function getPatients() {
  const reference = collection(db, "patients");
  const snapshot = await getDocs(query(reference, orderBy("name")));

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function createPatient(patientData) {
  const reference = collection(db, "patients");

  return addDoc(reference, {
    name: patientData.name,
    phone: patientData.phone,
    email: patientData.email || "",
    lastCleaningDate: patientData.lastCleaningDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updatePatient(patientId, patientData) {
  const reference = doc(db, "patients", patientId);

  return updateDoc(reference, {
    name: patientData.name,
    phone: patientData.phone,
    email: patientData.email || "",
    lastCleaningDate: patientData.lastCleaningDate || null,
    updatedAt: serverTimestamp()
  });
}

export async function deletePatient(patientId) {
  const reference = doc(db, "patients", patientId);
  return deleteDoc(reference);
}

export async function getAppointmentsForDate(date, role, uid) {
  const reference = collection(db, "appointments");

  let appointmentQuery;

  if (role === "dentista") {
    appointmentQuery = query(
      reference,
      where("dentistId", "==", uid),
      where("date", "==", date),
      orderBy("date")
    );
  } else {
    appointmentQuery = query(
      reference,
      where("date", "==", date),
      orderBy("date")
    );
  }

  const snapshot = await getDocs(appointmentQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function getAllAppointments(role, uid) {
  const reference = collection(db, "appointments");

  let appointmentQuery;

  if (role === "dentista") {
    appointmentQuery = query(
      reference,
      where("dentistId", "==", uid),
      orderBy("date")
    );
  } else {
    appointmentQuery = query(
      reference,
      orderBy("date")
    );
  }

  const snapshot = await getDocs(appointmentQuery);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}

export async function createAppointment(appointmentData) {
  const reference = collection(db, "appointments");

  return addDoc(reference, {
    patientId: appointmentData.patientId,
    dentistId: appointmentData.dentistId,
    date: appointmentData.date,
    time: appointmentData.time,
    status: appointmentData.status || "Agendado",
    notes: appointmentData.notes || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateAppointmentStatus(
  appointmentId,
  status
) {
  const reference = doc(db, "appointments", appointmentId);

  return updateDoc(reference, {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function updateAppointment(
  appointmentId,
  appointmentData
) {
  const reference = doc(db, "appointments", appointmentId);

  return updateDoc(reference, {
    patientId: appointmentData.patientId,
    dentistId: appointmentData.dentistId,
    date: appointmentData.date,
    time: appointmentData.time,
    status: appointmentData.status,
    notes: appointmentData.notes || "",
    updatedAt: serverTimestamp()
  });
}

export async function cancelAppointment(appointmentId) {
  return updateAppointmentStatus(
    appointmentId,
    "Cancelado"
  );
}

export async function createClinicalNote({
  patientId,
  dentistId,
  procedure,
  notes
}) {
  const reference = collection(
    db,
    "patients",
    patientId,
    "clinicalNotes"
  );

  return addDoc(reference, {
    dentistId,
    procedure,
    notes,
    createdAt: serverTimestamp()
  });
}

export async function getClinicalNotes(patientId) {
  const reference = collection(
    db,
    "patients",
    patientId,
    "clinicalNotes"
  );

  const snapshot = await getDocs(
    query(reference, orderBy("createdAt", "desc"))
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));
}
