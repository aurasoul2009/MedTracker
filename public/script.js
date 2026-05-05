const MEDICINE_API = "/api/medicines";
const HISTORY_API = "/api/history";

const medicineForm = document.getElementById("medicineForm");
const medicineList = document.getElementById("medicineList");
const historyList = document.getElementById("historyList");
const saveButton = document.getElementById("saveButton");
const refreshButton = document.getElementById("refreshButton");
const themeToggle = document.getElementById("themeToggle");
const themeToggleIcon = document.getElementById("themeToggleIcon");
const toastContainer = document.getElementById("toastContainer");
const currentDate = document.getElementById("currentDate");
const medicineCount = document.getElementById("medicineCount");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileSidebar = document.getElementById("mobileSidebar");
const mobileOverlay = document.getElementById("mobileOverlay");
const closeMobileMenu = document.getElementById("closeMobileMenu");
const mobileLinks = document.querySelectorAll(".mobile-link");
const desktopNavLinks = document.querySelectorAll(".nav-link");
const hourSelect = document.getElementById("hour");
const minuteSelect = document.getElementById("minute");
const periodSelect = document.getElementById("period");

let medicinesCache = [];

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-semibold">${type === "error" ? "Action failed" : "Updated"}</p>
        <p class="mt-1 text-sm text-white/90">${message}</p>
      </div>
      <button type="button" class="mt-0.5 text-white/70 transition hover:text-white" aria-label="Dismiss toast">&times;</button>
    </div>
  `;

  toast.querySelector("button")?.addEventListener("click", () => toast.remove());
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  button.disabled = isLoading;
  button.classList.toggle("loading", isLoading);
  button.textContent = isLoading ? loadingText : defaultText;
}

function getTheme() {
  return localStorage.getItem("medtrack-theme") || "dark";
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  themeToggleIcon.textContent = theme === "dark" ? "\u2600" : "\u263E";
}

function createStatusBadge(status) {
  const statusClass =
    status === "taken"
      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
      : status === "missed"
      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300";

  const label =
    status === "taken" ? "Taken" : status === "missed" ? "Missed" : "Pending";

  return `<span class="status-badge ${statusClass}">${label}</span>`;
}

function formatTime(time24) {
  if (!time24 || !time24.includes(":")) {
    return time24 || "--";
  }

  const [hoursString, minutes] = time24.split(":");
  let hours = Number(hoursString);
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

function formatDateLabel(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function updateTopBarMeta() {
  currentDate.textContent = formatDateLabel(new Date());
}

function populateTimeSelectors() {
  hourSelect.innerHTML = Array.from({ length: 12 }, (_, index) => {
    const hour = String(index + 1);
    return `<option value="${hour}">${hour}</option>`;
  }).join("");

  minuteSelect.innerHTML = Array.from({ length: 60 }, (_, index) => {
    const minute = String(index).padStart(2, "0");
    return `<option value="${minute}">${minute}</option>`;
  }).join("");
}

function convertTo24Hour(hour12, minute, period) {
  let hour = Number(hour12);

  if (period === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function renderMedicines(medicines) {
  if (!Array.isArray(medicines) || medicines.length === 0) {
    medicineList.innerHTML =
      '<div class="col-span-full rounded-[2rem] border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">No medicines scheduled yet. Add your first medicine to start tracking.</div>';
    return;
  }

  medicineList.innerHTML = medicines
    .map((medicine) => {
      const status = medicine.status;
      const isTaken = status === "taken";

      return `
        <article class="medicine-card ${isTaken ? "taken" : ""}" id="${medicine._id}">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-semibold text-slate-950 dark:text-white">${medicine.name}</h3>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">${medicine.dosage}</p>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3">
            <span class="min-w-0 text-sm font-medium text-slate-700 dark:text-slate-200">${formatTime(
              medicine.time
            )}</span>
            ${createStatusBadge(status)}
          </div>
          <div class="mt-5">
            <button
              class="confirm-btn action-button w-full ${isTaken ? "is-complete" : ""}"
              id="btn-${medicine._id}"
              data-id="${medicine._id}"
              ${isTaken ? "disabled" : ""}
            >
              ${isTaken ? "Taken" : "Mark as taken"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderHistory(historyRows) {
  if (!Array.isArray(historyRows) || historyRows.length === 0) {
    historyList.innerHTML =
      '<tr><td colspan="4" class="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No history records yet.</td></tr>';
    return;
  }

  historyList.innerHTML = historyRows
    .slice(0, 20)
    .map((row) => {
      const medicineName = row.medicineId?.name || "Unknown";
      const scheduledTime =
        row.medicineId?.time || new Date(row.timestamp).toTimeString().slice(0, 5);

      return `
        <tr class="bg-white/60 transition-colors hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/[0.03]">
          <td class="px-4 py-4 font-semibold text-slate-900 dark:text-white">${medicineName}</td>
          <td class="px-4 py-4">${createStatusBadge(row.status)}</td>
          <td class="px-4 py-4 text-slate-600 dark:text-slate-300">${formatTime(scheduledTime)}</td>
          <td class="px-4 py-4 text-slate-500 dark:text-slate-400">${formatDateLabel(new Date(row.timestamp))}</td>
        </tr>
      `;
    })
    .join("");
}

function updateMedicineCount() {
  medicineCount.textContent = Array.isArray(medicinesCache) ? medicinesCache.length : 0;
}

async function fetchHistory() {
  const response = await fetch(HISTORY_API);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch history.");
  }

  renderHistory(Array.isArray(data) ? data : []);
}

