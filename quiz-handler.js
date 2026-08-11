// ============================================================
// LSPD — ОБРАБОТЧИК ТЕСТОВ
// ============================================================

// ВСТАВЬ СЮДА НОВЫЙ WEBHOOK ПОСЛЕ ЕГО ПЕРЕГЕНЕРАЦИИ В DISCORD
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";

// Счётчик переключений вкладки
let tabSwitches = 0;

// Время начала теста
const startTime = Date.now();


// ============================================================
// ОТСЛЕЖИВАНИЕ ПЕРЕКЛЮЧЕНИЙ ВКЛАДКИ
// ============================================================

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        tabSwitches++;
    }
});


// ============================================================
// КОНФИГУРАЦИЯ ШКОЛ
// ============================================================

const pageConfigs = {
    "fto.html": {
        key: "FTO",
        title: "Школа полевой подготовки (FTO)"
    },

    "supervisorschool.html": {
        key: "SUPERVISOR",
        title: "Школа супервайзеров"
    },

    "supervisor.html": {
        key: "SUPERVISOR",
        title: "Школа супервайзеров"
    },

    "metroofficerschool.html": {
        key: "METRO",
        title: "Школа Metropolitan Division"
    },

    "metro.html": {
        key: "METRO",
        title: "Школа Metropolitan Division"
    },

    "swatschool.html": {
        key: "SWAT",
        title: "Тактическая школа SWAT"
    },

    "swat.html": {
        key: "SWAT",
        title: "Тактическая школа SWAT"
    }
};


// ============================================================
// ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ ШКОЛЫ
// ============================================================

function getCurrentPageConfig() {
    const currentPage =
        window.location.pathname.split("/").pop().toLowerCase();

    return pageConfigs[currentPage] || {
        key: "TEST",
        title: "Тестирование"
    };
}


// ============================================================
// ПОИСК ФОРМЫ
// ============================================================

function findQuizForm() {
    // Основной вариант
    const quizForm = document.getElementById("quizForm");

    if (quizForm) {
        return quizForm;
    }

    // FTO
    const ftoForm = document.getElementById("ftos-test-form");

    if (ftoForm) {
        return ftoForm;
    }

    // Запасной вариант — первая форма на странице
    const anyForm = document.querySelector("form");

    return anyForm || null;
}


// ============================================================
// ПОЛУЧЕНИЕ ТЕКСТА ВОПРОСА
// ============================================================

function getQuestionTitle(card, index) {

    const selectors = [
        ".question-title",
        ".question-text",
        "h3",
        "h2",
        "p"
    ];

    for (const selector of selectors) {
        const element = card.querySelector(selector);

        if (element) {
            const text = element.innerText.trim();

            if (text) {
                return text;
            }
        }
    }

    return `Вопрос ${index + 1}`;
}


// ============================================================
// ПОЛУЧЕНИЕ ОТВЕТА
// ============================================================

function getQuestionAnswer(card) {

    // --------------------------------------------------------
    // RADIO
    // --------------------------------------------------------

    const checkedRadio = card.querySelector(
        'input[type="radio"]:checked'
    );

    if (checkedRadio) {

        const label =
            checkedRadio.closest("label");

        if (label) {
            return label.innerText.trim();
        }

        if (checkedRadio.value) {
            return checkedRadio.value.trim();
        }

        return "Выбран вариант";
    }


    // --------------------------------------------------------
    // CHECKBOX
    // --------------------------------------------------------

    const checkedCheckboxes = Array.from(
        card.querySelectorAll('input[type="checkbox"]:checked')
    );

    if (checkedCheckboxes.length > 0) {

        return checkedCheckboxes.map((checkbox) => {

            const label =
                checkbox.closest("label");

            if (label) {
                return label.innerText.trim();
            }

            return checkbox.value || "Выбран вариант";

        }).join(", ");
    }


    // --------------------------------------------------------
    // TEXTAREA
    // --------------------------------------------------------

    const textarea = card.querySelector("textarea");

    if (textarea) {
        return textarea.value.trim() || "Нет ответа";
    }


    // --------------------------------------------------------
    // INPUT TEXT
    // --------------------------------------------------------

    const textInput = card.querySelector(
        'input[type="text"]:not([id="ic-name"]):not([id="ooc-name"])'
    );

    if (textInput) {
        return textInput.value.trim() || "Нет ответа";
    }


    return "Нет ответа";
}


