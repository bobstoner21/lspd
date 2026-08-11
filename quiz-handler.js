// ============================================================
// LSPD QUIZ HANDLER
// Версия: универсальная для FTO / Supervisor / Metro / SWAT
// ============================================================

const DISCORD_WEBHOOK_URL =
    "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";


// ============================================================
// ГЛОБАЛЬНЫЕ ДАННЫЕ
// ============================================================

let tabSwitches = 0;
const startTime = Date.now();


// ============================================================
// ОТСЛЕЖИВАНИЕ ПЕРЕКЛЮЧЕНИЙ ВКЛАДОК
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

    "metroofficerschool.html": {
        key: "METRO",
        title: "METRO OFFICER SCHOOL"
    },

    "swatschool.html": {
        key: "SWAT",
        title: "Тактическая школа SWAT"
    },

    // Старые названия файлов, если где-то ещё используются

    "supervisor.html": {
        key: "SUPERVISOR",
        title: "Школа супервайзеров"
    },

    "metro.html": {
        key: "METRO",
        title: "METRO OFFICER SCHOOL"
    },

    "swat.html": {
        key: "SWAT",
        title: "Тактическая школа SWAT"
    }
};


// ============================================================
// ОПРЕДЕЛЯЕМ ТЕКУЩУЮ СТРАНИЦУ
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
        "ftos-test-form",
        "quiz-form",
        "test-form"
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
// ПОЛУЧЕНИЕ IC НИКНЕЙМА
// ============================================================

function getIcName(form) {

    const selectors = [
        "#ic-name",
        "#ic_name",
        "#icName",
        "input[name='ic-name']",
        "input[name='ic_name']",
        "input[name='icName']",
        "input[name='ic']"
    ];

    for (const selector of selectors) {

        const element =
            form.querySelector(selector);

        if (element) {

            const value =
                String(element.value || "").trim();

            if (value) {
                return value;
            }
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
        "input[name='ooc-name']",
        "input[name='ooc_name']",
        "input[name='oocName']",
        "input[name='ooc']",
        "input[name='discord']"
    ];

    for (const selector of selectors) {

        const element =
            form.querySelector(selector);

        if (element) {

            const value =
                String(element.value || "").trim();

            if (value) {
                return value;
            }
        }
    }

    return "Не указан";
}


// ============================================================
// ЭКРАНИРОВАНИЕ DISCORD
// ============================================================

function cleanDiscordText(text) {

    return String(text ?? "")
        .replace(/@everyone/gi, "@\u200beveryone")
        .replace(/@here/gi, "@\u200bhere")
        .trim();
}


// ============================================================
// ПОЛУЧЕНИЕ ТЕКСТА ВОПРОСА
// ============================================================

function getQuestionText(element, fallbackIndex) {

    // Сначала ищем ближайшую карточку вопроса

    const container =
        element.closest(
            ".question-card, .qa-group, .question, .form-group, fieldset"
        );

    if (container) {

        const selectors = [
            ".question-text",
            ".question-title",
            ".question",
            "h3",
            "h4",
            "legend"
        ];

        for (const selector of selectors) {

            const title =
                container.querySelector(selector);

            if (title) {

                const text =
                    title.innerText
                        .replace(/\s+/g, " ")
                        .trim();

                if (text) {
                    return text;
                }
            }
        }
    }


    // Если карточки нет — ищем label/question выше

    let current = element.parentElement;

    for (let i = 0; i < 5 && current; i++) {

        const possibleTitle =
            current.querySelector(
                ".question-text, .question-title, h3, h4, legend"
            );

        if (possibleTitle) {

            const text =
                possibleTitle.innerText
                    .replace(/\s+/g, " ")
                    .trim();

            if (text) {
                return text;
            }
        }

        current = current.parentElement;
    }


    return `Вопрос ${fallbackIndex}`;
}


// ============================================================
// ПОЛУЧЕНИЕ ТЕКСТА ВЫБРАННОГО RADIO
// ============================================================

function getRadioLabel(radio) {

    if (!radio) {
        return "Нет ответа";
    }


    // label через for="id"

    if (radio.id) {

        const label =
            document.querySelector(
                `label[for="${CSS.escape(radio.id)}"]`
            );

        if (label) {

            const text =
                label.innerText
                    .replace(/\s+/g, " ")
                    .trim();

            if (text) {
                return text;
            }
        }
    }


    // label, внутри которого находится radio

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
            clone.innerText
                .replace(/\s+/g, " ")
                .trim();

        if (text) {
            return text;
        }
    }


    // Если label вообще нет

    return String(
        radio.value || "Выбран вариант"
    ).trim();
}


