import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
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

function translateError(error) {
  const code = error.code || "";

  const messages = {
    "auth/invalid-credential":
      "E-mail ou palavra-passe inválidos, ou o utilizador não existe neste projeto Firebase.",
    "auth/invalid-email":
      "O e-mail informado não é válido.",
    "auth/user-disabled":
      "Este utilizador foi desativado.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/operation-not-allowed":
      "O login por e-mail/senha não está ativado no Firebase (Authentication > Sign-in method).",
    "auth/network-request-failed":
      "Falha de rede. Verifique a sua ligação à internet.",
    "auth/invalid-api-key":
      "A apiKey no arquivo firebase-config.js não é válida.",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      "A apiKey no arquivo firebase-config.js não é válida.",
    "auth/unauthorized-domain":
      "Este domínio não está autorizado. Adicione-o em Authentication > Settings > Authorized domains.",
    "permission-denied":
      "O login funcionou, mas o Firestore bloqueou a leitura do perfil. Verifique se as regras foram publicadas e se o documento users/UID existe.",
    "unavailable":
      "O Firestore está indisponível ou não foi criado neste projeto."
  };

  if (messages[code]) {
    return `${messages[code]} (${code})`;
  }

  if (error.message) {
    return `${error.message}${code ? ` (${code})` : ""}`;
  }

  return "Não foi possível iniciar sessão.";
}

async function redirectByRole(user) {
  const userReference = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userReference);

  if (!userSnapshot.exists()) {
    await signOut(auth);
    throw new Error(
      `O login funcionou, mas não existe o documento users/${user.uid} no Firestore. Crie esse documento com o campo role.`
    );
  }

  const profile = userSnapshot.data();

  if (!["secretaria", "dentista"].includes(profile.role)) {
    await signOut(auth);
    throw new Error(
      `O campo role está com o valor "${profile.role}". Use exatamente secretaria ou dentista, em minúsculas e sem acento.`
    );
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
    console.error("Erro ao validar perfil:", error);
    showError(translateError(error));
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
    console.error("Erro de login:", error.code, error.message);
    showError(translateError(error));

    submitButton.disabled = false;
    submitButton.textContent = "Entrar";
  }
});
