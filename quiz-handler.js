// ============================================================
// LSPD QUIZ HANDLER
// ЕДИНЫЙ ОБРАБОТЧИК ДЛЯ ВСЕХ ШКОЛ
// ============================================================


// ============================================================
// WEBHOOK
// ============================================================
//
// ОСТАВЬ ЗДЕСЬ СВОЙ ТЕКУЩИЙ WEBHOOK ИЗ СТАРОГО ФАЙЛА.
//
// Пример:
// const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/...";
//
// Не меняй webhook на другой.
// ============================================================

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";


// ============================================================
// ГЛОБАЛЬНЫЕ ДАННЫЕ
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

const pageConfigs = {

    // --------------------------------------------------------
    // FTO
    // --------------------------------------------------------

    "fto.html": {
        key: "FTO",
        title: "Школа полевой подготовки (FTO)"
    },


    // --------------------------------------------------------
    // SUPERVISOR
    // --------------------------------------------------------

    "supervisorschool.html": {
        key: "SUPERVISOR",
        title: "Школа супервайзеров"
    },

    "supervisor.html": {
        key: "SUPERVISOR",
        title: "Школа супервайзеров"
    },


    // --------------------------------------------------------
    // METRO
    // --------------------------------------------------------

    "metroofficerschool.html": {
        key: "METRO",
        title: "Metro Officer School"
    },

    "metro.html": {
        key: "METRO",
        title: "Metro Officer School"
    },


    // --------------------------------------------------------
    // SWAT
    // --------------------------------------------------------

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

function getPageConfig() {

    const pageName =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    return pageConfigs[pageName] || {

        key: "TEST",

        title: "Квалификационный тест"

    };

}


// ============================================================
// ПОИСК ФОРМЫ
// ============================================================

function getQuizForm() {

    const possibleIds = [

        "quizForm",

        "ftos-test-form",

        "metro-test-form",

        "supervisor-test-form",

        "swat-test-form",

        "quiz-form"

    ];


    // Сначала пытаемся найти форму по ID

    for (const id of possibleIds) {

        const form =
            document.getElementById(id);


        if (form) {

            return form;

        }

    }


    // Если ID нет — берём первую форму

    return document.querySelector("form");

}


// ============================================================
// ПОЛУЧЕНИЕ IC НИКНЕЙМА
// ============================================================

function getIcName(form) {

    const selectors = [

        "#ic-name",

        "#ic_name",

        "#icName",

        'input[name="ic-name"]',

        'input[name="ic_name"]',

        'input[name="icName"]'

    ];


    for (const selector of selectors) {

        const element =
            form.querySelector(selector);


        if (element) {

            return String(
                element.value || ""
            ).trim();

        }

    }


    return "Не указан";

}


// ============================================================
// ПОЛУЧЕНИЕ OOC НИКНЕЙМА
// ============================================================

function getOocName(form) {

    const selectors = [

        "#ooc-name",

        "#ooc_name",

        "#oocName",

        'input[name="ooc-name"]',

        'input[name="ooc_name"]',

        'input[name="oocName"]'

    ];


    for (const selector of selectors) {

        const element =
            form.querySelector(selector);


        if (element) {

            return String(
                element.value || ""
            ).trim();

        }

    }


    return "Не указан";

}


// ============================================================
// ОЧИСТКА ТЕКСТА
// ============================================================

function cleanText(value) {

    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();

}


// ============================================================
// ЗАЩИТА DISCORD MENTION
// ============================================================

function cleanDiscordText(value) {

    return String(value || "Нет ответа")
        .replace(
            /@everyone/gi,
            "@\u200beveryone"
        )
        .replace(
            /@here/gi,
            "@\u200bhere"
        )
        .trim();

}


// ============================================================
// ПОЛУЧЕНИЕ LABEL ДЛЯ RADIO
// ============================================================

function getRadioText(radio) {

    if (!radio) {

        return "Нет ответа";

    }


    // --------------------------------------------------------
    // Вариант:
    //
    // <label>
    //     <input type="radio">
    //     А) Ответ
    // </label>
    // --------------------------------------------------------

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
            cleanText(
                clone.innerText
            );


        if (text) {

            return text;

        }

    }


    // --------------------------------------------------------
    // Вариант:
    //
    // <input id="q1a">
    // <label for="q1a">А) Ответ</label>
    // --------------------------------------------------------

    if (radio.id) {

        const label =
            document.querySelector(
                `label[for="${CSS.escape(radio.id)}"]`
            );


        if (label) {

            const text =
                cleanText(
                    label.innerText
                );


            if (text) {

                return text;

            }

        }

    }


    // --------------------------------------------------------
    // Если label нет
    // --------------------------------------------------------

    if (radio.value) {

        return cleanText(
            radio.value
        );

    }


    return "Выбран вариант";

}


