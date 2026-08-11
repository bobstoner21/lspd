let tabSwitches = 0;
let timeLeft = 15 * 60; // 15 минут

// 1. ДЕТЕКТОР СМЕНЫ ВКЛАДОК (ТАБТРЕКЕР)
document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    tabSwitches++;
    console.log(`Попытка свернуть окно! Всего: ${tabSwitches}`);
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
    alert("Время вышло!");
    submitForm();
  }
  timeLeft--;
}, 1000);

// 3. ОТПРАВКА В DISCORD WEBHOOK
const WEBHOOK_URL = "https://discord.com/api/webhooks/ВАШ_ВЕБХУК_СЮДА";

document.getElementById("quizForm").addEventListener("submit", function(e) {
  e.preventDefault();
  submitForm();
});

function submitForm() {
  clearInterval(timerInterval);

  const username = document.getElementById("username").value;
  const q1 = document.getElementById("q1").value;

  const payload = {
    embeds: [{
      title: "📝 Новый ответ на тест FTO LSPD",
      color: tabSwitches > 2 ? 15158332 : 3066993, // Красный если много смен вкладок, зеленый если честно
      fields: [
        { name: "Игрок", value: username, inline: true },
        { name: "Переключений вкладок (Античит)", value: `${tabSwitches} раз(а)`, inline: true },
        { name: "Ответ на Q1 (10-55)", value: q1 }
      ]
    }]
  };

  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then(() => {
    alert("Тест успешно отправлен!");
    window.location.reload();
  });
}