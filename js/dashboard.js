import { auth } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getUserProfile,
  getPatients,
  createPatient,
  updatePatient,
  getAppointmentsForDate,
  getAllAppointments,
  updateAppointmentStatus,
  createClinicalNote
} from "./data.js";

const state = {
  user: null,
  profile: null,
  patients: [],
  appointments: [],
  selectedDate: getToday()
};

const elements = {
  currentUserName: document.querySelector("#currentUserName"),
  currentUserRole: document.querySelector("#currentUserRole"),
  welcomeTitle: document.querySelector("#welcomeTitle"),
  logoutButton: document.querySelector("#logoutButton"),
  appointmentDate: document.querySelector("#appointmentDate"),
  appointmentsList: document.querySelector("#appointmentsList"),
  overviewAppointments: document.querySelector("#overviewAppointments"),
  patientsList: document.querySelector("#patientsList"),
  patientSearch: document.querySelector("#patientSearch"),
  maintenanceList: document.querySelector("#maintenanceList"),
  todayAppointmentsCount: document.querySelector("#todayAppointmentsCount"),
  patientsCount: document.querySelector("#patientsCount"),
  maintenanceCount: document.querySelector("#maintenanceCount"),
  personalAppointmentsCount: document.querySelector(
    "#personalAppointmentsCount"
  ),
  newPatientButton: document.querySelector("#newPatientButton"),
  newAppointmentButton: document.querySelector(
    "#newAppointmentButton"
  ),
  modalContainer: document.querySelector("#modalContainer"),
  clinicalPatientId: document.querySelector("#clinicalPatientId"),
  clinicalNoteForm: document.querySelector("#clinicalNoteForm"),
  clinicalMessage: document.querySelector("#clinicalMessage")
};

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "Sem data";
  }

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function roleLabel(role) {
  return role === "dentista"
    ? "Dentista"
    : "Secretária";
}

function isDentist() {
  return state.profile?.role === "dentista";
}

function patientById(patientId) {
  return state.patients.find(
    (patient) => patient.id === patientId
  );
}

function applyRoleVisibility() {
  document.querySelectorAll(".dentist-only").forEach((element) => {
    element.style.display = isDentist() ? "" : "none";
  });
}

function showSection(sectionName) {
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".sidebar-button").forEach((button) => {
    button.classList.remove("active");
  });

  const section = document.querySelector(
    `#${sectionName}Section`
  );

  const button = document.querySelector(
    `[data-section="${sectionName}"]`
  );

  if (section) {
    section.classList.add("active");
  }

  if (button) {
    button.classList.add("active");
  }
}

function setupNavigation() {
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const sectionName = button.dataset.section;

      if (
        sectionName === "clinical" &&
        !isDentist()
      ) {
        return;
      }

      showSection(sectionName);
    });
  });

  document.querySelectorAll("[data-section-link]").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.sectionLink);
    });
  });
}

async function loadPatients() {
  state.patients = await getPatients();

  elements.patientsCount.textContent = state.patients.length;

  renderPatients();
  renderMaintenanceAlerts();
  populateClinicalPatients();
}

async function loadAppointments() {
  state.appointments = await getAllAppointments(
    state.profile.role,
    state.user.uid
  );

  const todayAppointments = state.appointments.filter(
    (appointment) => appointment.date === state.selectedDate
  );

  elements.todayAppointmentsCount.textContent =
    todayAppointments.length;

  if (isDentist()) {
    elements.personalAppointmentsCount.textContent =
      state.appointments.length;
  }

  renderAppointments();
  renderOverviewAppointments();
}

async function loadSelectedDateAppointments() {
  state.selectedDate = elements.appointmentDate.value;

  const appointments = await getAppointmentsForDate(
    state.selectedDate,
    state.profile.role,
    state.user.uid
  );

  renderAppointments(appointments);
}

