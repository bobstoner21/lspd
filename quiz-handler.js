// ============================================================
// LSPD QUIZ HANDLER
// ============================================================

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";

let tabSwitches = 0;
const startTime = Date.now();


// ============================================================
// ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
// ============================================================

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        tabSwitches++;
    }
});


// ============================================================
// КОНФИГ СТРАНИЦ
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

    "metroofficerschool.html": {
        key: "METRO",
        title: "Школа Metropolitan Division"
    },

    "swatschool.html": {
        key: "SWAT",
        title: "Тактическая школа SWAT"
    },

    // если старые названия где-то ещё используются
    "supervisor.html": {
        key: "SUPERVISOR",
        title: "Школа супервайзеров"
    },

    "metro.html": {
        key: "METRO",
        title: "Школа Metropolitan Division"
    },

    "swat.html": {
        key: "SWAT",
        title: "Тактическая школа SWAT"
    }
};


// ============================================================
// ТЕКУЩАЯ СТРАНИЦА
// ============================================================

function getPageConfig() {

    const page =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    return pageConfigs[page] || {
        key: "TEST",
        title: "Тестирование"
    };
}


// ============================================================
// ПОИСК ФОРМЫ
// ============================================================

function getQuizForm() {

    const possibleIds = [
        "quizForm",
        "ftos-test-form"
    ];

    for (const id of possibleIds) {

        const form =
            document.getElementById(id);

        if (form) {
            return form;
        }
    }

    return document.querySelector("form");
}


// ============================================================
// IC
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
            return element.value.trim();
        }
    }

    return "Не указан";
}


// ============================================================
// OOC
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
            return element.value.trim();
        }
    }

    return "Не указан";
}


// ============================================================
// ТЕКСТ ВОПРОСА
// ============================================================

function getQuestionText(container, index) {

    const selectors = [
        ".question-text",
        ".question-title",
        ".question",
        "h3",
        "h2",
        "legend"
    ];

    for (const selector of selectors) {

        const element =
            container.querySelector(selector);

        if (element) {

            const text =
                element.innerText.trim();

            if (text) {
                return text;
            }
        }
    }

    return `Вопрос ${index + 1}`;
}


// ============================================================
// ОТВЕТ
// ============================================================

function getAnswer(container) {

    // RADIO
    const radio =
        container.querySelector(
            'input[type="radio"]:checked'
        );

    if (radio) {

        const label =
            document.querySelector(
                `label[for="${radio.id}"]`
            );

        if (label) {
            return label.innerText.trim();
        }

        const parentLabel =
            radio.closest("label");

        if (parentLabel) {
            return parentLabel.innerText.trim();
        }

        return radio.value || "Выбран вариант";
    }


    // CHECKBOX
    const checkboxes =
        Array.from(
            container.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        );

    if (checkboxes.length) {

        return checkboxes.map((checkbox) => {

            const label =
                document.querySelector(
                    `label[for="${checkbox.id}"]`
                );

            if (label) {
                return label.innerText.trim();
            }

            const parentLabel =
                checkbox.closest("label");

            if (parentLabel) {
                return parentLabel.innerText.trim();
            }

            return checkbox.value || "Выбран вариант";

        }).join(", ");
    }


    // TEXTAREA
    const textarea =
        container.querySelector("textarea");

    if (textarea) {
        return textarea.value.trim() || "Нет ответа";
    }


    // TEXT INPUT
    const textInput =
        container.querySelector(
            'input[type="text"]:not(#ic-name):not(#ooc-name):not(#ic_name):not(#ooc_name)'
        );

    if (textInput) {
        return textInput.value.trim() || "Нет ответа";
    }


    // SELECT
    const select =
        container.querySelector("select");

    if (select) {

        const option =
            select.options[select.selectedIndex];

        return option
            ? option.text.trim()
            : "Нет ответа";
    }


    return null;
}


// ============================================================
// СБОР ВОПРОСОВ
// ============================================================

function collectAnswers(form) {

    const results = [];


    // --------------------------------------------------------
    // ВАРИАНТ 1 — ЯВНЫЕ КАРТОЧКИ
    // --------------------------------------------------------

    let questionContainers =
        Array.from(
            form.querySelectorAll(
                ".question-card, .qa-group"
            )
        );


    // --------------------------------------------------------
    // ЕСЛИ КАРТОЧЕК НЕТ — ИЩЕМ БЛОКИ С INPUT/TEXTAREA
    // --------------------------------------------------------

    if (!questionContainers.length) {

        const fields =
            Array.from(
                form.querySelectorAll(
                    "textarea, input[type='radio'], input[type='checkbox'], select"
                )
            );

        const uniqueParents = [];

        fields.forEach((field) => {

            let parent =
                field.closest(
                    ".question-card, .qa-group, .question, .form-group, fieldset"
                );

            if (!parent) {
                parent = field.parentElement;
            }

            if (
                parent &&
                !uniqueParents.includes(parent)
            ) {
                uniqueParents.push(parent);
            }
        });

        questionContainers =
            uniqueParents;
    }


    // --------------------------------------------------------
    // ОБРАБАТЫВАЕМ КАЖДЫЙ ВОПРОС
    // --------------------------------------------------------

    questionContainers.forEach(
        (container, index) => {

            const answer =
                getAnswer(container);

            // Если внутри реально нет поля ответа,
            // не добавляем мусор.
            if (answer === null) {
                return;
            }

            const title =
                getQuestionText(
                    container,
                    index
                );

            results.push({
                title,
                answer
            });
        }
    );


    return results;
}


// ============================================================
// ЭКРАНИРОВАНИЕ
// ============================================================