// ============================================================
// ПОЛУЧЕНИЕ ТЕКСТА CHECKBOX
// ============================================================

function getCheckboxLabel(checkbox) {

    if (!checkbox) {
        return "Выбран вариант";
    }


    if (checkbox.id) {

        const label =
            document.querySelector(
                `label[for="${CSS.escape(checkbox.id)}"]`
            );

        if (label) {

            const text =
                label.innerText
                    .replace(/\s+/g, " ")
                    .trim();

            if (text) {
                return text;
            }
        }
    }


    const parentLabel =
        checkbox.closest("label");

    if (parentLabel) {

        const clone =
            parentLabel.cloneNode(true);

        const input =
            clone.querySelector("input");

        if (input) {
            input.remove();
        }

        const text =
            clone.innerText
                .replace(/\s+/g, " ")
                .trim();

        if (text) {
            return text;
        }
    }


    return String(
        checkbox.value || "Выбран вариант"
    ).trim();
}


// ============================================================
// СОРТИРОВКА RADIO ГРУПП
// ============================================================

function getRadioGroupsInOrder(form) {

    const radios =
        Array.from(
            form.querySelectorAll(
                "input[type='radio']"
            )
        );

    const groups = [];
    const groupMap = new Map();


    radios.forEach((radio) => {

        const name =
            radio.name ||
            `radio_${groups.length + 1}`;


        if (!groupMap.has(name)) {

            const group = {
                name,
                firstElement: radio,
                radios: []
            };

            groupMap.set(name, group);
            groups.push(group);
        }


        groupMap
            .get(name)
            .radios
            .push(radio);
    });


    return groups;
}


// ============================================================
// СБОР RADIO ОТВЕТОВ
// ============================================================

function collectRadioAnswers(form) {

    const results = [];

    const groups =
        getRadioGroupsInOrder(form);


    groups.forEach((group, index) => {

        const selected =
            group.radios.find(
                radio => radio.checked
            );


        const question =
            getQuestionText(
                group.firstElement,
                index + 1
            );


        let answer =
            "Нет ответа";


        if (selected) {

            answer =
                getRadioLabel(selected);
        }


        results.push({
            title: question,
            answer,
            type: "radio"
        });
    });


    return results;
}


// ============================================================
// СБОР TEXTAREA
// ============================================================

function collectTextareas(form) {

    const results = [];


    const textareas =
        Array.from(
            form.querySelectorAll("textarea")
        );


    textareas.forEach((textarea, index) => {

        const question =
            getQuestionText(
                textarea,
                index + 1
            );


        const answer =
            String(
                textarea.value || ""
            ).trim();


        results.push({
            title: question,
            answer: answer || "Нет ответа",
            type: "textarea"
        });
    });


    return results;
}


// ============================================================
// СБОР SELECT
// ============================================================

function collectSelects(form) {

    const results = [];


    const selects =
        Array.from(
            form.querySelectorAll("select")
        );


    selects.forEach((select, index) => {

        const question =
            getQuestionText(
                select,
                index + 1
            );


        const selectedOption =
            select.options[
                select.selectedIndex
            ];


        const answer =
            selectedOption
                ? selectedOption.text.trim()
                : "Нет ответа";


        results.push({
            title: question,
            answer,
            type: "select"
        });
    });


    return results;
}


// ============================================================
// СБОР CHECKBOX
// ============================================================

function collectCheckboxes(form) {

    const checkboxes =
        Array.from(
            form.querySelectorAll(
                "input[type='checkbox']"
            )
        );


    // Группируем по name

    const groups = [];
    const groupMap = new Map();


    checkboxes.forEach((checkbox) => {

        const name =
            checkbox.name ||
            `checkbox_${groups.length + 1}`;


        if (!groupMap.has(name)) {

            const group = {
                name,
                firstElement: checkbox,
                checkboxes: []
            };

            groupMap.set(name, group);
            groups.push(group);
        }


        groupMap
            .get(name)
            .checkboxes
            .push(checkbox);
    });


    const results = [];


    groups.forEach((group, index) => {

        const selected =
            group.checkboxes
                .filter(
                    checkbox => checkbox.checked
                );


        const question =
            getQuestionText(
                group.firstElement,
                index + 1
            );


        let answer =
            "Нет ответа";


        if (selected.length) {

            answer =
                selected
                    .map(
                        checkbox =>
                            getCheckboxLabel(checkbox)
                    )
                    .join(", ");
        }


        results.push({
            title: question,
            answer,
            type: "checkbox"
        });
    });


    return results;
}


