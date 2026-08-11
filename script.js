// === КОНФИГУРАЦИЯ И НАСТРОЙКИ ===
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";
const GH_USER = "bobstoner21";
const GH_REPO = "lspd";

// Вопросы для академий LSPD
const SCHOOL_QUIZZES = {
  fto: {
    title: "Тест FTO (Field Training Officer)",
    questions: [
      { id: 1, title: "Порядок действий FTO при проведении 10-55 стажёром Phase II." },
      { id: 2, title: "Действия при отказе стажёра выполнять законные приказы во время 10-66." }
    ]
  },
  supervisor: {
    title: "Академия Супервайзеров (Supervisor)",
    questions: [
      { id: 1, title: "Перечислите поводы для объявления 10-99 на Юните." },
      { id: 2, title: "Порядок рассмотрения OOC/IC жалоб на офицеров вашей смены." }
    ]
  },
  metro: {
    title: "Тестирование Metropolitan Division",
    questions: [
      { id: 1, title: "Протокол работы EOD/K9 при обнаружении неразорвавшихся снарядов." },
      { id: 2, title: "Правила применения Heavy Rescue и таранного оборудования." }
    ]
  },
  swat: {
    title: "Квалификационный тест SWAT",
    questions: [
      { id: 1, title: "Штурмовые построения и зачистка помещений: Крюк, Crossover." },
      { id: 2, title: "Действия при ранении офицера в красной зоне и потеря связи с командным юнитом." }
    ]
  }
};

// Переменные состояния
let currentStep = 0;
let totalSteps = 0;
let tabSwitches = 0;
let timeLeft = 45 * 60;
const totalTimeAllocated = 45 * 60;
let timerInterval = null;
let currentSchoolKey = null;
let currentStatuses = { fto: false, supervisor: false, metro: false, swat: false };

// === АНТИЧИТ ===
document.addEventListener("visibilitychange", () => {
  if (document.hidden) tabSwitches++;
});

// === ЗАГРУЗКА СТАТУСОВ ИЗ status.json ===
async function loadSchoolStatuses() {
  try {
    const res = await fetch(`./status.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("Файл status.json не найден");
    currentStatuses = await res.json();

    Object.keys(SCHOOL_QUIZZES).forEach(school => {
      const isOpen = currentStatuses[school] === true;
      const statusEl = document.getElementById(`status-${school}`);
      const btnEl = document.getElementById(`btn-${school}`);

      if (statusEl && btnEl) {
        if (isOpen) {
          statusEl.innerText = "ОТКРЫТО";
          statusEl.className = "school-status status-open";
          btnEl.disabled = false;
        } else {
          statusEl.innerText = "ЗАКРЫТО";
          statusEl.className = "school-status status-closed";
          btnEl.disabled = true;
        }
      }
    });
  } catch (e) {
    console.error("Ошибка загрузки status.json:", e);
  }
}

// === ЛОГИКА ТЕСТИРОВАНИЯ ===
function startQuiz(schoolKey) {
  currentSchoolKey = schoolKey;
  const quiz = SCHOOL_QUIZZES[schoolKey];
  if (!quiz) return;
  
  const quizTitleEl = document.getElementById("quizTitle");
  if (quizTitleEl) quizTitleEl.innerText = quiz.title;

  const dynamicQuestions = document.getElementById("dynamicQuestions");
  if (dynamicQuestions) {
    dynamicQuestions.innerHTML = "";
    quiz.questions.forEach((q, idx) => {
      const div = document.createElement("div");
      div.className = "form-step";
      div.dataset.step = idx + 1;
      div.innerHTML = `
        <div class="section-header"><h2>Вопрос №${q.id}</h2></div>
        <div class="form-group">
          <label>${q.title} *</label>
          <textarea id="q_${q.id}" required placeholder="Введите ваш развернутый ответ..."></textarea>
        </div>
      `;
      dynamicQuestions.appendChild(div);
    });
  }

  totalSteps = quiz.questions.length + 1; // 1 шаг = данные IC/OOC, далее вопросы
  currentStep = 0;

  const mainPortal = document.getElementById("mainPortal");
  const quizContainer = document.getElementById("quizContainer");
  if (mainPortal) mainPortal.style.display = "none";
  if (quizContainer) quizContainer.style.display = "block";

  updateStep();
  startTimer();
}

function backToPortal() {
  if (timerInterval) clearInterval(timerInterval);
  const quizContainer = document.getElementById("quizContainer");
  const mainPortal = document.getElementById("mainPortal");
  if (quizContainer) quizContainer.style.display = "none";
  if (mainPortal) mainPortal.style.display = "block";
}

function startTimer() {
  timeLeft = totalTimeAllocated;
  const timerElement = document.getElementById("timer");
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    if (timerElement) {
      timerElement.innerText = `⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      alert("Время вышло!");
      submitQuiz();
    }
    timeLeft--;
  }, 1000);
}

