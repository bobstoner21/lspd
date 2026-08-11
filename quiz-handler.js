// ============================================================
// LSPD QUIZ HANDLER
// Полная версия
// ============================================================

const DISCORD_WEBHOOK_URL =
    "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";


// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================

let tabSwitches = 0;
const startTime = Date.now();


// ============================================================
// ОТСЛЕЖИВАНИЕ УХОДОВ СО ВКЛАДКИ
// ============================================================

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {
        tabSwitches++;
    }

});


// ============================================================
// КОНФИГУРАЦИЯ ШКОЛ
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
// ОПРЕДЕЛЕНИЕ ТЕКУЩЕЙ ШКОЛЫ
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
// ПОИСК ФОРМЫ
// ============================================================

function getQuizForm() {

    return (
        document.getElementById("ftos-test-form") ||
        document.getElementById("quizForm") ||
        document.querySelector("form")
    );

}


// ============================================================
// ПОЛУЧЕНИЕ ЗНАЧЕНИЯ INPUT
// ============================================================

function getInputValue(form, selectors, names) {

    // Сначала ищем по ID

    for (const selector of selectors) {

        const element =
            form.querySelector(selector);

        if (
            element &&
            typeof element.value === "string" &&
            element.value.trim()
        ) {

            return element.value.trim();

        }

    }


    // Затем по name

    for (const name of names) {

        const element =
            form.querySelector(
                `[name="${name}"]`
            );

        if (
            element &&
            typeof element.value === "string" &&
            element.value.trim()
        ) {

            return element.value.trim();

        }

    }


    return "Не указан";

}


// ============================================================
// IC НИКНЕЙМ
// ============================================================

function getICName(form) {

    return getInputValue(

        form,

        [
            "#ic-name",
            "#ic_name",
            "#icName"
        ],

        [
            "ic_name",
            "icName",
            "ic",
            "nickname"
        ]

    );

}


// ============================================================
// OOC / DISCORD
// ============================================================

function getOOCName(form) {

    return getInputValue(

        form,

        [
            "#ooc-name",
            "#ooc_name",
            "#oocName"
        ],

        [
            "ooc_name",
            "oocName",
            "ooc",
            "discord",
            "discord_name"
        ]

    );

}


// ============================================================
// ЗАЩИТА DISCORD MENTION
// ============================================================

function cleanDiscordText(value) {

    return String(
        value ?? "Нет ответа"
    )
        .replace(
            /@everyone/gi,
            "@\u200Beveryone"
        )
        .replace(
            /@here/gi,
            "@\u200Bhere"
        )
        .trim();

}


// ============================================================
// ЭКРАНИРОВАНИЕ HTML
// ============================================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// ПОЛУЧЕНИЕ ТЕКСТА RADIO
// ============================================================

function getRadioText(radio) {

    if (!radio) {
        return "Нет ответа";
    }


    // Если input находится внутри label

    const parentLabel =
        radio.closest("label");

    if (parentLabel) {

        const clone =
            parentLabel.cloneNode(true);

        const input =
            clone.querySelector("input");

        if (input) {
            input.remove();
        }

        const text =
            clone.textContent
                .replace(/\s+/g, " ")
                .trim();

        if (text) {
            return text;
        }

    }


    // Если используется label[for]

    if (radio.id) {

        const label =
            document.querySelector(
                `label[for="${CSS.escape(radio.id)}"]`
            );

        if (label) {

            const clone =
                label.cloneNode(true);

            const input =
                clone.querySelector("input");

            if (input) {
                input.remove();
            }

            const text =
                clone.textContent
                    .replace(/\s+/g, " ")
                    .trim();

            if (text) {
                return text;
            }

        }

    }


    return radio.value ||
        "Выбран вариант";

}


// ============================================================
// ПОИСК КАРТОЧКИ ВОПРОСА
// ============================================================