function cleanDiscordText(text) {

    return String(text || "Нет ответа")
        .replace(/@everyone/gi, "@\u200beveryone")
        .replace(/@here/gi, "@\u200bhere");
}


// ============================================================
// РАЗБИВАЕМ ОТВЕТЫ НА ЧАСТИ
// ============================================================

function splitAnswers(answers) {

    const chunks = [];

    let current = "";

    answers.forEach((item) => {

        const block =
            `**${cleanDiscordText(item.title)}**\n` +
            `Ответ: ${cleanDiscordText(item.answer)}\n\n`;

        // Discord embed description max ~4096
        if (
            current.length + block.length > 3800
        ) {

            if (current) {
                chunks.push(current);
            }

            current = block;

        } else {

            current += block;
        }
    });


    if (current) {
        chunks.push(current);
    }


    return chunks;
}


// ============================================================
// ОТПРАВКА В DISCORD
// ============================================================

async function sendToDiscord(data) {

    const answerChunks =
        splitAnswers(data.qaList);


    // --------------------------------------------------------
    // Если вопросов нет
    // --------------------------------------------------------

    if (!answerChunks.length) {

        answerChunks.push(
            "Ответы не найдены."
        );
    }


    // --------------------------------------------------------
    // ПЕРВЫЙ EMBED
    // --------------------------------------------------------

    const embeds = [

        {
            title:
                `📋 Пройден тест: ${data.schoolTitle}`,

            color: 3859608,

            fields: [

                {
                    name: "👤 IC Никнейм",
                    value:
                        cleanDiscordText(
                            data.icName
                        ).substring(0, 1024),
                    inline: true
                },

                {
                    name: "🎮 Discord / OOC",
                    value:
                        cleanDiscordText(
                            data.oocName
                        ).substring(0, 1024),
                    inline: true
                },

                {
                    name: "⏱️ Время",
                    value: data.timeSpent,
                    inline: true
                },

                {
                    name: "⚠️ Уходов с вкладки",
                    value:
                        `${data.tabSwitches} раз(а)`,
                    inline: true
                }
            ],

            description:
                answerChunks[0],

            footer: {
                text:
                    "LSPD Qualification Portal"
            },

            timestamp:
                new Date().toISOString()
        }
    ];


    // --------------------------------------------------------
    // ОСТАЛЬНЫЕ ЧАСТИ
    // --------------------------------------------------------

    for (
        let i = 1;
        i < answerChunks.length;
        i++
    ) {

        embeds.push({

            title:
                `📋 Ответы — продолжение ${i}`,

            color: 3859608,

            description:
                answerChunks[i]
        });
    }


    // Discord максимум 10 embeds за один webhook
    // Если вопросов очень много — режем на отдельные сообщения.

    const batches = [];

    for (
        let i = 0;
        i < embeds.length;
        i += 10
    ) {

        batches.push(
            embeds.slice(i, i + 10)
        );
    }


    // --------------------------------------------------------
    // ОТПРАВКА
    // --------------------------------------------------------

    for (const batch of batches) {

        const response =
            await fetch(
                DISCORD_WEBHOOK_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        username:
                            "Портал квалификации LSPD",

                        embeds: batch
                    })
                }
            );


        if (!response.ok) {

            const error =
                await response.text();

            throw new Error(
                `Discord ${response.status}: ${error}`
            );
        }
    }
}


// ============================================================
// ОТПРАВКА ТЕСТА
// ============================================================

async function processQuizSubmission(
    event,
    schoolKey,
    schoolTitle
) {

    event.preventDefault();

    const form =
        event.target;

    const submitBtn =
        form.querySelector(
            "button[type='submit']"
        );


    if (submitBtn) {

        submitBtn.disabled = true;

        submitBtn.innerText =
            "Отправка результатов...";
    }


    try {

        // ----------------------------------------------------
        // ДАННЫЕ
        // ----------------------------------------------------

        const icName =
            getIcName(form);

        const oocName =
            getOocName(form);

        const seconds =
            Math.floor(
                (Date.now() - startTime) / 1000
            );

        const timeSpent =
            `${Math.floor(seconds / 60)} мин. ` +
            `${seconds % 60} сек.`;


        // ----------------------------------------------------
        // ВСЕ ОТВЕТЫ
        // ----------------------------------------------------

        const qaList =
            collectAnswers(form);


        console.log(
            "Собранные ответы:",
            qaList
        );


        // ----------------------------------------------------
        // РЕЗУЛЬТАТ
        // ----------------------------------------------------

        const result = {

            schoolKey,

            schoolTitle,

            icName:
                icName || "Не указан",

            oocName:
                oocName || "Не указан",

            timeSpent,

            tabSwitches,

            qaList
        };


        // ----------------------------------------------------
        // СОХРАНЯЕМ РЕЗУЛЬТАТ
        // ----------------------------------------------------

        localStorage.setItem(
            "lastQuizResult",
            JSON.stringify(result)
        );


        // ----------------------------------------------------
        // DISCORD
        // ----------------------------------------------------

        await sendToDiscord(result);


        // ----------------------------------------------------
        // ПОСЛЕ УСПЕШНОЙ ОТПРАВКИ
        // ----------------------------------------------------

        window.location.href =
            "results.html";

    }

    catch (error) {

        console.error(
            "Ошибка:",
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
// ПОДКЛЮЧЕНИЕ
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            getQuizForm();

        if (!form) {

            console.error(
                "❌ Форма теста не найдена."
            );

            return;
        }


        const config =
            getPageConfig();


        console.log(
            "✅ Quiz Handler:",
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