function renderPatients() {
  const searchTerm = elements.patientSearch.value
    .trim()
    .toLowerCase();

  const filteredPatients = state.patients.filter((patient) => {
    const name = patient.name?.toLowerCase() || "";
    const phone = patient.phone?.toLowerCase() || "";

    return (
      name.includes(searchTerm) ||
      phone.includes(searchTerm)
    );
  });

  if (!filteredPatients.length) {
    elements.patientsList.innerHTML = `
      <div class="empty-state">
        Nenhum paciente encontrado.
      </div>
    `;

    return;
  }

  elements.patientsList.innerHTML = filteredPatients
    .map((patient) => {
      return `
        <article class="patient-row">
          <div>
            <strong>${escapeHtml(patient.name)}</strong>
            <span>${escapeHtml(patient.phone || "Sem telefone")}</span>
            <small>${escapeHtml(patient.email || "Sem e-mail")}</small>
          </div>

          <div class="patient-actions">
            <button
              class="small-button edit-patient"
              data-id="${patient.id}"
            >
              Editar
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".edit-patient").forEach((button) => {
    button.addEventListener("click", () => {
      const patient = patientById(button.dataset.id);
      openPatientModal(patient);
    });
  });
}

function getCleaningDeadline(patient) {
  if (!patient.lastCleaningDate) {
    return true;
  }

  const lastCleaning = new Date(
    `${patient.lastCleaningDate}T00:00:00`
  );

  const deadline = new Date(lastCleaning);
  deadline.setMonth(deadline.getMonth() + 6);

  return deadline <= new Date();
}

function renderMaintenanceAlerts() {
  const alerts = state.patients.filter(getCleaningDeadline);

  elements.maintenanceCount.textContent = alerts.length;

  if (!alerts.length) {
    elements.maintenanceList.innerHTML = `
      <div class="empty-state">
        Não existem alertas de prevenção neste momento.
      </div>
    `;

    return;
  }

  elements.maintenanceList.innerHTML = alerts
    .map((patient) => {
      return `
        <article class="patient-row alert-row">
          <div>
            <strong>${escapeHtml(patient.name)}</strong>
            <span>${escapeHtml(patient.phone || "Sem telefone")}</span>
            <small>
              Última limpeza:
              ${formatDate(patient.lastCleaningDate)}
            </small>
          </div>

          <button
            class="small-button edit-patient"
            data-id="${patient.id}"
          >
            Atualizar
          </button>
        </article>
      `;
    })
    .join("");

  elements.maintenanceList
    .querySelectorAll(".edit-patient")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const patient = patientById(button.dataset.id);
        openPatientModal(patient);
      });
    });
}

function renderAppointments(appointments = state.appointments) {
  const filtered = appointments
    .filter((appointment) => {
      return appointment.date === state.selectedDate;
    })
    .sort((a, b) => {
      return (a.time || "").localeCompare(b.time || "");
    });

  if (!filtered.length) {
    elements.appointmentsList.innerHTML = `
      <div class="empty-state">
        Não existem consultas para ${formatDate(state.selectedDate)}.
      </div>
    `;

    return;
  }

  elements.appointmentsList.innerHTML = filtered
    .map((appointment) => {
      const patient = patientById(appointment.patientId);
      const patientName = patient?.name || "Paciente não encontrado";

      return `
        <article class="appointment-row">
          <div class="appointment-time">
            ${escapeHtml(appointment.time || "--:--")}
          </div>

          <div class="appointment-main">
            <strong>${escapeHtml(patientName)}</strong>
            <span>${escapeHtml(appointment.status || "Agendado")}</span>
            <small>
              Dentista: ${escapeHtml(appointment.dentistId || "Não informado")}
            </small>
          </div>

          <div class="appointment-actions">
            ${
              isDentist()
                ? `
                  <select
                    class="status-select"
                    data-id="${appointment.id}"
                  >
                    ${renderStatusOptions(appointment.status)}
                  </select>
                `
                : ""
            }

            ${
              state.profile.role === "secretaria"
                ? `
                  <button
                    class="small-button cancel-appointment"
                    data-id="${appointment.id}"
                  >
                    Cancelar
                  </button>
                `
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");

  document
    .querySelectorAll(".status-select")
    .forEach((select) => {
      select.addEventListener("change", async () => {
        await updateAppointmentStatus(
          select.dataset.id,
          select.value
        );

        await loadAppointments();
        await loadSelectedDateAppointments();
      });
    });

  document
    .querySelectorAll(".cancel-appointment")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = window.confirm(
          "Deseja cancelar esta consulta?"
        );

        if (!confirmed) {
          return;
        }

        await updateAppointmentStatus(
          button.dataset.id,
          "Cancelado"
        );

        await loadAppointments();
        await loadSelectedDateAppointments();
      });
    });
}

