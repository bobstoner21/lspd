const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";

// Счетчик уходов с вкладки и время
let tabSwitches = 0;
let startTime = Date.now();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) tabSwitches++;
});

// Автоматическая инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  if (!form) {
    console.error("QuizHandler: Форма на странице не найдена!");
    return;
  }

  form.addEventListener("submit", (e) => processQuizSubmission(e, "FTOS", "Field Training Officer School"));
});

async function processQuizSubmission(e, schoolKey, schoolTitle) {
  // Отменяем стандартную перезагрузку страницы
  if (e && typeof e.preventDefault === "function") {
    e.preventDefault();
  }

  const form = e ? (e.target || document.querySelector("form")) : document.querySelector("form");
  const submitBtn = form.querySelector("button[type='submit'], input[type='submit']");
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Отправка результатов...";
  }

  try {
    // 1. Поиск никнеймов (подходит под любая именования)
    const icName = (form.querySelector("#ic_name, #ic-name, [name='ic_name']")?.value || "").trim() || "Не указан";
    const oocName = (form.querySelector("#ooc_name, #ooc-name, [name='ooc_name']")?.value || "").trim() || "Не указан";

    // 2. Расчет времени
    const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeSpentText = `${minutes} мин. ${seconds} сек.`;

    // 3. Сбор вопросов и ответов
    const qaCards = form.querySelectorAll(".qa-group, .question-card");
    const qaList = [];

    qaCards.forEach((card, index) => {
      // Ищем заголовок вопроса
      const titleEl = card.querySelector(".question-title, .question-text, .scenario-box");
      let questionTitle = titleEl ? titleEl.innerText.replace(/\s+/g, " ").trim() : `Вопрос №${index + 1}`;

      // Ищем ответ: сначала checked radio, если нет — textarea/input
      let answerText = "Нет ответа";
      const radioChecked = card.querySelector("input[type='radio']:checked");
      const textInput = card.querySelector("textarea, input[type='text']");

      if (radioChecked) {
        answerText = radioChecked.value.trim();
      } else if (textInput && textInput.value.trim() !== "") {
        answerText = textInput.value.trim();
      }

      qaList.push({
        id: index + 1,
        title: questionTitle,
        answer: answerText
      });
    });

    // 4. Сохранение в localStorage для страницы результатов
    const testResults = {
      schoolTitle: schoolTitle,
      schoolKey: schoolKey ? schoolKey.toUpperCase() : "TEST",
      icName: icName,
      oocName: oocName,
      timeSpent: timeSpentText,
      tabSwitches: tabSwitches,
      qaList: qaList
    };
    localStorage.setItem("lastQuizResult", JSON.stringify(testResults));

    // 5. Разделение ответов для Discord (чтобы не превысить лимиты API)
    const shortAnswers = qaList.filter(q => (q.answer || "").length < 300);
    const longScenarios = qaList.filter(q => (q.answer || "").length >= 300 || (q.title || "").toLowerCase().includes("ситуация"));

    let chunk1Text = "";
    let chunk2Text = "";

    shortAnswers.forEach((item, idx) => {
      const line = `**${item.title}**\n*Ответ:* ${item.answer}\n\n`;
      if (idx < 18) {
        chunk1Text += line;
      } else {
        chunk2Text += line;
      }
    });

    const embeds = [
      {
        title: `📋 Пройден тест: ${schoolTitle}`,
        color: 3859608,
        fields: [
          { name: "👤 IC Никнейм", value: icName, inline: true },
          { name: "🎮 Discord / OOC", value: oocName, inline: true },
          { name: "⏱️ Время", value: timeSpentText, inline: true },
          { name: "⚠️ Уходов с вкладок", value: `${tabSwitches} раз(а)`, inline: true }
        ],
        description: chunk1Text.length > 0 ? chunk1Text.substring(0, 4000) : "Тестовые ответы отсутствуют."
      }
    ];

    if (chunk2Text.length > 0) {
      embeds.push({
        title: `📊 Продолжение тестовых ответов`,
        color: 3859608,
        description: chunk2Text.substring(0, 4000)
      });
    }

    if (longScenarios.length > 0) {
      embeds.push({
        title: `🚓 Ситуационные задачи`,
        color: 16744200,
        fields: longScenarios.map(item => ({
          name: (item.title || "Ситуация").substring(0, 256),
          value: item.answer.length > 1024 ? item.answer.substring(0, 1020) + "..." : item.answer
        }))
      });
    }

    // 6. Отправка в Discord Webhook
    if (DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "Портал квалификации LSPD",
          embeds: embeds
        })
      });
    }

    // 7. Переход на страницу результатов
    window.location.href = "results.html?t=" + Date.now();

  } catch (err) {
    console.error("Ошибка при обработке формы:", err);
    alert("Произошла ошибка при отправке. Проверьте консоль браузера (F12).");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "Завершить тестирование и отправить ответы";
    }
  }
}
