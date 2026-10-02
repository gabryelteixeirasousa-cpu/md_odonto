import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");

function showError(message) {
  loginError.textContent = message;
  loginError.style.display = "block";
}

function translateFirebaseError(errorCode) {
  const messages = {
    "auth/invalid-credential":
      "E-mail ou palavra-passe inválidos.",
    "auth/invalid-email":
      "O e-mail informado não é válido.",
    "auth/user-disabled":
      "Este utilizador foi desativado.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde alguns minutos e tente novamente."
  };

  return messages[errorCode] || "Não foi possível iniciar sessão.";
}

async function redirectByRole(user) {
  const userReference = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userReference);

  if (!userSnapshot.exists()) {
    await auth.signOut();
    throw new Error(
      "O utilizador autenticado não possui um perfil cadastrado."
    );
  }

  const profile = userSnapshot.data();

  if (!["secretaria", "dentista"].includes(profile.role)) {
    await auth.signOut();
    throw new Error("O perfil do utilizador não é válido.");
  }

  window.location.href = "dashboard.html";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    return;
  }

  try {
    await redirectByRole(user);
  } catch (error) {
    showError(error.message);
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.style.display = "none";

  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;

  if (!email || !password) {
    showError("Informe o e-mail e a palavra-passe.");
    return;
  }

  const submitButton = loginForm.querySelector("button");
  submitButton.disabled = true;
  submitButton.textContent = "A entrar...";

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    await redirectByRole(credential.user);
  } catch (error) {
    showError(
      error.message.startsWith("O perfil")
        ? error.message
        : translateFirebaseError(error.code)
    );

    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});
