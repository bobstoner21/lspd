// ============================================================
// LSPD QUIZ HANDLER
// Полностью переписанная версия
// ============================================================

const DISCORD_WEBHOOK_URL =
    "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";

// ============================================================
// ПЕРЕМЕННЫЕ ТЕСТА
// ============================================================

let tabSwitches = 0;
const startTime = Date.now();


// ============================================================
// СЧИТАЕМ УХОДЫ СО СТРАНИЦЫ
// ============================================================

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        tabSwitches++;
    }
});


// ============================================================
// НАСТРОЙКИ ШКОЛ
// ============================================================

const SCHOOL_CONFIG = {

    "fto.html": {
        key: "FTO",
        title: "Школа полевой подготовки FTO"
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
    }

};


// ============================================================
// ОПРЕДЕЛЯЕМ ТЕКУЩУЮ СТРАНИЦУ
// ============================================================

function getSchoolConfig() {

    const fileName =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    return SCHOOL_CONFIG[fileName] || {
        key: "TEST",
        title: "Квалификационный тест"
    };
}


// ============================================================
// НАХОДИМ ФОРМУ
// ============================================================

function getQuizForm() {

    return (
        document.getElementById("ftos-test-form") ||
        document.getElementById("quizForm") ||
        document.querySelector("form")
    );

}


// ============================================================
// ПОЛУЧЕНИЕ IC НИКНЕЙМА
// ============================================================

function getICName(form) {

    const selectors = [
        "#ic-name",
        "#ic_name",
        "#icName"
    ];

    const names = [
        "ic_name",
        "icName",
        "ic",
        "nickname",
        "name"
    ];

    for (const selector of selectors) {

        const element = form.querySelector(selector);

        if (
            element &&
            element.value &&
            element.value.trim()
        ) {

            return element.value.trim();

        }

    }

    for (const name of names) {

        const element =
            form.querySelector(`[name="${name}"]`);

        if (
            element &&
            element.value &&
            element.value.trim()
        ) {

            return element.value.trim();

        }

    }

    return "Не указан";

}


// ============================================================
// ПОЛУЧЕНИЕ OOC / DISCORD
// ============================================================

function getOOCName(form) {

    const selectors = [
        "#ooc-name",
        "#ooc_name",
        "#oocName"
    ];

    const names = [
        "ooc_name",
        "oocName",
        "ooc",
        "discord",
        "discord_name"
    ];

    for (const selector of selectors) {

        const element = form.querySelector(selector);

        if (
            element &&
            element.value &&
            element.value.trim()
        ) {

            return element.value.trim();

        }

    }

    for (const name of names) {

        const element =
            form.querySelector(`[name="${name}"]`);

        if (
            element &&
            element.value &&
            element.value.trim()
        ) {

            return element.value.trim();

        }

    }

    return "Не указан";

}


// ============================================================
// ЗАЩИТА ОТ DISCORD MENTION
// ============================================================

function cleanDiscordText(value) {

    return String(value || "Нет ответа")
        .replace(/@everyone/gi, "@\u200Beveryone")
        .replace(/@here/gi, "@\u200Bhere")
        .trim();

}


// ============================================================
// ПОЛУЧАЕМ ТЕКСТ ВЫБРАННОГО ВАРИАНТА
// ============================================================

function getRadioText(radio) {

    if (!radio) {
        return "Нет ответа";
    }


    // Если radio находится внутри label
    const label = radio.closest("label");

    if (label) {

        const clone = label.cloneNode(true);

        const input = clone.querySelector("input");

        if (input) {
            input.remove();
        }

        const text = clone.textContent
            .replace(/\s+/g, " ")
            .trim();

        if (text) {
            return text;
        }

    }


    // Если используется label[for]
    if (radio.id) {

        const labelByFor =
            document.querySelector(
                `label[for="${radio.id}"]`
            );

        if (labelByFor) {

            const clone =
                labelByFor.cloneNode(true);

            const input =
                clone.querySelector("input");

            if (input) {
                input.remove();
            }

            const text = clone.textContent
                .replace(/\s+/g, " ")
                .trim();

            if (text) {
                return text;
            }

        }

    }


    return radio.value || "Выбран вариант";

}


// ============================================================
// НАХОДИМ КАРТОЧКУ ВОПРОСА
// ============================================================

function getQuestionCard(element) {

    return (
        element.closest(".card") ||
        element.closest(".question-card") ||
        element.closest(".qa-group") ||
        element.closest("fieldset") ||
        element.parentElement
    );

}


// ============================================================
// ПОЛУЧАЕМ ЗАГОЛОВОК ВОПРОСА
// ============================================================

function getQuestionTitle(card, defaultTitle) {

    const selectors = [

        ".question",

        ".question-text",

        ".question-title",

        "h3",

        "h4"

    ];


    for (const selector of selectors) {

        const element =
            card.querySelector(selector);

        if (!element) {
            continue;
        }

        const text =
            element.textContent
                .replace(/\s+/g, " ")
                .trim();

        if (text) {

            return text
                .replace(/\s*\*+\s*$/, "");

        }

    }


    return defaultTitle;

}