function updateStep() {
  const steps = document.querySelectorAll(".form-step");
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === currentStep);
  });

  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
  const progressBar = document.getElementById("progressBar");
  const stepIndicator = document.getElementById("stepIndicator");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (progressBar) progressBar.style.width = `${progressPercent}%`;
  if (stepIndicator) stepIndicator.innerText = `Шаг ${currentStep + 1} из ${totalSteps}`;

  if (prevBtn) prevBtn.style.display = currentStep === 0 ? "none" : "block";
  if (currentStep === totalSteps - 1) {
    if (nextBtn) nextBtn.style.display = "none";
    if (submitBtn) submitBtn.style.display = "block";
  } else {
    if (nextBtn) nextBtn.style.display = "block";
    if (submitBtn) submitBtn.style.display = "none";
  }
}

function validateCurrentStep() {
  const activeEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  if (!activeEl) return true;

  const inputs = activeEl.querySelectorAll("input[required], textarea[required]");
  for (let input of inputs) {
    if (!input.value.trim()) {
      alert("Заполните все обязательные поля!");
      input.focus();
      return false;
    }
  }
  return true;
}

// === ОТПРАВКА И СОХРАНЕНИЕ РЕЗУЛЬТАТОВ ===
async function submitQuiz() {
  if (timerInterval) clearInterval(timerInterval);

  const icInput = document.getElementById("ic_name");
  const oocInput = document.getElementById("ooc_name");
  const icName = icInput ? icInput.value.trim() : "Не указан";
  const oocName = oocInput ? oocInput.value.trim() : "Не указан";

  const timeSpentSeconds = totalTimeAllocated - timeLeft;
  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const secondsSpent = timeSpentSeconds % 60;

  const quiz = SCHOOL_QUIZZES[currentSchoolKey];
  if (!quiz) return;

  const qaList = quiz.questions.map((q) => {
    const textarea = document.getElementById(`q_${q.id}`);
    return {
      id: q.id,
      title: q.title,
      answer: textarea && textarea.value.trim() ? textarea.value.trim() : "Нет ответа"
    };
  });

  // 1. Сохраняем результат в localStorage для results.html
  const testResults = {
    schoolTitle: quiz.title,
    schoolKey: currentSchoolKey.toUpperCase(),
    icName: icName,
    oocName: oocName,
    timeSpent: `${minutesSpent} мин. ${secondsSpent} сек.`,
    tabSwitches: tabSwitches,
    qaList: qaList
  };
  localStorage.setItem("lastQuizResult", JSON.stringify(testResults));

  // 2. Отправка в Discord Webhook
  let answersDiscordText = "";
  qaList.forEach(item => {
    answersDiscordText += `**В${item.id}:** ${item.answer}\n`;
  });

  const embeds = [
    {
      title: `📋 Новый тест: ${quiz.title}`,
      color: 3859608,
      fields: [
        { name: "👤 IC Никнейм", value: icName, inline: true },
        { name: "🎮 Discord / OOC", value: oocName, inline: true },
        { name: "⏱️ Время", value: `${minutesSpent}м ${secondsSpent}с`, inline: true },
        { name: "⚠️ Уходов с вкладок", value: `${tabSwitches} раз(а)`, inline: true }
      ],
      description: answersDiscordText.substring(0, 2000)
    }
  ];

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "LSPD Test Portal", embeds: embeds })
    });
  } catch (err) {
    console.error("Ошибка отправки Webhook:", err);
  }

  // 3. Редирект со сбросом кэша
  window.location.href = "results.html?t=" + Date.now();
}

// === АДМИН-ПАНЕЛЬ (GitHub API) ===
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

  const tFto = document.getElementById("toggle-fto");
  const tSup = document.getElementById("toggle-supervisor");
  const tMet = document.getElementById("toggle-metro");
  const tSwat = document.getElementById("toggle-swat");

  if (tFto) tFto.checked = !!currentStatuses.fto;
  if (tSup) tSup.checked = !!currentStatuses.supervisor;
  if (tMet) tMet.checked = !!currentStatuses.metro;
  if (tSwat) tSwat.checked = !!currentStatuses.swat;

  const authBlock = document.getElementById("adminAuthBlock");
  const controlBlock = document.getElementById("adminControlBlock");
  if (authBlock) authBlock.style.display = "none";
  if (controlBlock) controlBlock.style.display = "block";
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

    if (!getRes.ok) throw new Error("Неверный токен или нет доступа к репозиторию!");

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
        message: "Update academy statuses via Admin Panel",
        content: contentEncoded,
        sha: sha
      })
    });

    if (putRes.ok) {
      alert("✅ Статусы успешно обновлены на GitHub!");
      closeAdminModal();
      setTimeout(loadSchoolStatuses, 1500);
    } else {
      alert("❌ Ошибка при сохранении. Проверьте токен.");
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

// === ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ===
document.addEventListener("DOMContentLoaded", () => {
  loadSchoolStatuses();

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (validateCurrentStep()) {
        if (currentStep < totalSteps - 1) {
          currentStep++;
          updateStep();
        }
      }
    });
  }

  const prevBtn = document.getElementById("prevBtn");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        updateStep();
      }
    });
  }

  const quizForm = document.getElementById("quizForm");
  if (quizForm) {
    quizForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (validateCurrentStep()) submitQuiz();
    });
  }
});