function renderStatusOptions(currentStatus) {
  const statuses = [
    "Agendado",
    "Em atendimento",
    "Concluído",
    "Faltou",
    "Cancelado"
  ];

  return statuses
    .map((status) => {
      const selected =
        status === currentStatus ? "selected" : "";

      return `
        <option value="${status}" ${selected}>
          ${status}
        </option>
      `;
    })
    .join("");
}

function renderOverviewAppointments() {
  const nextAppointments = state.appointments
    .filter((appointment) => appointment.date >= state.selectedDate)
    .sort((a, b) => {
      const first = `${a.date} ${a.time || ""}`;
      const second = `${b.date} ${b.time || ""}`;

      return first.localeCompare(second);
    })
    .slice(0, 5);

  if (!nextAppointments.length) {
    elements.overviewAppointments.innerHTML = `
      <div class="empty-state">
        Não existem próximos atendimentos.
      </div>
    `;

    return;
  }

  elements.overviewAppointments.innerHTML = nextAppointments
    .map((appointment) => {
      const patient = patientById(appointment.patientId);

      return `
        <article class="overview-row">
          <span class="overview-date">
            ${formatDate(appointment.date)}
          </span>

          <strong>${escapeHtml(patient?.name || "Paciente")}</strong>

          <span>${escapeHtml(appointment.time || "--:--")}</span>

          <span class="status-pill">
            ${escapeHtml(appointment.status || "Agendado")}
          </span>
        </article>
      `;
    })
    .join("");
}

function populateClinicalPatients() {
  if (!elements.clinicalPatientId) {
    return;
  }

  elements.clinicalPatientId.innerHTML = `
    <option value="">Selecione um paciente</option>
    ${state.patients
      .map((patient) => {
        return `
          <option value="${patient.id}">
            ${escapeHtml(patient.name)}
          </option>
        `;
      })
      .join("")}
  `;
}

function openPatientModal(patient = null) {
  const isEditing = Boolean(patient);

  elements.modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <button class="modal-close" id="closeModal">×</button>

        <h2>
          ${isEditing ? "Editar paciente" : "Novo paciente"}
        </h2>

        <form id="patientForm" class="internal-form">
          <div class="form-group">
            <label for="patientName">Nome completo *</label>
            <input
              id="patientName"
              type="text"
              value="${escapeHtml(patient?.name || "")}"
              required
            >
          </div>

          <div class="form-group">
            <label for="patientPhone">Telefone *</label>
            <input
              id="patientPhone"
              type="tel"
              value="${escapeHtml(patient?.phone || "")}"
              required
            >
          </div>

          <div class="form-group">
            <label for="patientEmail">E-mail</label>
            <input
              id="patientEmail"
              type="email"
              value="${escapeHtml(patient?.email || "")}"
            >
          </div>

          <div class="form-group">
            <label for="lastCleaningDate">
              Data da última limpeza
            </label>
            <input
              id="lastCleaningDate"
              type="date"
              value="${escapeHtml(patient?.lastCleaningDate || "")}"
            >
          </div>

          <button type="submit" class="primary-button">
            Guardar paciente
          </button>

          <p id="patientFormMessage" class="form-message"></p>
        </form>
      </div>
    </div>
  `;

  document
    .querySelector("#closeModal")
    .addEventListener("click", closeModal);

  document
    .querySelector("#patientForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const data = {
        name: document.querySelector("#patientName").value.trim(),
        phone: document.querySelector("#patientPhone").value.trim(),
        email: document.querySelector("#patientEmail").value.trim(),
        lastCleaningDate: document.querySelector(
          "#lastCleaningDate"
        ).value || null
      };

      const message = document.querySelector(
        "#patientFormMessage"
      );

      try {
        if (isEditing) {
          await updatePatient(patient.id, data);
        } else {
          await createPatient(data);
        }

        closeModal();
        await loadPatients();
      } catch (error) {
        message.textContent =
          "Não foi possível guardar o paciente.";
        message.classList.add("error-message");
      }
    });
}

function closeModal() {
  elements.modalContainer.innerHTML = "";
}

function openAppointmentModal() {
  elements.modalContainer.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-card">
        <button class="modal-close" id="closeModal">×</button>

        <h2>Novo agendamento</h2>

        <form id="appointmentForm" class="internal-form">
          <div class="form-group">
            <label for="appointmentPatient">Paciente</label>
            <select id="appointmentPatient" required>
              <option value="">Selecione um paciente</option>
              ${state.patients
                .map((patient) => {
                  return `
                    <option value="${patient.id}">
                      ${escapeHtml(patient.name)}
                    </option>
                  `;
                })
                .join("")}
            </select>
          </div>

          <div class="form-group">
            <label for="appointmentDentist">ID do dentista</label>
            <input
              id="appointmentDentist"
              type="text"
              placeholder="UID do dentista"
              required
            >
          </div>

          <div class="form-group">
            <label for="appointmentDateModal">Data</label>
            <input
              id="appointmentDateModal"
              type="date"
              value="${state.selectedDate}"
              required
            >
          </div>

          <div class="form-group">
            <label for="appointmentTime">Horário</label>
            <input
              id="appointmentTime"
              type="time"
              required
            >
          </div>

          <button type="submit" class="primary-button">
            Guardar agendamento
          </button>

          <p id="appointmentMessage" class="form-message"></p>
        </form>
      </div>
    </div>
  `;

  document
    .querySelector("#closeModal")
    .addEventListener("click", closeModal);

  document
    .querySelector("#appointmentForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();

      const message = document.querySelector(
        "#appointmentMessage"
      );

      try {
        const { createAppointment } = await import("./data.js");

        await createAppointment({
          patientId: document.querySelector(
            "#appointmentPatient"
          ).value,

          dentistId: document.querySelector(
            "#appointmentDentist"
          ).value.trim(),

          date: document.querySelector(
            "#appointmentDateModal"
          ).value,

          time: document.querySelector(
            "#appointmentTime"
          ).value,

          status: "Agendado"
        });

        closeModal();
        await loadAppointments();
        await loadSelectedDateAppointments();
      } catch (error) {
        message.textContent =
          "Não foi possível criar o agendamento.";
        message.classList.add("error-message");
      }
    });
}