// ============================================================
// ПОЛУЧЕНИЕ КАРТОЧКИ ВОПРОСА
// ============================================================

function getQuestionContainer(field) {

    if (!field) {

        return null;

    }


    const selectors = [

        ".question-card",

        ".qa-group",

        ".question",

        ".form-group",

        "fieldset"

    ];


    for (const selector of selectors) {

        const container =
            field.closest(selector);


        if (container) {

            return container;

        }

    }


    return field.parentElement;

}


// ============================================================
// ПОЛУЧЕНИЕ ТЕКСТА ВОПРОСА
// ============================================================

function getQuestionText(
    container,
    fallbackNumber
) {

    if (!container) {

        return `Вопрос ${fallbackNumber}`;

    }


    const selectors = [

        ".question-text",

        ".question-title",

        ".question",

        "legend",

        "h3",

        "h2"

    ];


    for (const selector of selectors) {

        const element =
            container.querySelector(selector);


        if (!element) {

            continue;

        }


        const text =
            cleanText(
                element.innerText
            );


        if (text) {

            return text;

        }

    }


    return `Вопрос ${fallbackNumber}`;

}


// ============================================================
// РАЗБОР ОДНОГО RADIO-ВОПРОСА
// ============================================================

function readRadioQuestion(
    radio,
    number
) {

    const container =
        getQuestionContainer(radio);


    const title =
        getQuestionText(
            container,
            number
        );


    const answer =
        radio && radio.checked
            ? getRadioText(radio)
            : "Нет ответа";


    return {

        number,

        title,

        answer

    };

}


// ============================================================
// ПОИСК ВСЕХ RADIO-ВОПРОСОВ
// ============================================================
//
// ВАЖНО:
//
// Здесь мы НЕ используем q1/q2/q3 как основной порядок.
//
// Порядок берётся из HTML.
//
// Поэтому:
//
// FTO 1,2,3,4...
// Supervisor 1,2,3...
// Metro 1,2,3...
// SWAT 1,2,3...
//
// будут отображаться именно в таком порядке.
//
// ============================================================