// ============================================================
// СБОР ВСЕХ ВОПРОСОВ
// ============================================================

function collectQuestions(form) {

    const qaList = [];

    // FTO использует .question-card
    let cards = Array.from(
        form.querySelectorAll(".question-card")
    );

    // Другие страницы могут использовать .qa-group
    if (cards.length === 0) {
        cards = Array.from(
            form.querySelectorAll(".qa-group")
        );
    }

    // Если есть карточки вопросов
    if (cards.length > 0) {

        cards.forEach((card, index) => {

            const title =
                getQuestionTitle(card, index);

            const answer =
                getQuestionAnswer(card);

            qaList.push({
                title,
                answer
            });

        });

        return qaList;
    }


    // --------------------------------------------------------
    // РЕЗЕРВНЫЙ ВАРИАНТ
    // --------------------------------------------------------

    const textareas =
        Array.from(form.querySelectorAll("textarea"));

    textareas.forEach((textarea, index) => {

        qaList.push({
            title: `Вопрос ${index + 1}`,
            answer: textarea.value.trim() || "Нет ответа"
        });

    });

    return qaList;
}


// ============================================================
// ПОЛУЧЕНИЕ IC
// ============================================================

function getIcName(form) {

    const selectors = [
        "#ic-name",
        "#ic_name",
        "#icName"
    ];

    for (const selector of selectors) {

        const element =
            form.querySelector(selector);

        if (element) {
            return element.value.trim() || "Не указан";
        }
    }

    return "Не указан";
}


// ============================================================
// ПОЛУЧЕНИЕ OOC
// ============================================================

function getOocName(form) {

    const selectors = [
        "#ooc-name",
        "#ooc_name",
        "#oocName"
    ];

    for (const selector of selectors) {

        const element =
            form.querySelector(selector);

        if (element) {
            return element.value.trim() || "Не указан";
        }
    }

    return "Не указан";
}


// ============================================================
// ФОРМАТ ВРЕМЕНИ
// ============================================================

function formatTime(seconds) {

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        seconds % 60;

    return `${minutes} мин. ${remainingSeconds} сек.`;
}


// ============================================================
// ЭКРАНИРОВАНИЕ DISCORD
// ============================================================

function escapeDiscordText(text) {

    if (!text) {
        return "Нет ответа";
    }

    return String(text)
        .replace(/@everyone/gi, "@\u200beveryone")
        .replace(/@here/gi, "@\u200bhere");
}


// ============================================================
// ОТПРАВКА
// ============================================================