async function fetchMedicines() {
  const response = await fetch(MEDICINE_API);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch medicines.");
  }

  medicinesCache = Array.isArray(data) ? data : [];
  renderMedicines(medicinesCache);
  updateMedicineCount();
}

async function loadMedicines() {
  await fetchMedicines();
}

async function refreshDashboard() {
  setButtonLoading(refreshButton, true, "Refreshing...", "Refresh");

  try {
    await fetchHistory();
    await fetchMedicines();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setButtonLoading(refreshButton, false, "Refreshing...", "Refresh");
  }
}

async function confirmDose(medicineId) {
  const button = document.getElementById(`btn-${medicineId}`);

  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch(`${MEDICINE_API}/confirm-dose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicineId }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to confirm dose.");
    }

    showToast(data.message || "Marked as taken");
    await loadMedicines();
    await fetchHistory();
  } catch (error) {
    if (button) {
      button.disabled = false;
    }

    showToast(error.message, "error");
  }
}

function scrollToSection(id) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function handleNavClick(id) {
  scrollToSection(id);
  closeMobileNav();
}

function openMobileMenu() {
  mobileSidebar.classList.remove("translate-x-full");
  mobileOverlay.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeMobileNav() {
  mobileSidebar.classList.add("translate-x-full");
  mobileOverlay.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

medicineForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: document.getElementById("name").value.trim(),
    dosage: document.getElementById("dosage").value.trim(),
    time: convertTo24Hour(hourSelect.value, minuteSelect.value, periodSelect.value),
    userPhone: document.getElementById("userPhone").value.trim(),
    caretakerPhone: document.getElementById("caretakerPhone").value.trim(),
  };

  setButtonLoading(saveButton, true, "Saving...", "Add medicine");

  try {
    const response = await fetch(MEDICINE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to save medicine.");
    }

    medicineForm.reset();
    hourSelect.value = "8";
    minuteSelect.value = "00";
    periodSelect.value = "AM";
    showToast("Medicine schedule saved");
    await refreshDashboard();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setButtonLoading(saveButton, false, "Saving...", "Add medicine");
  }
});

medicineList.addEventListener("click", async (event) => {
  const button = event.target.closest(".confirm-btn");
  if (!button) {
    return;
  }

  await confirmDose(button.dataset.id);
});

refreshButton.addEventListener("click", refreshDashboard);

themeToggle?.addEventListener("click", () => {
  const nextTheme = getTheme() === "dark" ? "light" : "dark";
  localStorage.setItem("medtrack-theme", nextTheme);
  applyTheme(nextTheme);
});

mobileMenuButton?.addEventListener("click", openMobileMenu);
closeMobileMenu?.addEventListener("click", closeMobileNav);
mobileOverlay?.addEventListener("click", closeMobileNav);
mobileLinks.forEach((link) =>
  link.addEventListener("click", (event) => {
    event.preventDefault();
    handleNavClick(link.dataset.section);
  })
);
desktopNavLinks.forEach((link) =>
  link.addEventListener("click", (event) => {
    event.preventDefault();
    scrollToSection(link.dataset.section);
  })
);

populateTimeSelectors();
hourSelect.value = "8";
minuteSelect.value = "00";
periodSelect.value = "AM";
applyTheme(getTheme());
updateTopBarMeta();
refreshDashboard();