function getQuestionCard(element) {

    return (

        element.closest(".card") ||

        element.closest(".question-card") ||

        element.closest(".qa-group") ||

        element.closest("fieldset") ||

        element.closest(".question") ||

        element.parentElement

    );

}


// ============================================================
// ПОЛУЧЕНИЕ ЗАГОЛОВКА
// ============================================================

function getQuestionTitle(
    card,
    defaultTitle
) {

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
                .trim()
                .replace(
                    /\s*\*+\s*$/,
                    ""
                );


        if (text) {
            return text;
        }

    }


    return defaultTitle;

}


// ============================================================
// ПОЛУЧЕНИЕ ОТВЕТА ИЗ КАРТОЧКИ
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

        return getRadioText(
            checkedRadio
        );

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

    if (
        checkedCheckboxes.length
    ) {

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

        return (
            textarea.value.trim() ||
            "Нет ответа"
        );

    }


    // --------------------------------------------------------
    // SELECT
    // --------------------------------------------------------

    const select =
        card.querySelector("select");

    if (select) {

        const option =
            select.options[
                select.selectedIndex
            ];

        if (option) {
            return option.text.trim();
        }

    }


    // --------------------------------------------------------
    // INPUT TEXT
    // --------------------------------------------------------

    const textInput =
        card.querySelector(
            'input[type="text"]'
        );

    if (textInput) {

        return (
            textInput.value.trim() ||
            "Нет ответа"
        );

    }


    return "Нет ответа";

}