// ============================================================
// ПОЛУЧАЕМ ОТВЕТ ИЗ КАРТОЧКИ
// ============================================================

function getAnswerFromCard(card) {


    // --------------------------------------------------------
    // RADIO
    // --------------------------------------------------------

    const checkedRadio =
        card.querySelector(
            'input[type="radio"]:checked'
        );

    if (checkedRadio) {

        return getRadioText(checkedRadio);

    }


    // --------------------------------------------------------
    // CHECKBOX
    // --------------------------------------------------------

    const checkedCheckboxes =
        Array.from(
            card.querySelectorAll(
                'input[type="checkbox"]:checked'
            )
        );

    if (checkedCheckboxes.length > 0) {

        return checkedCheckboxes
            .map(getRadioText)
            .join(", ");

    }


    // --------------------------------------------------------
    // TEXTAREA
    // --------------------------------------------------------

    const textarea =
        card.querySelector("textarea");

    if (textarea) {

        return textarea.value.trim() ||
            "Нет ответа";

    }


    // --------------------------------------------------------
    // SELECT
    // --------------------------------------------------------

    const select =
        card.querySelector("select");

    if (select) {

        const option =
            select.options[select.selectedIndex];

        if (option) {
            return option.text.trim();
        }

    }


    return "Нет ответа";

}


// ============================================================
// СБОР ГРУПП ПО ИМЕНАМ
//
// q1
// q2
// q3
//
// ord1
// ord2
//
// s1
// s2
//
// case1
// case2
// ============================================================

function collectGroup(
    form,
    prefix,
    titlePrefix
) {

    const fields =
        Array.from(
            form.querySelectorAll(
                `[name^="${prefix}"]`
            )
        );


    const numbers = new Set();


    fields.forEach(field => {

        const match =
            field.name.match(
                new RegExp(
                    `^${prefix}(\\d+)$`
                )
            );

        if (!match) {
            return;
        }

        numbers.add(
            Number(match[1])
        );

    });


    const sortedNumbers =
        Array.from(numbers)
            .sort((a, b) => a - b);


    const result = [];


    sortedNumbers.forEach(number => {

        const firstField =
            fields.find(field => {

                return field.name ===
                    `${prefix}${number}`;

            });


        if (!firstField) {
            return;
        }


        const card =
            getQuestionCard(firstField);


        if (!card) {
            return;
        }


        const answer =
            getAnswerFromCard(card);


        const title =
            getQuestionTitle(
                card,
                `${titlePrefix} ${number}`
            );


        result.push({

            type: prefix,

            order: number,

            title: title,

            answer: answer

        });

    });


    return result;

}


// ============================================================
// СОБИРАЕМ ВСЕ ОТВЕТЫ
//
// ПОРЯДОК ЗДЕСЬ ЖЁСТКО ЗАДАН:
//
// q1 → q2 → ... → q22
//
// ord1 → ord2 → ord3
//
// s1 → s2 → ... → s5
//
// case1 → case2
//
// ============================================================

function collectAnswers(form) {

    const answers = [];


    // --------------------------------------------------------
    // ОБЫЧНЫЕ ВОПРОСЫ
    // --------------------------------------------------------

    const normalQuestions =
        collectGroup(
            form,
            "q",
            "Вопрос"
        );


    answers.push(
        ...normalQuestions
    );


    // --------------------------------------------------------
    // ПОСЛЕДОВАТЕЛЬНОСТЬ
    // --------------------------------------------------------

    const orderQuestions =
        collectGroup(
            form,
            "ord",
            "Порядок действий"
        );


    answers.push(
        ...orderQuestions
    );


    // --------------------------------------------------------
    // СИТУАЦИИ
    // --------------------------------------------------------

    const situations =
        collectGroup(
            form,
            "s",
            "Ситуация"
        );


    answers.push(
        ...situations
    );


    // --------------------------------------------------------
    // КЕЙСЫ
    // --------------------------------------------------------

    const cases =
        collectGroup(
            form,
            "case",
            "Кейс"
        );


    answers.push(
        ...cases
    );


    return answers;

}


// ============================================================
// ФОРМАТ ВРЕМЕНИ
// ============================================================

function getTimeSpent() {

    const seconds =
        Math.floor(
            (Date.now() - startTime) / 1000
        );


    const minutes =
        Math.floor(seconds / 60);


    const remainingSeconds =
        seconds % 60;


    return (
        `${minutes} мин. ` +
        `${remainingSeconds} сек.`
    );

}


// ============================================================
// РАЗБИВАЕМ ОТВЕТЫ НА ЧАСТИ ДЛЯ DISCORD
// ============================================================

