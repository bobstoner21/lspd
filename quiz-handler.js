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
  const icName = form.querySelector("#ic_name")?.value.trim() || "Не указан";
  const oocName = form.querySelector("#ooc_name")?.value.trim() || "Не указан";

  // Расчет времени
  const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const timeSpentText = `${minutes} мин. ${seconds} сек.`;

  // Сбор вопросов и ответов
  const qaCards = form.querySelectorAll(".qa-group");
  const qaList = [];

  qaCards.forEach((card, index) => {
    const questionTitle = card.querySelector(".question-title")?.innerText || `Вопрос №${index + 1}`;
    const answerInput = card.querySelector("textarea, input[type='text'], input[type='radio']:checked");
    
    let answerText = "Нет ответа";
    if (answerInput) {
      answerText = answerInput.value.trim();
    }

    qaList.push({
      id: index + 1,
      title: questionTitle,
      answer: answerText
    });
  });

  // 1. Сохранение в localStorage для results.html
  const testResults = {
    schoolTitle: schoolTitle,
    schoolKey: schoolKey.toUpperCase(),
    icName: icName,
    oocName: oocName,
    timeSpent: timeSpentText,
    tabSwitches: tabSwitches,
    qaList: qaList
  };
  localStorage.setItem("lastQuizResult", JSON.stringify(testResults));

  // 2. Формирование текста для Discord
  let answersDiscordText = "";
  qaList.forEach(item => {
    answersDiscordText += `**${item.title}**\n*Ответ:* ${item.answer}\n\n`;
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
      description: answersDiscordText.substring(0, 2000)
    }
  ];

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "Портал квалификации LSPD", embeds: embeds })
    });
  } catch (err) {
    console.error("Ошибка отправки Webhook:", err);
  }

  // 3. Переход на итоговую страницу
  window.location.href = "results.html?t=" + Date.now();
}