async function handleClinicalNote(event) {
  event.preventDefault();

  const patientId = elements.clinicalPatientId.value;
  const procedure = document.querySelector(
    "#clinicalProcedure"
  ).value.trim();
  const notes = document.querySelector(
    "#clinicalNotes"
  ).value.trim();

  if (!patientId || !procedure || !notes) {
    elements.clinicalMessage.textContent =
      "Preencha todos os campos clínicos.";
    return;
  }

  try {
    await createClinicalNote({
      patientId,
      dentistId: state.user.uid,
      procedure,
      notes
    });

    elements.clinicalNoteForm.reset();

    elements.clinicalMessage.textContent =
      "Registo clínico guardado com sucesso.";
  } catch (error) {
    elements.clinicalMessage.textContent =
      "Não foi possível guardar o registo clínico.";
    elements.clinicalMessage.classList.add("error-message");
  }
}

async function initializeDashboard(user) {
  state.user = user;
  state.profile = await getUserProfile(user.uid);

  elements.currentUserName.textContent =
    state.profile.name || user.email;

  elements.currentUserRole.textContent =
    roleLabel(state.profile.role);

  elements.welcomeTitle.textContent =
    `Bem-vindo(a), ${state.profile.name || ""}`;

  elements.appointmentDate.value = state.selectedDate;

  applyRoleVisibility();
  setupNavigation();

  await loadPatients();
  await loadAppointments();
  await loadSelectedDateAppointments();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    await initializeDashboard(user);
  } catch (error) {
    console.error(error);
    await signOut(auth);
    window.location.href = "login.html";
  }
});

elements.logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

elements.appointmentDate.addEventListener(
  "change",
  loadSelectedDateAppointments
);

elements.patientSearch.addEventListener(
  "input",
  renderPatients
);

elements.newPatientButton.addEventListener(
  "click",
  () => openPatientModal()
);

elements.newAppointmentButton.addEventListener(
  "click",
  openAppointmentModal
);

if (elements.clinicalNoteForm) {
  elements.clinicalNoteForm.addEventListener(
    "submit",
    handleClinicalNote
  );
}