// ============================================================
// СОБОР ОДНОЙ ГРУППЫ
//
// Например:
//
// q1
// q2
// q3
//
// или:
//
// s1
// s2
// s3
//
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


    const numbers =
        new Set();


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


    // КРИТИЧЕСКИ ВАЖНО:
    // сортируем числа как числа,
    // а не как строки.
    //
    // Было:
    // q1 q10 q11 q2
    //
    // Теперь:
    // q1 q2 q3 ... q10 q11

    const sortedNumbers =
        Array.from(numbers)
            .sort(
                (a, b) => a - b
            );


    const result = [];


    sortedNumbers.forEach(number => {

        const field =
            fields.find(
                element =>
                    element.name ===
                    `${prefix}${number}`
            );


        if (!field) {
            return;
        }


        const card =
            getQuestionCard(field);


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
// ПОРЯДОК:
//
// 1. q1 → q2 → q3 → ... q22
// 2. ord1 → ord2 → ...
// 3. s1 → s2 → ...
// 4. case1 → case2 → ...
//
// ============================================================

function collectAnswers(form) {

    const result = [];


    // --------------------------------------------------------
    // ОБЫЧНЫЕ ВОПРОСЫ
    // --------------------------------------------------------

    result.push(
        ...collectGroup(
            form,
            "q",
            "Вопрос"
        )
    );


    // --------------------------------------------------------
    // ПОСЛЕДОВАТЕЛЬНОСТЬ
    // --------------------------------------------------------

    result.push(
        ...collectGroup(
            form,
            "ord",
            "Порядок действий"
        )
    );


    // --------------------------------------------------------
    // СИТУАЦИИ
    // --------------------------------------------------------

    result.push(
        ...collectGroup(
            form,
            "s",
            "Ситуация"
        )
    );


    // --------------------------------------------------------
    // КЕЙСЫ
    // --------------------------------------------------------

    result.push(
        ...collectGroup(
            form,
            "case",
            "Кейс"
        )
    );


    return result;

}


// ============================================================
// ВРЕМЯ ПРОХОЖДЕНИЯ
// ============================================================

function getTimeSpent() {

    const seconds =
        Math.floor(
            (Date.now() - startTime) /
            1000
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        seconds % 60;


    return (
        `${minutes} мин. ` +
        `${remainingSeconds} сек.`
    );

}


// ============================================================
// РАЗБИВАЕМ ОЧЕНЬ ДЛИННЫЙ ТЕКСТ
//
// Безопасный размер — 3500 символов.
//
// Discord description допускает 4096,
// но оставляем запас.
// ============================================================

function splitLongText(
    text,
    maxLength = 3500
) {

    const result = [];


    let remaining =
        String(text || "");


    while (
        remaining.length >
        maxLength
    ) {

        let cut =
            remaining.lastIndexOf(
                "\n",
                maxLength
            );


        if (
            cut < 1000
        ) {

            cut =
                remaining.lastIndexOf(
                    " ",
                    maxLength
                );

        }


        if (
            cut < 1000
        ) {

            cut =
                maxLength;

        }


        result.push(
            remaining
                .slice(0, cut)
                .trim()
        );


        remaining =
            remaining
                .slice(cut)
                .trim();

    }


    if (remaining) {

        result.push(
            remaining
        );

    }


    return result;

}


// ============================================================
// ФОРМИРУЕМ БЛОКИ ОТВЕТОВ
//
// Каждый блок <= 3500 символов.
// ============================================================

function buildDiscordAnswerChunks(
    answers
) {

    const chunks = [];

    let current = "";


    answers.forEach(item => {

        const title =
            `**${cleanDiscordText(
                item.title
            )}**`;


        const answer =
            `Ответ: ${cleanDiscordText(
                item.answer
            )}`;


        const block =
            `${title}\n${answer}\n\n`;


        // ----------------------------------------------------
        // Если один ответ огромный
        // ----------------------------------------------------

        if (
            block.length >
            3500
        ) {

            if (current.trim()) {

                chunks.push(
                    current.trim()
                );

                current = "";

            }


            const pieces =
                splitLongText(
                    block,
                    3500
                );


            pieces.forEach(
                piece =>
                    chunks.push(piece)
            );


            return;

        }


        // ----------------------------------------------------
        // Если следующий ответ не помещается
        // ----------------------------------------------------

        if (
            current.length +
            block.length >
            3500
        ) {

            if (current.trim()) {

                chunks.push(
                    current.trim()
                );

            }


            current =
                block;

        } else {

            current +=
                block;

        }

    });


    if (current.trim()) {

        chunks.push(
            current.trim()
        );

    }


    return chunks;

}


// ============================================================
// ОТПРАВКА ОДНОГО DISCORD EMBED
// ============================================================

async function sendDiscordEmbed(
    embed
) {

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

                        embeds: [
                            embed
                        ]

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


// ============================================================
// ОТПРАВКА ВСЕГО РЕЗУЛЬТАТА В DISCORD
//
// ВАЖНО:
//
// 1 сообщение = информация о кандидате
//
// затем:
//
// 1 сообщение = часть ответов
// 1 сообщение = часть ответов
// 1 сообщение = часть ответов
//
// и т.д.
//
// Таким образом большой textarea больше не ломает отправку.
// ============================================================

async function sendToDiscord(data) {


    // ========================================================
    // СООБЩЕНИЕ №1
    // ИНФОРМАЦИЯ О КАНДИДАТЕ
    // ========================================================

    await sendDiscordEmbed({

        title:
            `📋 Пройден тест: ${cleanDiscordText(
                data.schoolTitle
            )}`,

        color:
            0x38BDF8,

        fields: [

            {
                name:
                    "👤 IC Никнейм",

                value:
                    cleanDiscordText(
                        data.icName
                    ).slice(0, 1024),

                inline:
                    true
            },


            {
                name:
                    "🎮 OOC / Discord",

                value:
                    cleanDiscordText(
                        data.oocName
                    ).slice(0, 1024),

                inline:
                    true
            },


            {
                name:
                    "⏱️ Время",

                value:
                    String(
                        data.timeSpent
                    ),

                inline:
                    true
            },


            {
                name:
                    "⚠️ Уходов со вкладки",

                value:
                    `${data.tabSwitches} раз(а)`,

                inline:
                    true
            }

        ],

        footer: {

            text:
                "LSPD Qualification Portal"

        },

        timestamp:
            new Date().toISOString()

    });


    // ========================================================
    // ОТВЕТЫ
    // ========================================================

    const chunks =
        buildDiscordAnswerChunks(
            data.qaList
        );


    if (
        chunks.length === 0
    ) {

        await sendDiscordEmbed({

            title:
                "📝 Ответы кандидата",

            color:
                0x38BDF8,

            description:
                "Ответы не найдены."

        });


        return;

    }


    // ========================================================
    // ОТПРАВЛЯЕМ КАЖДУЮ ЧАСТЬ
    // ОТДЕЛЬНЫМ DISCORD СООБЩЕНИЕМ
    // ========================================================

    for (
        let i = 0;
        i < chunks.length;
        i++
    ) {

        await sendDiscordEmbed({

            title:
                `📝 Ответы кандидата — часть ${i + 1}/${chunks.length}`,

            color:
                0x38BDF8,

            description:
                chunks[i],

            footer: {

                text:
                    "LSPD Qualification Portal"

            }

        });


        // ----------------------------------------------------
        // Небольшая задержка.
        //
        // Это снижает вероятность Discord rate limit,
        // если ответов очень много.
        // ----------------------------------------------------

        if (
            i <
            chunks.length - 1
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        400
                    )
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
// ОБРАБОТКА SUBMIT
// ============================================================

async function handleSubmit(
    event
) {

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


    const originalButtonText =
        submitButton
            ? submitButton.textContent
            : "";


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Отправка результатов...";

    }


    try {


        // ====================================================
        // ШКОЛА
        // ====================================================

        const school =
            getSchoolConfig();


        // ====================================================
        // IC / OOC
        // ====================================================

        const icName =
            getICName(form);


        const oocName =
            getOOCName(form);


        // ====================================================
        // ОТВЕТЫ
        // ====================================================

        const qaList =
            collectAnswers(form);


        // ====================================================
        // ВРЕМЯ
        // ====================================================

        const timeSpent =
            getTimeSpent();


        // ====================================================
        // ФИНАЛЬНЫЙ ОБЪЕКТ
        // ====================================================

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
                timeSpent,

            tabSwitches:
                tabSwitches,

            qaList:
                qaList

        };


        // ====================================================
        // СНАЧАЛА СОХРАНЯЕМ
        //
        // Даже если Discord временно недоступен,
        // данные уже будут сохранены для results.html.
        // ====================================================

        saveResult(result);


        console.log(
            "================================"
        );

        console.log(
            "РЕЗУЛЬТАТ ТЕСТА"
        );

        console.log(
            "IC:",
            icName
        );

        console.log(
            "OOC:",
            oocName
        );

        console.log(
            "Школа:",
            school.title
        );

        console.log(
            "Вопросов:",
            qaList.length
        );

        console.log(
            qaList
        );

        console.log(
            "================================"
        );


        // ====================================================
        // ОТПРАВКА В DISCORD
        // ====================================================

        await sendToDiscord(
            result
        );


        // ====================================================
        // ПЕРЕХОД К РЕЗУЛЬТАТАМ
        // ====================================================

        window.location.href =
            "results.html";


    } catch (error) {

        console.error(
            "Ошибка отправки результатов:",
            error
        );


        alert(
            "❌ Не удалось отправить результаты.\n\n" +
            "Причина:\n" +
            error.message
        );


        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                originalButtonText ||
                "Завершить тестирование";

        }

    }

}


// ============================================================
// ИНИЦИАЛИЗАЦИЯ
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


        const school =
            getSchoolConfig();


        console.log(
            "================================"
        );

        console.log(
            "✅ QUIZ HANDLER ЗАПУЩЕН"
        );

        console.log(
            "🏫 Школа:",
            school.title
        );

        console.log(
            "================================"
        );


        form.addEventListener(
            "submit",
            handleSubmit
        );

    }
);