// ============================================================
// СОБИРАЕМ ВСЕ ОТВЕТЫ В ПРАВИЛЬНОМ ПОРЯДКЕ
// ============================================================

function collectAnswers(form) {

    const allAnswers = [];


    // --------------------------------------------------------
    // ВАЖНО:
    // Берем реальные элементы формы и сортируем ответы
    // по их положению в DOM.
    // --------------------------------------------------------

    const radioGroups =
        getRadioGroupsInOrder(form);


    const usedElements = new Set();


    // --------------------------------------------------------
    // RADIO
    // --------------------------------------------------------

    radioGroups.forEach((group, index) => {

        const selected =
            group.radios.find(
                radio => radio.checked
            );


        const question =
            getQuestionText(
                group.firstElement,
                index + 1
            );


        let answer =
            "Нет ответа";


        if (selected) {
            answer =
                getRadioLabel(selected);
        }


        allAnswers.push({
            title: question,
            answer,
            type: "radio",
            element: group.firstElement
        });


        group.radios.forEach(
            radio => usedElements.add(radio)
        );
    });


    // --------------------------------------------------------
    // TEXTAREA
    // --------------------------------------------------------

    const textareas =
        Array.from(
            form.querySelectorAll("textarea")
        );


    textareas.forEach((textarea, index) => {

        allAnswers.push({
            title: getQuestionText(
                textarea,
                index + 1
            ),

            answer:
                String(
                    textarea.value || ""
                ).trim() || "Нет ответа",

            type: "textarea",
            element: textarea
        });


        usedElements.add(textarea);
    });


    // --------------------------------------------------------
    // SELECT
    // --------------------------------------------------------

    const selects =
        Array.from(
            form.querySelectorAll("select")
        );


    selects.forEach((select, index) => {

        const option =
            select.options[
                select.selectedIndex
            ];


        allAnswers.push({
            title: getQuestionText(
                select,
                index + 1
            ),

            answer:
                option
                    ? option.text.trim()
                    : "Нет ответа",

            type: "select",
            element: select
        });


        usedElements.add(select);
    });


    // --------------------------------------------------------
    // CHECKBOX
    // --------------------------------------------------------

    const checkboxGroups =
        new Map();


    const checkboxes =
        Array.from(
            form.querySelectorAll(
                "input[type='checkbox']"
            )
        );


    checkboxes.forEach((checkbox) => {

        const name =
            checkbox.name ||
            `checkbox_${checkboxes.indexOf(checkbox)}`;


        if (!checkboxGroups.has(name)) {

            checkboxGroups.set(
                name,
                {
                    firstElement: checkbox,
                    elements: []
                }
            );
        }


        checkboxGroups
            .get(name)
            .elements
            .push(checkbox);


        usedElements.add(checkbox);
    });


    checkboxGroups.forEach(
        (group) => {

            const selected =
                group.elements.filter(
                    checkbox =>
                        checkbox.checked
                );


            allAnswers.push({

                title:
                    getQuestionText(
                        group.firstElement,
                        1
                    ),

                answer:
                    selected.length
                        ? selected
                            .map(
                                checkbox =>
                                    getCheckboxLabel(checkbox)
                            )
                            .join(", ")
                        : "Нет ответа",

                type: "checkbox",
                element: group.firstElement
            });
        }
    );


    // --------------------------------------------------------
    // СОРТИРОВКА ПО ПОЛОЖЕНИЮ В HTML
    // --------------------------------------------------------
    //
    // Благодаря этому:
    //
    // q1
    // q2
    // q3
    // textarea1
    // q4
    //
    // не превращаются в случайный порядок.
    //
    // --------------------------------------------------------

    allAnswers.sort((a, b) => {

        if (
            a.element === b.element
        ) {
            return 0;
        }


        const position =
            a.element.compareDocumentPosition(
                b.element
            );


        if (
            position &
            Node.DOCUMENT_POSITION_FOLLOWING
        ) {
            return -1;
        }


        return 1;
    });


    // --------------------------------------------------------
    // УДАЛЯЕМ ДУБЛИКАТЫ
    // --------------------------------------------------------

    const unique = [];

    const seenElements =
        new Set();


    allAnswers.forEach((item) => {

        if (!item.element) {
            return;
        }


        if (
            seenElements.has(
                item.element
            )
        ) {
            return;
        }


        seenElements.add(
            item.element
        );


        unique.push({
            title: item.title,
            answer: item.answer,
            type: item.type
        });
    });


    // --------------------------------------------------------
    // НУМЕРАЦИЯ
    // --------------------------------------------------------

    return unique.map(
        (item, index) => ({

            title:
                normalizeQuestionTitle(
                    item.title,
                    index + 1
                ),

            answer:
                item.answer || "Нет ответа",

            type:
                item.type
        })
    );
}