function buildDiscordAnswerChunks(answers) {

    const chunks = [];

    let current = "";


    answers.forEach(item => {

        const block =
            `**${cleanDiscordText(item.title)}**\n` +
            `Ответ: ${cleanDiscordText(item.answer)}\n\n`;


        if (
            current.length + block.length >
            3800
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

    const chunks =
        buildDiscordAnswerChunks(
            data.qaList
        );


    // --------------------------------------------------------
    // ОСНОВНОЙ EMBED
    // --------------------------------------------------------

    const firstChunk =
        chunks.shift() ||
        "Ответы отсутствуют.";


    const embeds = [

        {

            title:
                `📋 Пройден тест: ${data.schoolTitle}`,

            color: 0x38BDF8,

            fields: [

                {

                    name:
                        "👤 IC Никнейм",

                    value:
                        cleanDiscordText(
                            data.icName
                        ).substring(0, 1024),

                    inline: true

                },

                {

                    name:
                        "🎮 OOC / Discord",

                    value:
                        cleanDiscordText(
                            data.oocName
                        ).substring(0, 1024),

                    inline: true

                },

                {

                    name:
                        "⏱️ Время прохождения",

                    value:
                        data.timeSpent,

                    inline: true

                },

                {

                    name:
                        "⚠️ Уходов со вкладки",

                    value:
                        `${data.tabSwitches} раз(а)`,

                    inline: true

                }

            ],

            description:
                firstChunk,

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

    chunks.forEach(
        (chunk, index) => {

            embeds.push({

                title:
                    `📋 Ответы — продолжение ${index + 2}`,

                color: 0x38BDF8,

                description:
                    chunk

            });

        }
    );


    // --------------------------------------------------------
    // DISCORD МАКСИМУМ 10 EMBEDS
    // --------------------------------------------------------

    for (
        let i = 0;
        i < embeds.length;
        i += 10
    ) {

        const batch =
            embeds.slice(i, i + 10);


        const response =
            await fetch(
                DISCORD_WEBHOOK_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            username:
                                "Портал квалификации LSPD",

                            embeds:
                                batch

                        })

                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            throw new Error(
                `Discord ${response.status}: ${errorText}`
            );

        }

    }

}


// ============================================================
// СОХРАНЕНИЕ РЕЗУЛЬТАТА
// ============================================================

function saveResult(data) {

    localStorage.setItem(
        "lastQuizResult",
        JSON.stringify(data)
    );

}


// ============================================================
// ОТПРАВКА ФОРМЫ
// ============================================================

async function handleSubmit(event) {

    event.preventDefault();


    const form =
        event.target;


    if (!form) {
        return;
    }


    // --------------------------------------------------------
    // КНОПКА
    // --------------------------------------------------------

    const submitButton =
        form.querySelector(
            'button[type="submit"], input[type="submit"]'
        );


    const oldButtonText =
        submitButton
            ? submitButton.textContent
            : "";


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.textContent =
            "Отправка результатов...";

    }


    try {

        // ----------------------------------------------------
        // ШКОЛА
        // ----------------------------------------------------

        const school =
            getSchoolConfig();


        // ----------------------------------------------------
        // IC / OOC
        // ----------------------------------------------------

        const icName =
            getICName(form);


        const oocName =
            getOOCName(form);


        // ----------------------------------------------------
        // ОТВЕТЫ
        // ----------------------------------------------------

        const qaList =
            collectAnswers(form);


        // ----------------------------------------------------
        // РЕЗУЛЬТАТ
        // ----------------------------------------------------

        const result = {

            schoolKey:
                school.key,

            schoolTitle:
                school.title,

            icName:
                icName,

            oocName:
                oocName,

            timeSpent:
                getTimeSpent(),

            tabSwitches:
                tabSwitches,

            qaList:
                qaList

        };


        // ----------------------------------------------------
        // LOCAL STORAGE
        // ----------------------------------------------------

        saveResult(result);


        console.log(
            "Результат теста:",
            result
        );


        // ----------------------------------------------------
        // DISCORD
        // ----------------------------------------------------

        await sendToDiscord(
            result
        );


        // ----------------------------------------------------
        // РЕЗУЛЬТАТЫ
        // ----------------------------------------------------

        window.location.href =
            "results.html";


    } catch (error) {

        console.error(
            "Ошибка отправки:",
            error
        );


        alert(
            "❌ Не удалось отправить результаты.\n\n" +
            "Причина:\n" +
            error.message
        );


        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                oldButtonText ||
                "Завершить тестирование";

        }

    }

}


// ============================================================
// ЗАПУСК
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            getQuizForm();


        if (!form) {

            console.error(
                "❌ Форма тестирования не найдена."
            );

            return;

        }


        console.log(
            "✅ Quiz Handler подключён."
        );


        const school =
            getSchoolConfig();


        console.log(
            "🏫 Школа:",
            school.title
        );


        form.addEventListener(
            "submit",
            handleSubmit
        );

    }
);