function collectRadioQuestions(form) {

    const result = [];

    const radios =
        Array.from(
            form.querySelectorAll(
                'input[type="radio"]'
            )
        );


    const processedNames =
        new Set();


    let questionNumber = 0;


    for (const radio of radios) {

        const name =
            radio.getAttribute("name");


        // ----------------------------------------------------
        // Если radio имеет name q1/q2/q3
        // ----------------------------------------------------

        if (
            name &&
            /^q\d+$/i.test(name)
        ) {

            // Уже обработанная группа

            if (
                processedNames.has(name)
            ) {

                continue;

            }


            processedNames.add(name);


            const group =
                Array.from(
                    form.querySelectorAll(
                        `input[type="radio"][name="${CSS.escape(name)}"]`
                    )
                );


            const checked =
                group.find(
                    item => item.checked
                );


            const field =
                checked || group[0];


            questionNumber++;


            result.push(
                readRadioQuestion(
                    checked || null,
                    questionNumber
                )
            );


            // Если radio не выбран,
            // readRadioQuestion получает null.
            //
            // Но название вопроса нам всё равно
            // нужно взять с первого radio.

            if (!checked) {

                const container =
                    getQuestionContainer(
                        field
                    );


                result[result.length - 1].title =
                    getQuestionText(
                        container,
                        questionNumber
                    );

            }


            continue;

        }


        // ----------------------------------------------------
        // Radio без name q1/q2...
        // ----------------------------------------------------
        //
        // Используем карточку вопроса.
        // Это нужно для совместимости со старыми тестами.
        // ----------------------------------------------------

        const container =
            getQuestionContainer(radio);


        if (!container) {

            continue;

        }


        const alreadyAdded =
            result.some(
                item =>
                    item.container === container
            );


        if (alreadyAdded) {

            continue;

        }


        const cardRadios =
            Array.from(
                container.querySelectorAll(
                    'input[type="radio"]'
                )
            );


        const checked =
            cardRadios.find(
                item => item.checked
            );


        questionNumber++;


        result.push({

            number: questionNumber,

            title:
                getQuestionText(
                    container,
                    questionNumber
                ),

            answer:
                checked
                    ? getRadioText(checked)
                    : "Нет ответа"

        });

    }


    return result;

}


// ============================================================
// СБОР TEXTAREA
// ============================================================
//
// Это именно развернутые ответы.
//
// Для FTO / Supervisor / Metro / SWAT.
// ============================================================

function collectTextareaQuestions(
    form,
    startNumber
) {

    const result = [];


    const textareas =
        Array.from(
            form.querySelectorAll(
                "textarea"
            )
        );


    let number =
        startNumber;


    for (const textarea of textareas) {

        const container =
            getQuestionContainer(
                textarea
            );


        if (!container) {

            continue;

        }


        // ----------------------------------------------------
        // Не считаем textarea, если это явно не вопрос
        // ----------------------------------------------------

        const title =
            getQuestionText(
                container,
                number
            );


        const answer =
            cleanText(
                textarea.value
            );


        result.push({

            number,

            title,

            answer:
                answer || "Нет ответа"

        });


        number++;

    }


    return result;

}


// ============================================================
// СБОР SELECT
// ============================================================

function collectSelectQuestions(
    form,
    startNumber
) {

    const result = [];


    const selects =
        Array.from(
            form.querySelectorAll(
                "select"
            )
        );


    let number =
        startNumber;


    for (const select of selects) {

        const container =
            getQuestionContainer(
                select
            );


        if (!container) {

            continue;

        }


        const option =
            select.options[
                select.selectedIndex
            ];


        const answer =
            option
                ? cleanText(
                    option.innerText
                )
                : "Нет ответа";


        result.push({

            number,

            title:
                getQuestionText(
                    container,
                    number
                ),

            answer:
                answer || "Нет ответа"

        });


        number++;

    }


    return result;

}


// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ СБОРА ОТВЕТОВ
// ============================================================

function collectAnswers(form) {

    // --------------------------------------------------------
    // 1. RADIO
    // --------------------------------------------------------

    const radioResults =
        collectRadioQuestions(
            form
        );


    // --------------------------------------------------------
    // 2. TEXTAREA
    // --------------------------------------------------------

    const textareaResults =
        collectTextareaQuestions(
            form,
            radioResults.length + 1
        );


    // --------------------------------------------------------
    // 3. SELECT
    // --------------------------------------------------------

    const selectResults =
        collectSelectQuestions(
            form,
            radioResults.length +
            textareaResults.length +
            1
        );


    // --------------------------------------------------------
    // ОБЪЕДИНЯЕМ
    // --------------------------------------------------------

    const result = [

        ...radioResults,

        ...textareaResults,

        ...selectResults

    ];


    // --------------------------------------------------------
    // СОРТИРОВКА
    // --------------------------------------------------------

    result.sort(
        (a, b) =>
            a.number - b.number
    );


    // --------------------------------------------------------
    // Убираем служебный number
    // --------------------------------------------------------

    return result.map(
        item => ({

            title:
                item.title,

            answer:
                item.answer

        })
    );

}