// ============================================================
// НОРМАЛИЗАЦИЯ НОМЕРА ВОПРОСА
// ============================================================

function normalizeQuestionTitle(
    title,
    number
) {

    let text =
        String(
            title || ""
        )
        .replace(/\s+/g, " ")
        .trim();


    if (!text) {
        return `Вопрос ${number}`;
    }


    // Если вопрос уже начинается с номера,
    // оставляем его как есть.

    if (
        /^\d+[\.\)]/.test(text)
    ) {
        return text;
    }


    // Если это "Вопрос X",
    // оставляем текст.

    if (
        /^вопрос\s+\d+/i.test(text)
    ) {
        return text;
    }


    return `${number}. ${text}`;
}


// ============================================================
// БЕЗОПАСНОЕ РАЗБИЕНИЕ ДЛИННОГО ТЕКСТА
// ============================================================
//
// Discord обычное сообщение = максимум 2000 символов.
//
// Поэтому длинные ответы режем на куски.
// Это особенно важно для развернутых ответов.
// ============================================================

function splitText(text, maxLength = 1900) {

    const result = [];

    let remaining =
        String(text || "");


    while (
        remaining.length > maxLength
    ) {

        let cut =
            remaining.lastIndexOf(
                "\n",
                maxLength
            );


        if (cut < 500) {

            cut =
                remaining.lastIndexOf(
                    " ",
                    maxLength
                );
        }


        if (cut < 1) {
            cut = maxLength;
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
        result.push(remaining);
    }


    return result;
}


// ============================================================
// ПРЕВРАЩАЕМ ОТВЕТЫ В DISCORD-СООБЩЕНИЯ
// ============================================================

function buildDiscordMessages(data) {

    const messages = [];


    // --------------------------------------------------------
    // ЗАГОЛОВОК
    // --------------------------------------------------------

    const header =
        [
            "📋 ПРОЙДЕН ТЕСТ",
            "",
            `🏫 Школа: ${cleanDiscordText(data.schoolTitle)}`,
            `👤 IC Никнейм: ${cleanDiscordText(data.icName)}`,
            `🎮 OOC / Discord: ${cleanDiscordText(data.oocName)}`,
            `⏱️ Время: ${cleanDiscordText(data.timeSpent)}`,
            `⚠️ Уходов со вкладки: ${data.tabSwitches} раз(а)`,
            "",
            "━━━━━━━━━━━━━━━━━━━━",
            "📝 ОТВЕТЫ КАНДИДАТА",
            "━━━━━━━━━━━━━━━━━━━━"
        ]
        .join("\n");


    messages.push(header);


    // --------------------------------------------------------
    // КАЖДЫЙ ОТВЕТ ОТДЕЛЬНО
    // --------------------------------------------------------

    data.qaList.forEach(
        (item, index) => {

            const title =
                cleanDiscordText(
                    item.title ||
                    `Вопрос ${index + 1}`
                );


            const answer =
                cleanDiscordText(
                    item.answer ||
                    "Нет ответа"
                );


            const prefix =
                `**${title}**\nОтвет: `;


            // Если короткий ответ помещается целиком

            if (
                prefix.length +
                answer.length <= 1900
            ) {

                messages.push(
                    prefix + answer
                );

                return;
            }


            // ------------------------------------------------
            // ДЛИННЫЙ ОТВЕТ
            // ------------------------------------------------

            const parts =
                splitText(
                    answer,
                    1800
                );


            parts.forEach(
                (part, partIndex) => {

                    if (partIndex === 0) {

                        messages.push(
                            `${prefix}${part}`
                        );

                    } else {

                        messages.push(
                            `**${title} — продолжение**\n${part}`
                        );
                    }
                }
            );
        }
    );


    // --------------------------------------------------------
    // ФУТЕР
    // --------------------------------------------------------

    messages.push(
        [
            "━━━━━━━━━━━━━━━━━━━━",
            "LSPD Qualification Portal",
            `ID теста: ${cleanDiscordText(data.schoolKey)}`
        ].join("\n")
    );


    return messages;
}


// ============================================================
// ОТПРАВКА ОДНОГО DISCORD СООБЩЕНИЯ
// ============================================================

async function sendDiscordMessage(
    content
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

                body: JSON.stringify({
                    username:
                        "Портал квалификации LSPD",

                    content:
                        content,

                    allowed_mentions: {
                        parse: []
                    }
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
// ОТПРАВКА РЕЗУЛЬТАТОВ В DISCORD
// ============================================================

async function sendToDiscord(data) {

    const messages =
        buildDiscordMessages(data);


    if (!messages.length) {

        await sendDiscordMessage(
            "📋 Тест завершён, но ответов не найдено."
        );

        return;
    }


    // --------------------------------------------------------
    // Отправляем сообщения последовательно.
    //
    // Не отправляем огромный Embed.
    // Каждый message <= 1900 символов.
    // --------------------------------------------------------

    for (
        let i = 0;
        i < messages.length;
        i++
    ) {

        await sendDiscordMessage(
            messages[i]
        );


        // Небольшая задержка между сообщениями.
        // Помогает не упереться в rate limit Discord.

        if (
            i <
            messages.length - 1
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        350
                    )
            );
        }
    }
}


// ============================================================
// ПРОВЕРКА FORM
// ============================================================

function validateQuizForm(form) {

    if (!form) {

        throw new Error(
            "Форма тестирования не найдена."
        );
    }


    // HTML required сам проверяет radio/textareas.
    // Здесь дополнительно проверяем IC/OOC.

    const icName =
        getIcName(form);


    const oocName =
        getOocName(form);


    if (
        !icName ||
        icName === "Не указан"
    ) {

        throw new Error(
            "Не указан IC никнейм."
        );
    }


    if (
        !oocName ||
        oocName === "Не указан"
    ) {

        throw new Error(
            "Не указан OOC / Discord никнейм."
        );
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
        // ПРОВЕРКА
        // ----------------------------------------------------

        validateQuizForm(form);


        // ----------------------------------------------------
        // ДАННЫЕ КАНДИДАТА
        // ----------------------------------------------------

        const icName =
            getIcName(form);


        const oocName =
            getOocName(form);


        // ----------------------------------------------------
        // ВРЕМЯ
        // ----------------------------------------------------

        const seconds =
            Math.max(
                0,
                Math.floor(
                    (Date.now() - startTime) /
                    1000
                )
            );


        const timeSpent =
            `${Math.floor(seconds / 60)} мин. ` +
            `${seconds % 60} сек.`;


        // ----------------------------------------------------
        // ОТВЕТЫ
        // ----------------------------------------------------

        const qaList =
            collectAnswers(form);


        console.log(
            "================================"
        );

        console.log(
            "QUIZ HANDLER"
        );

        console.log(
            "Школа:",
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
            "Ответов:",
            qaList.length
        );

        console.log(
            "Ответы:",
            qaList
        );

        console.log(
            "================================"
        );


        // ----------------------------------------------------
        // РЕЗУЛЬТАТ
        // ----------------------------------------------------

        const result = {

            schoolKey:
                schoolKey,

            schoolTitle:
                schoolTitle,

            icName:
                icName || "Не указан",

            oocName:
                oocName || "Не указан",

            timeSpent:
                timeSpent,

            tabSwitches:
                tabSwitches,

            qaList:
                qaList,

            completedAt:
                new Date().toISOString()
        };


        // ----------------------------------------------------
        // LOCAL STORAGE
        // ----------------------------------------------------
        //
        // results.html берет данные именно отсюда.
        // Поэтому сначала сохраняем их.
        // ----------------------------------------------------

        localStorage.setItem(
            "lastQuizResult",
            JSON.stringify(result)
        );


        // ----------------------------------------------------
        // DISCORD
        // ----------------------------------------------------

        await sendToDiscord(
            result
        );


        // ----------------------------------------------------
        // УСПЕШНО
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
// ЗАПУСК
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            getQuizForm();


        if (!form) {

            console.error(
                "❌ Quiz Handler: форма теста не найдена."
            );

            return;
        }


        const config =
            getPageConfig();


        console.log(
            "================================"
        );

        console.log(
            "✅ Quiz Handler запущен"
        );

        console.log(
            "Страница:",
            window.location.pathname
        );

        console.log(
            "Школа:",
            config.title
        );

        console.log(
            "Ключ:",
            config.key
        );

        console.log(
            "================================"
        );


        // ----------------------------------------------------
        // Защита от двойного submit
        // ----------------------------------------------------

        if (
            form.dataset.quizHandlerAttached === "true"
        ) {

            return;
        }


        form.dataset.quizHandlerAttached =
            "true";


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
