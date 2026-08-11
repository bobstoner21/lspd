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
  timerElement.innerText = `⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    alert("Время на тест вышло! Сохранение результатов...");
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
  progressBar.style.width = `${progressPercent}%`;
  stepIndicator.innerText = `Шаг ${currentStep + 1} из ${totalSteps}`;

  prevBtn.style.display = currentStep === 0 ? "none" : "block";
  if (currentStep === totalSteps - 1) {
    nextBtn.style.display = "none";
    submitBtn.style.display = "block";
  } else {
    nextBtn.style.display = "block";
    submitBtn.style.display = "none";
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateCurrentStep() {
  const currentStepEl = document.querySelector(`.form-step[data-step="${currentStep}"]`);
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

nextBtn.addEventListener("click", () => {
  if (validateCurrentStep()) {
    if (currentStep < totalSteps - 1) {
      currentStep++;
      updateStep();
    }
  }
});

prevBtn.addEventListener("click", () => {
  if (currentStep > 0) {
    currentStep--;
    updateStep();
  }
});

document.getElementById("quizForm").addEventListener("submit", function(e) {
  e.preventDefault();
  if (validateCurrentStep()) {
    submitQuiz();
  }
});

function submitQuiz() {
  clearInterval(timerInterval);

  const icName = document.getElementById("ic_name").value;
  const oocName = document.getElementById("ooc_name").value;
  const timeSpentSeconds = totalTimeAllocated - timeLeft;
  const minutesSpent = Math.floor(timeSpentSeconds / 60);
  const secondsSpent = timeSpentSeconds % 60;

  const answers = [];
  for (let i = 1; i <= 40; i++) {
    let val = "Нет ответа";
    const textarea = document.getElementById(`q${i}`);
    if (textarea) {
      val = textarea.value.trim() || "Нет ответа";
    } else {
      const selected = document.querySelector(`input[name="q${i}"]:checked`);
      if (selected) val = selected.value;
    }
    answers.push({ id: i, answer: val });
  }

  const resultData = {
    icName: icName,
    oocName: oocName,
    date: new Date().toLocaleString("ru-RU"),
    tabSwitches: tabSwitches,
    timeSpent: `${minutesSpent} мин. ${secondsSpent} сек.`,
    answers: answers
  };

  // Сохраняем в localStorage и переходим на страницу результатов
  localStorage.setItem("ftos_quiz_result", JSON.stringify(resultData));
  window.location.href = "results.html";
}
