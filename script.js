let tabSwitches = 0;
let timeLeft = 45 * 60; // 45 минут на прохождение (с учетом ситуационных кейсов)

// 1. АНТИЧИТ / ТАБТРЕКЕР
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    tabSwitches++;
    console.log(`Предупреждение: уход со страницы теста! Всего: ${tabSwitches}`);
  }
});

// 2. ТАЙМЕР
const timerElement = document.getElementById("timer");
const timerInterval = setInterval(() => {
  let minutes = Math.floor(timeLeft / 60);
  let seconds = timeLeft % 60;
  timerElement.innerText = `Время: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    alert("Время на прохождение теста вышло!");
    submitForm();
  }
  timeLeft--;
}, 1000);

// 3. ОТПРАВКА В DISCORD WEBHOOK
// Вставьте вашу ссылку на вебхук Discord между кавычек ниже:
const WEBHOOK_URL = "https://discord.com/api/webhooks/ВАШ_ВЕБХУК_СЮДА";

const form = document.getElementById("quizForm");
form.addEventListener("submit", function(e) {
  e.preventDefault();
  submitForm();
});

function getQuestionAnswer(i) {
  // Проверяем текстовое поле (для ситуационных вопросов 36-40)
  const textarea = document.getElementById(`q${i}`);
  if (textarea) {
    return textarea.value.trim() !== "" ? textarea.value.trim() : "Нет ответа";
  }

  // Проверяем переключатели радиокнопок (для вопросов 1-35)
  const selected = document.querySelector(`input[name="q${i}"]:checked`);
  return selected ? selected.value : "Нет ответа";
}

function submitForm() {
  clearInterval(timerInterval);

  const icName = document.getElementById("ic_name").value;
  const oocName = document.getElementById("ooc_name").value;

  const answers = [];
  for (let i = 1; i <= 40; i++) {
    answers.push({
      name: `Вопрос ${i}`,
      value: getQuestionAnswer(i),
      inline: false
    });
  }

  // Делим ответы на несколько эмбедов (по лимитам Discord - 25 полей на эмбед)
  const payload = {
    embeds: [
      {
        title: "📝 Результат теста FTOS LSPD (Часть 1: Вопросы 1-15)",
        color: tabSwitches > 2 ? 15158332 : 3066993,
        fields: [
          { name: "Никнейм IC", value: icName, inline: true },
          { name: "Никнейм OOC", value: oocName, inline: true },
          { name: "Переключений вкладок (Античит)", value: `${tabSwitches} раз(а)`, inline: true },
          ...answers.slice(0, 15)
        ]
      },
      {
        title: "📝 Результат теста FTOS LSPD (Часть 2: Вопросы 16-35)",
        color: tabSwitches > 2 ? 15158332 : 3066993,
        fields: answers.slice(15, 35)
      },
      {
        title: "📝 Результат теста FTOS LSPD (Часть 3: Развернутые Ситуации 36-40)",
        color: tabSwitches > 2 ? 15158332 : 3066993,
        fields: answers.slice(35, 40)
      }
    ]
  };

  if (WEBHOOK_URL.includes("ВАШ_ВЕБХУК_СЮДА")) {
    alert(`Тест завершен! Переключений вкладок: ${tabSwitches}. (Укажите ссылку на Webhook в script.js, чтобы ответы отправлялись в Discord)`);
    return;
  }

  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(() => {
    alert("Ваши ответы успешно отправлены!");
    window.location.reload();
  }).catch(err => {
    console.error(err);
    alert("Ошибка при отправке ответов.");
  });
}
