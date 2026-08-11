// Ссылки на ваши Вебхуки Discord
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";

// JSON-конфиг со статусами школ (хранится в открытом бесплатном хранилище, обновляется ботом/тобой)
// Структура хранилища: { "fto": true, "supervisor": false, "metro": false, "swat": false }
const STATUS_JSON_URL = "https://api.jsonbin.io/v3/b/ВАШ_BIN_ID/latest";

// Наброски вопросов для 4 школ LSPD
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

let currentStep = 0;
let totalSteps = 0;
let tabSwitches = 0;
let timeLeft = 45 * 60;
const totalTimeAllocated = 45 * 60;
let timerInterval = null;
let currentSchoolKey = null;

// Античит
document.addEventListener("visibilitychange", function() {
  if (document.hidden) tabSwitches++;
});

// Загрузка открытых/закрытых школ из конфига
async function loadSchoolStatuses() {
  try {
    const res = await fetch(STATUS_JSON_URL);
    const data = await res.json();
    const statuses = data.record || data;

    Object.keys(SCHOOL_QUIZZES).forEach(school => {
      const isOpen = statuses[school] === true;
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
    console.error("Не удалось получить статусы школ:", e);
  }
}

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

  totalSteps = quiz.questions.length + 1; // +1 для первого шага никнеймов
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
  timeLeft = 45 * 60;
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

document.getElementById("quizForm").addEventListener("submit", function(e) {
  e.preventDefault();
  if (validateCurrentStep()) submitQuiz();
});

async function submitQuiz() {
  clearInterval(timerInterval);

  const icName = document.getElementById("ic_name").value;
  const oocName = document.getElementById("ooc_name").value;
  const timeSpentSeconds = totalTimeAllocated - timeLeft;
  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const secondsSpent = timeSpentSeconds % 60;

  const quiz = SCHOOL_QUIZZES[currentSchoolKey];
  let answersText = "";

  quiz.questions.forEach((q) => {
    const textarea = document.getElementById(`q_${q.id}`);
    const val = textarea ? textarea.value.trim() : "Нет ответа";
    answersText += `**В${q.id}:** ${val}\n`;
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
      description: answersText.substring(0, 2000)
    }
  ];

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "LSPD Test Portal", embeds: embeds })
    });
  } catch (err) {
    console.error(err);
  }

  window.location.href = "results.html";
}

document.addEventListener("DOMContentLoaded", loadSchoolStatuses);
