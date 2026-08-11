// Вставь сюда скопированную ссылку вебхука Discord
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";

let currentStep = 0;
const totalSteps = 8; // 0..7
let tabSwitches = 0;
let timeLeft = 45 * 60;
const totalTimeAllocated = 45 * 60;

// Трекер смены вкладок (Античит)
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    tabSwitches++;
  }
});

// Таймер
const timerElement = document.getElementById("timer");
const timerInterval = setInterval(() => {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  if (timerElement) {
    timerElement.innerText = `⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
  
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    alert("Время на тест вышло! Отправка результатов...");
    submitQuiz();
  }
  timeLeft--;
}, 1000);

// Пошаговая навигация
const steps = document.querySelectorAll(".form-step");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const stepIndicator = document.getElementById("stepIndicator");

function updateStep() {
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === currentStep);
  });

  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
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

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  const currentStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
  if (!currentStepEl) return true;
  
  const inputs = currentStepEl.querySelectorAll("input[required], textarea[required]");
  
  for (let input of inputs) {
    if (input.type === "radio") {
      const radioGroup = currentStepEl.querySelectorAll(`input[name="${input.name}"]`);
      const isChecked = Array.from(radioGroup).some(r => r.checked);
      if (!isChecked) {
        alert("Пожалуйста, ответьте на все обязательные вопросы на этой странице.");
        return false;
      }
    } else if (!input.value.trim()) {
      alert("Заполните все обязательные поля!");
      input.focus();
      return false;
    }
  }
  return true;
}

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
  quizForm.addEventListener("submit", function(e) {
    e.preventDefault();
    if (validateCurrentStep()) {
      submitQuiz();
    }
  });
}

async function submitQuiz() {
  clearInterval(timerInterval);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Отправка результатов в Discord...";
  }

  const icName = document.getElementById("ic_name").value;
  const oocName = document.getElementById("ooc_name").value;
  const timeSpentSeconds = totalTimeAllocated - timeLeft;
  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const secondsSpent = timeSpentSeconds % 60;

  // Формируем текстовый блок со всеми 40 ответами
  let answersText = "";
  const answersList = [];

  for (let i = 1; i <= 40; i++) {
    let val = "Нет ответа";
    const textarea = document.getElementById(`q${i}`);
    if (textarea) {
      val = textarea.value.trim() || "Нет ответа";
    } else {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      if (selected) val = selected.value;
    }
    answersText += `**В${i}:** ${val}\n`;
    answersList.push({ id: i, answer: val });
  }

  // Данные для сохранения локально (чтобы отобразить кандидату на results.html)
  const resultData = {
    icName: icName,
    oocName: oocName,
    date: new Date().toLocaleString("ru-RU"),
    tabSwitches: tabSwitches,
    timeSpent: `${minutesSpent} мин. ${secondsSpent} сек.`,
    answers: answersList
  };

  localStorage.setItem("ftos_quiz_result", JSON.stringify(resultData));

  // Разбиваем текст ответов на куски до 1000 символов (ограничение Discord Embed)
  const chunks = answersText.match(/[\s\S]{1,950}(\n|$)/g) || [answersText];

  const embeds = [
    {
      title: "📋 Новый пройденный тест FTOS",
      color: 3859608, // Голубой цвет
      fields: [
        { name: "👤 IC Никнейм", value: icName, inline: true },
        { name: "🎮 OOC / Discord", value: oocName, inline: true },
        { name: "⏱️ Затраченное время", value: `${minutesSpent}м ${secondsSpent}с`, inline: true },
        { name: "⚠️ Уходов с вкладок", value: `${tabSwitches} раз(а)`, inline: true },
        { name: "📅 Дата", value: new Date().toLocaleString("ru-RU"), inline: true }
      ]
    }
  ];

  // Добавляем ответы в поля карточки
  chunks.forEach((chunk, index) => {
    embeds.push({
      title: `Ответы (Часть ${index + 1}/${chunks.length})`,
      color: 3859608,
      description: chunk
    });
  });

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "FTO Test System",
        avatar_url: "https://i.imgur.com/wSTFkRM.png",
        embeds: embeds.slice(0, 10) // Discord принимает до 10 embed-блоков за один запрос
      })
    });
  } catch (err) {
    console.error("Ошибка при отправке вебхука:", err);
  }

  // Переход на страницу результатов для кандидата
  window.location.href = "results.html";
}

// Автоматическое увеличение высоты textarea при вводе
document.querySelectorAll('textarea').forEach(textarea => {
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight + 5) + 'px';
  });
});