// ============================================================
// РАЗБИВКА ОТВЕТОВ ДЛЯ DISCORD
// ============================================================
//
// Discord:
//
// description <= 4096
// одно сообщение с embed <= 6000 суммарных символов.
//
// Поэтому каждое сообщение будет иметь ОДИН embed.
//
// Никаких 10 огромных embeds в одном запросе.
// ============================================================

function splitAnswers(
    answers
) {

    const chunks = [];

    let current = "";


    for (
        let i = 0;
        i < answers.length;
        i++
    ) {

        const item =
            answers[i];


        const title =
            cleanDiscordText(
                item.title ||
                `Вопрос ${i + 1}`
            );


        const answer =
            cleanDiscordText(
                item.answer ||
                "Нет ответа"
            );


        const block =
            `**${title}**\n` +
            `Ответ: ${answer}\n\n`;


        // ----------------------------------------------------
        // Оставляем запас
        // ----------------------------------------------------

        if (
            current.length +
            block.length >
            3300
        ) {

            if (current) {

                chunks.push(
                    current
                );

            }


            current =
                block;

        } else {

            current +=
                block;

        }

    }


    if (current) {

        chunks.push(
            current
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

        const error =
            await response.text();


        throw new Error(
            `Discord ${response.status}: ${error}`
        );

    }

}


// ============================================================
// ОТПРАВКА В DISCORD
// ============================================================

async function sendToDiscord(
    data
) {

    const answerChunks =
        splitAnswers(
            data.qaList
        );


    // ========================================================
    // ПЕРВОЕ СООБЩЕНИЕ
    // ========================================================

    const firstDescription =
        answerChunks.length > 0
            ? answerChunks[0]
            : "Ответы не найдены.";


    await sendDiscordEmbed({

        title:
            `📋 Пройден тест: ${data.schoolTitle}`,

        color:
            3859608,

        fields: [

            {

                name:
                    "👤 IC Никнейм",

                value:
                    cleanDiscordText(
                        data.icName ||
                        "Не указан"
                    ).substring(
                        0,
                        1024
                    ),

                inline:
                    true

            },


            {

                name:
                    "🎮 OOC / Discord",

                value:
                    cleanDiscordText(
                        data.oocName ||
                        "Не указан"
                    ).substring(
                        0,
                        1024
                    ),

                inline:
                    true

            },


            {

                name:
                    "⏱️ Время",

                value:
                    data.timeSpent ||
                    "-",

                inline:
                    true

            },


            {

                name:
                    "⚠️ Уходов со вкладки",

                value:
                    `${data.tabSwitches || 0} раз(а)`,

                inline:
                    true

            }

        ],


        description:
            firstDescription,


        footer: {

            text:
                "LSPD Qualification Portal"

        },


        timestamp:
            new Date().toISOString()

    });


    // ========================================================
    // ОСТАЛЬНЫЕ СООБЩЕНИЯ
    // ========================================================

    for (
        let i = 1;
        i < answerChunks.length;
        i++
    ) {

        await sendDiscordEmbed({

            title:
                `📋 ${data.schoolTitle} — ответы ${i + 1}`,

            color:
                3859608,

            description:
                answerChunks[i],

            footer: {

                text:
                    "LSPD Qualification Portal"

            }

        });


        // Небольшая задержка,
        // чтобы не словить Discord rate limit

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    250
                )
        );

    }

}


// ============================================================
// ОТПРАВКА РЕЗУЛЬТАТА
// ============================================================