async function processQuizSubmission(
    event,
    schoolKey,
    schoolTitle
) {

    event.preventDefault();

    const form = event.target;

    const submitBtn =
        form.querySelector('button[type="submit"]');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Отправка результатов...";
    }


    try {

        // ----------------------------------------------------
        // ДАННЫЕ
        // ----------------------------------------------------

        const icName =
            getIcName(form);

        const oocName =
            getOocName(form);

        const totalSeconds =
            Math.floor(
                (Date.now() - startTime) / 1000
            );

        const timeSpentText =
            formatTime(totalSeconds);

        const qaList =
            collectQuestions(form);


        // ----------------------------------------------------
        // ПРОВЕРКА
        // ----------------------------------------------------

        if (!icName || icName === "Не указан") {

            throw new Error(
                "Не указан IC никнейм."
            );
        }


        if (!oocName || oocName === "Не указан") {

            throw new Error(
                "Не указан OOC / Discord никнейм."
            );
        }


        if (qaList.length === 0) {

            throw new Error(
                "Не удалось найти вопросы теста."
            );
        }


        // ----------------------------------------------------
        // ОБЩИЙ РЕЗУЛЬТАТ
        // ----------------------------------------------------

        const testResults = {

            schoolTitle,
            schoolKey,

            icName,
            oocName,

            timeSpent: timeSpentText,

            tabSwitches,

            qaList,

            submittedAt:
                new Date().toISOString()
        };


        // ----------------------------------------------------
        // СОХРАНЯЕМ ДЛЯ results.html
        // ----------------------------------------------------

        localStorage.setItem(
            "lastQuizResult",
            JSON.stringify(testResults)
        );


        // ----------------------------------------------------
        // ПРОВЕРКА WEBHOOK
        // ----------------------------------------------------

        if (
            !DISCORD_WEBHOOK_URL ||
            DISCORD_WEBHOOK_URL === "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY"
        ) {

            throw new Error(
                "Discord Webhook не настроен в quiz-handler.js."
            );
        }


        // ----------------------------------------------------
        // DISCORD FIELDS
        // ----------------------------------------------------

        const fields = [

            {
                name: "👤 IC Никнейм",
                value:
                    escapeDiscordText(icName)
                        .substring(0, 1024),
                inline: true
            },

            {
                name: "🎮 Discord / OOC",
                value:
                    escapeDiscordText(oocName)
                        .substring(0, 1024),
                inline: true
            },

            {
                name: "⏱️ Время",
                value: timeSpentText,
                inline: true
            },

            {
                name: "⚠️ Уходов с вкладки",
                value: `${tabSwitches} раз(а)`,
                inline: true
            }
        ];


        // ----------------------------------------------------
        // ОТВЕТЫ
        // ----------------------------------------------------

        let description = "";

        qaList.forEach((question, index) => {

            description +=
                `**${escapeDiscordText(question.title)}**\n`;

            description +=
                `Ответ: ${escapeDiscordText(question.answer)}\n\n`;
        });


        // Discord ограничивает description 4096 символами
        if (description.length > 4000) {

            description =
                description.substring(0, 4000) +
                "\n\n… остальные ответы доступны на странице результатов.";
        }


        // ----------------------------------------------------
        // ОТПРАВКА В DISCORD
        // ----------------------------------------------------

        const response =
            await fetch(DISCORD_WEBHOOK_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    username:
                        "Портал квалификации LSPD",

                    embeds: [
                        {

                            title:
                                `📋 Пройден тест: ${schoolTitle}`,

                            color: 3859608,

                            fields,

                            description,

                            footer: {
                                text:
                                    "LSPD Qualification Portal"
                            },

                            timestamp:
                                new Date().toISOString()
                        }
                    ]
                })
            });


        // ----------------------------------------------------
        // ПРОВЕРЯЕМ ОТВЕТ DISCORD
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                `Discord Webhook вернул ошибку ${response.status}: ${errorText}`
            );
        }


        // ----------------------------------------------------
        // ВСЁ УСПЕШНО
        // ----------------------------------------------------

        window.location.href =
            "results.html";

    }

    catch (error) {

        console.error(
            "Ошибка отправки теста:",
            error
        );

        alert(
            "❌ Не удалось отправить результаты.\n\n" +
            error.message
        );

        if (submitBtn) {

            submitBtn.disabled = false;

            submitBtn.innerText =
                "Завершить тестирование и отправить ответы";
        }
    }
}


// ============================================================
// ПОДКЛЮЧЕНИЕ К ФОРМЕ
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            findQuizForm();

        if (!form) {

            console.error(
                "❌ Форма теста не найдена."
            );

            return;
        }


        const config =
            getCurrentPageConfig();


        console.log(
            "✅ Quiz Handler подключён:",
            config
        );


        form.addEventListener(
            "submit",
            (event) => {

                processQuizSubmission(
                    event,
                    config.key,
                    config.title
                );

            }
        );

    }
);
