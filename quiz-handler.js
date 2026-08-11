const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";

let tabSwitches = 0;
let startTime = Date.now();

// Фиксация смены вкладок
document.addEventListener("visibilitychange", () => {
  if (document.hidden) tabSwitches++;
});

async function processQuizSubmission(e, schoolKey, schoolTitle) {
  e.preventDefault();

  const form = e.target;

  // 1. Поиск никнеймов (поддерживает и #ic_name, и #ic-name)
  const icName = (form.querySelector("#ic_name, #ic-name")?.value || "").trim() || "Не указан";
  const oocName = (form.querySelector("#ooc_name, #ooc-name")?.value || "").trim() || "Не указан";

  // Расчет времени
  const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeSpentText = `${minutes} мин. ${seconds} сек.`;

  // 2. Сбор вопросов (поддерживает классы .qa-group и .question-card)
  const qaCards = form.querySelectorAll(".qa-group, .question-card");
  const qaList = [];

  qaCards.forEach((card, index) => {
    // Получение заглавия вопроса
    const titleEl = card.querySelector(".question-title, .question-text, .scenario-box");
    let questionTitle = titleEl ? titleEl.innerText.replace(/\s+/g, " ").trim() : `Вопрос №${index + 1}`;

    // Получение ответа (сначала радиокнопка, затем текстовое поле/textarea)
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

  // 3. Сохранение в localStorage для results.html
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

  // 4. Подготовка данных для Discord с разделением на части (Embeds)
  const shortAnswers = qaList.filter(q => q.answer.length < 300);
  const longScenarios = qaList.filter(q => q.answer.length >= 300 || q.title.toLowerCase().includes("ситуация"));

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

  // Вторая пачка вопросов, если их больше 18
  if (chunk2Text.length > 0) {
    embeds.push({
      title: `📊 Продолжение тестовых ответов`,
      color: 3859608,
      description: chunk2Text.substring(0, 4000)
    });
  }

  // Если есть ситуационные задачи (длинные текстовые ответы)
  if (longScenarios.length > 0) {
    embeds.push({
      title: `🚓 Ситуационные задачи`,
      color: 16744200,
      fields: longScenarios.map(item => ({
        name: item.title.substring(0, 256),
        value: item.answer.length > 1024 ? item.answer.substring(0, 1020) + "..." : item.answer
      }))
    });
  }

  // 5. Отправка в Discord Webhook
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Портал квалификации LSPD",
        embeds: embeds
      })
    });

    if (!response.ok) {
      console.error(`Ошибка Discord API: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error("Сетевая ошибка при отправке Webhook:", err);
  }

  // 6. Переход на страницу результатов
  window.location.href = "results.html?t=" + Date.now();
}
