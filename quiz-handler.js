const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536702720076025866/tNljQFBjKVPNXWcwJn7eD2aXTH9P1Mw7qYbhdCLKa_KCPxhImzrWADI2mcXPI_fNYxbV";

let tabSwitches = 0;
let startTime = Date.now();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) tabSwitches++;
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quizForm");
  if (!form) return;

  // Конфигурация для каждой страницы
  const pageConfigs = {
    "fto.html": { key: "FTO", title: "Школа полевой подготовки (FTO)" },
    "metro.html": { key: "METRO", title: "Школа Metropolitan Division" },
    "supervisor.html": { key: "SUPERVISOR", title: "Школа супервайзеров" },
    "swat.html": { key: "SWAT", title: "Тактическая школа SWAT" }
  };

  const currentPage = window.location.pathname.split("/").pop();
  const config = pageConfigs[currentPage] || { key: "TEST", title: "Тестирование" };

  form.addEventListener("submit", (e) => processQuizSubmission(e, config.key, config.title));
});

async function processQuizSubmission(e, schoolKey, schoolTitle) {
  e.preventDefault(); // ГАРАНТИРОВАННАЯ отмена перезагрузки

  const form = e.target;
  const submitBtn = form.querySelector("button[type='submit']");
  
  submitBtn.disabled = true;
  submitBtn.innerText = "Отправка результатов...";

  try {
    const icName = form.querySelector("#ic_name")?.value.trim() || "Не указан";
    const oocName = form.querySelector("#ooc_name")?.value.trim() || "Не указан";

    const totalSeconds = Math.floor((Date.now() - startTime) / 1000);
    const timeSpentText = `${Math.floor(totalSeconds / 60)} мин. ${totalSeconds % 60} сек.`;

    const qaCards = form.querySelectorAll(".qa-group");
    const qaList = [];

    qaCards.forEach((card, index) => {
      const title = card.querySelector(".question-title")?.innerText.trim() || `Вопрос ${index + 1}`;
      const answer = card.querySelector("textarea")?.value.trim() || "Нет ответа";
      qaList.push({ title, answer });
    });

    const testResults = { schoolTitle, schoolKey, icName, oocName, timeSpent: timeSpentText, tabSwitches, qaList };
    localStorage.setItem("lastQuizResult", JSON.stringify(testResults));

    // Отправка в Discord
    const fields = [
      { name: "👤 IC Никнейм", value: icName, inline: true },
      { name: "🎮 Discord / OOC", value: oocName, inline: true },
      { name: "⏱️ Время", value: timeSpentText, inline: true },
      { name: "⚠️ Уходов с вкладок", value: `${tabSwitches} раз(а)`, inline: true }
    ];

    const description = qaList.map(q => `**${q.title}**\n*Ответ:* ${q.answer}\n\n`).join("");

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Портал квалификации LSPD",
        embeds: [{ title: `📋 Пройден тест: ${schoolTitle}`, color: 3859608, fields, description: description.substring(0, 4000) }]
      })
    });

    window.location.href = "results.html";
  } catch (err) {
    alert("Ошибка отправки. Проверьте консоль.");
    submitBtn.disabled = false;
    submitBtn.innerText = "Завершить и отправить";
  }
}