async function processQuizSubmission(
    event,
    schoolKey,
    schoolTitle
) {

    event.preventDefault();


    const form =
        event.target;


    // --------------------------------------------------------
    // КНОПКА
    // --------------------------------------------------------

    const submitBtn =
        form.querySelector(
            "button[type='submit'], input[type='submit']"
        );


    if (submitBtn) {

        submitBtn.disabled =
            true;


        if (
            submitBtn.tagName
            .toLowerCase() ===
            "input"
        ) {

            submitBtn.value =
                "Отправка результатов...";

        } else {

            submitBtn.innerText =
                "Отправка результатов...";

        }

    }


    try {

        // ====================================================
        // IC
        // ====================================================

        const icName =
            getIcName(
                form
            );


        // ====================================================
        // OOC
        // ====================================================

        const oocName =
            getOocName(
                form
            );


        // ====================================================
        // ВРЕМЯ
        // ====================================================

        const elapsedSeconds =
            Math.floor(
                (
                    Date.now() -
                    startTime
                ) / 1000
            );


        const minutes =
            Math.floor(
                elapsedSeconds / 60
            );


        const seconds =
            elapsedSeconds % 60;


        const timeSpent =
            `${minutes} мин. ${seconds} сек.`;


        // ====================================================
        // ОТВЕТЫ
        // ====================================================

        const qaList =
            collectAnswers(
                form
            );


        // ====================================================
        // DEBUG В КОНСОЛЬ
        // ====================================================

        console.log(
            "========================================"
        );

        console.log(
            "ШКОЛА:",
            schoolTitle
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
            "ВОПРОСОВ СОБРАНО:",
            qaList.length
        );

        console.table(
            qaList
        );

        console.log(
            "========================================"
        );


        // ====================================================
        // ФОРМИРУЕМ РЕЗУЛЬТАТ
        // ====================================================

        const result = {

            schoolKey:

                schoolKey,


            schoolTitle:

                schoolTitle,


            icName:

                icName ||
                "Не указан",


            oocName:

                oocName ||
                "Не указан",


            timeSpent:


                timeSpent,


            tabSwitches:


                tabSwitches,


            qaList:


                qaList

        };


        // ====================================================
        // СОХРАНЯЕМ В LOCAL STORAGE
        // ====================================================

        localStorage.setItem(

            "lastQuizResult",

            JSON.stringify(
                result
            )

        );


        // ====================================================
        // ОТПРАВЛЯЕМ DISCORD
        // ====================================================

        await sendToDiscord(
            result
        );


        // ====================================================
        // ПЕРЕХОД НА РЕЗУЛЬТАТЫ
        // ====================================================

        window.location.href =
            "results.html";

    }


    catch (error) {

        console.error(
            "Ошибка отправки результатов:",
            error
        );


        alert(

            "❌ Не удалось отправить результаты.\n\n" +

            error.message

        );


        // ----------------------------------------------------
        // Возвращаем кнопку
        // ----------------------------------------------------

        if (submitBtn) {

            submitBtn.disabled =
                false;


            if (
                submitBtn.tagName
                    .toLowerCase() ===
                "input"
            ) {

                submitBtn.value =
                    "Завершить тестирование и отправить ответы";

            } else {

                submitBtn.innerText =
                    "Завершить тестирование и отправить ответы";

            }

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


        // ----------------------------------------------------
        // ФОРМА НЕ НАЙДЕНА
        // ----------------------------------------------------

        if (!form) {

            console.error(
                "❌ Quiz Handler: форма теста не найдена."
            );

            return;

        }


        // ----------------------------------------------------
        // КОНФИГ
        // ----------------------------------------------------

        const config =
            getPageConfig();


        console.log(
            "✅ Quiz Handler запущен"
        );


        console.log(
            "Школа:",
            config.title
        );


        console.log(
            "Ключ:",
            config.key
        );


        // ----------------------------------------------------
        // SUBMIT
        // ----------------------------------------------------

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
