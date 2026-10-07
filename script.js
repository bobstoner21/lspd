const GH_USER = "bobstoner21";
const GH_REPO = "lspd";

let currentStatuses = { fto: false, supervisor: false, metro: false, swat: false };

// Загрузка статусов школ из status.json
async function loadSchoolStatuses() {
  try {
    const res = await fetch(`./status.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("status.json не найден");
    currentStatuses = await res.json();

    const schools = ["fto", "supervisor", "metro", "swat"];
    schools.forEach(school => {
      const isOpen = currentStatuses[school] === true;
      const statusEl = document.getElementById(`status-${school}`);
      const btnEl = document.getElementById(`btn-${school}`);

      if (statusEl && btnEl) {
        if (isOpen) {
          statusEl.innerText = "ОТКРЫТО";
          statusEl.className = "school-status status-open";
          btnEl.style.pointerEvents = "auto";
          btnEl.style.opacity = "1";
        } else {
          statusEl.innerText = "ЗАКРЫТО";
          statusEl.className = "school-status status-closed";
          btnEl.style.pointerEvents = "none";
          btnEl.style.opacity = "0.4";
        }
      }
    });
  } catch (e) {
    console.error("Ошибка загрузки статусов:", e);
  }
}

// Управление модальным окном
function openAdminModal() {
  const modal = document.getElementById("adminModal");
  if (modal) modal.style.display = "flex";

  const savedToken = localStorage.getItem("gh_admin_token");
  if (savedToken) {
    const input = document.getElementById("adminKeyInput");
    if (input) input.value = savedToken;
    loginAdmin();
  }
}

function closeAdminModal() {
  const modal = document.getElementById("adminModal");
  if (modal) modal.style.display = "none";
}

function loginAdmin() {
  const input = document.getElementById("adminKeyInput");
  const token = input ? input.value.trim() : "";
  if (!token) {
    alert("Введите GitHub Token!");
    return;
  }

  localStorage.setItem("gh_admin_token", token);

  document.getElementById("toggle-fto").checked = !!currentStatuses.fto;
  document.getElementById("toggle-supervisor").checked = !!currentStatuses.supervisor;
  document.getElementById("toggle-metro").checked = !!currentStatuses.metro;
  document.getElementById("toggle-swat").checked = !!currentStatuses.swat;

  document.getElementById("adminAuthBlock").style.display = "none";
  document.getElementById("adminControlBlock").style.display = "block";
}

async function saveAdminStatuses() {
  const token = localStorage.getItem("gh_admin_token");
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = "Сохранение...";
  }

  const updatedStatuses = {
    fto: document.getElementById("toggle-fto")?.checked || false,
    supervisor: document.getElementById("toggle-supervisor")?.checked || false,
    metro: document.getElementById("toggle-metro")?.checked || false,
    swat: document.getElementById("toggle-swat")?.checked || false
  };

  try {
    const fileUrl = `https://api.github.com/repos/${GH_USER}/${GH_REPO}/contents/status.json`;
    const getRes = await fetch(fileUrl, {
      headers: { "Authorization": `token ${token}` }
    });

    if (!getRes.ok) throw new Error("Неверный токен или нет доступа!");

    const fileData = await getRes.json();
    const sha = fileData.sha;
    const contentEncoded = btoa(JSON.stringify(updatedStatuses, null, 2));

    const putRes = await fetch(fileUrl, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "Обновление статусов школ",
        content: contentEncoded,
        sha: sha
      })
    });

    if (putRes.ok) {
      alert("✅ Статусы успешно обновлены!");
      closeAdminModal();
      setTimeout(loadSchoolStatuses, 1500);
    } else {
      alert("❌ Ошибка при сохранении.");
    }
  } catch (err) {
    alert("❌ Ошибка: " + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = "Сохранить на GitHub";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadSchoolStatuses);
