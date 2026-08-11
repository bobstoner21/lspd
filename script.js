// === КОНФИГУРАЦИЯ И НАСТРОЙКИ ===
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";
const GH_USER = "bobstoner21";
const GH_REPO = "lspd";

// База вопросов для академий LSPD
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

// === АНТИЧИТ (Фиксация смены вкладок) ===
document.addEventListener("visibilitychange", function() {
  if (document.hidden) tabSwitches++;
});

// === ЗАГРУЗКА СТАТУСОВ ИЗ СТАТИЧЕСКОГО JSON ===
async function loadSchoolStatuses() {
  try {
    // Кэш-бастинг (?t=...), чтобы браузер подтягивал актуальный статус из GitHub
    const res = await fetch(`./status.json?t=${Date.now()}`);
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
  
  document.getElementById("quizTitle").innerText = quiz.title;

  const dynamicQuestions = document.getElementById("dynamicQuestions");
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

  totalSteps = quiz.questions.length + 1; // +1 для первого шага (IC/OOC данные)
  currentStep = 0;

  document.getElementById("mainPortal").style.display = "none";
  document.getElementById("quizContainer").style.display = "block";

  updateStep();
  startTimer();
}

function backToPortal() {
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById("quizContainer").style.display = "none";
  document.getElementById("mainPortal").style.display = "block";
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
  document.getElementById("progressBar").style.width = `${progressPercent}%`;
  document.getElementById("stepIndicator").innerText = `Шаг ${currentStep + 1} из ${totalSteps}`;

  document.getElementById("prevBtn").style.display = currentStep === 0 ? "none" : "block";
  if (currentStep === totalSteps - 1) {
    document.getElementById("nextBtn").style.display = "none";
    document.getElementById("submitBtn").style.display = "block";
  } else {
    document.getElementById("nextBtn").style.display = "block";
    document.getElementById("submitBtn").style.display = "none";
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

// Навигация по кнопкам
document.getElementById("nextBtn").addEventListener("click", () => {
  if (validateCurrentStep()) {
    if (currentStep < totalSteps - 1) {
      currentStep++;
      updateStep();
    }
  }
});

document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep--;
    updateStep();
  }
});

document.getElementById("quizForm").addEventListener("submit", function(e) {
  e.preventDefault();
  if (validateCurrentStep()) submitQuiz();
});

// === ОТПРАВКА И СОХРАНЕНИЕ РЕЗУЛЬТАТОВ ===
async function submitQuiz() {
  clearInterval(timerInterval);

  const icName = document.getElementById("ic_name").value;
  const oocName = document.getElementById("ooc_name").value;
  const timeSpentSeconds = totalTimeAllocated - timeLeft;
  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const secondsSpent = timeSpentSeconds % 60;

  const quiz = SCHOOL_QUIZZES[currentSchoolKey];
  
  // Формируем структурированный массив ответов
  const qaList = quiz.questions.map((q) => {
    const textarea = document.getElementById(`q_${q.id}`);
    return {
      id: q.id,
      title: q.title,
      answer: textarea ? textarea.value.trim() : "Нет ответа"
    };
  });

  // 1. Сохраняем результат в локальное хранилище для results.html
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

  // 2. Отправляем в Discord Webhook
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
    console.error("Ошибка отправки Discord Webhook:", err);
  }

  // 3. Редирект на итоговую карточку
  window.location.href = "results.html";
}

// === АДМИН-ПАНЕЛЬ (Управление через GitHub API) ===
function openAdminModal() {
  document.getElementById("adminModal").style.display = "flex";
  const savedToken = localStorage.getItem("gh_admin_token");
  if (savedToken) {
    document.getElementById("adminKeyInput").value = savedToken;
    loginAdmin();
  }
}

function closeAdminModal() {
  document.getElementById("adminModal").style.display = "none";
}

function loginAdmin() {
  const token = document.getElementById("adminKeyInput").value.trim();
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
  saveBtn.disabled = true;
  saveBtn.innerText = "Сохранение...";

  const updatedStatuses = {
    fto: document.getElementById("toggle-fto").checked,
    supervisor: document.getElementById("toggle-supervisor").checked,
    metro: document.getElementById("toggle-metro").checked,
    swat: document.getElementById("toggle-swat").checked
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
    saveBtn.disabled = false;
    saveBtn.innerText = "Сохранить на GitHub";
  }
}

// Первичная инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", loadSchoolStatuses);
