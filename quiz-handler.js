// ============================================================
// LSPD QUIZ HANDLER
// FTO / SUPERVISOR / METRO / SWAT
// ============================================================


// ============================================================
// DISCORD WEBHOOK
// ============================================================

const DISCORD_WEBHOOK_URL =
    "https://discord.com/api/webhooks/1536757999253721118/_H2SmnLYgoB5RkMauEOZmAC5dou16Hr49d6-Q801Qf3UqQ0b6CUTdy343W_F7iaKwouY";


// ============================================================
// СОСТОЯНИЕ
// ============================================================

let tabSwitches = 0;
let quizStartTime = Date.now();
let isSubmitting = false;


// ============================================================
// КОНФИГИ ШКОЛ
// ============================================================

const SCHOOL_CONFIGS = {

    "fto.html": {
        key: "FTO",
        title: "FTO SCHOOL"
    },

    "supervisorschool.html": {
        key: "SUPERVISOR",
        title: "SUPERVISOR SCHOOL"
    },

    "metroofficerschool.html": {
        key: "METRO",
        title: "METRO OFFICER SCHOOL"
    },

    "swatschool.html": {
        key: "SWAT",
        title: "SWAT SCHOOL"
    }

};


// ============================================================
// ОПРЕДЕЛЯЕМ ШКОЛУ
// ============================================================

function getSchoolConfig() {

    const filename =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    return SCHOOL_CONFIGS[filename] || {

        key: "LSPD",

        title: "LSPD QUALIFICATION TEST"

    };
}


// ============================================================
// ОТСЛЕЖИВАНИЕ ВКЛАДКИ
// ============================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (document.hidden) {

            tabSwitches++;

        }

    }
);


// ============================================================
// ФОРМА
// ============================================================

function getQuizForm() {

    return (

        document.querySelector("#quizForm") ||

        document.querySelector("#quiz-form") ||

        document.querySelector("form")

    );

}


// ============================================================
// ПОИСК IC
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


        if (!element) {
            continue;
        }


        const value =
            String(
                element.value || ""
            ).trim();


        if (value) {
            return value;
        }

    }


    return "";

}


// ============================================================
// ПОИСК OOC
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


        if (!element) {
            continue;
        }


        const value =
            String(
                element.value || ""
            ).trim();


        if (value) {
            return value;
        }

    }


    return "";

}


// ============================================================
// БЕЗОПАСНЫЙ ТЕКСТ
// ============================================================

function cleanText(value) {

    return String(value ?? "")

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
// СЕЛЕКТОРЫ ЗАГОЛОВКОВ ВОПРОСОВ
// ============================================================

const QUESTION_TITLE_SELECTORS = [

    ".question-title",
    ".question-text",
    "h3",
    "h4",
    "legend"

];


// ============================================================
// ПОЛУЧИТЬ ТЕКСТ ЗАГОЛОВКА
// ============================================================

function getTitleText(element) {

    if (!element) {
        return "";
    }


    const text =
        element.innerText ||
        element.textContent ||
        "";


    return text
        .replace(/\s+/g, " ")
        .trim();

}


// ============================================================
// НАЙТИ ЗАГОЛОВОК ВОПРОСА
// ============================================================
//
// ГЛАВНОЕ ИЗМЕНЕНИЕ:
//
// Раньше использовался:
//
// parent.querySelector(...)
//
// Из-за этого FTO, где несколько textarea находятся
// внутри одного большого контейнера, получал первый
// заголовок для всех textarea.
//
// Теперь сначала ищем ЗАГОЛОВОК, который находится
// непосредственно перед конкретным элементом.
//
// Это позволяет:
//
// textarea #1 -> вопрос #1
// textarea #2 -> вопрос #2
// textarea #3 -> вопрос #3
//
// и т.д.
// ============================================================

function findQuestionTitle(element, fallbackNumber) {

    if (!element) {

        return `Вопрос ${fallbackNumber}`;

    }


    // --------------------------------------------------------
    // 1. Ищем ближайший заголовок ДО конкретного элемента
    //    через DOM-порядок.
    // --------------------------------------------------------

    const form =
        element.closest("form");


    if (form) {

        const titleElements =
            Array.from(
                form.querySelectorAll(
                    QUESTION_TITLE_SELECTORS.join(",")
                )
            );


        let nearestTitle = null;


        for (const title of titleElements) {

            const position =
                title.compareDocumentPosition(
                    element
                );


            // title находится ДО element
            if (
                position &
                Node.DOCUMENT_POSITION_FOLLOWING
            ) {

                nearestTitle =
                    title;

            }

        }


        if (nearestTitle) {

            const text =
                getTitleText(
                    nearestTitle
                );


            if (text) {

                return text;

            }

        }

    }


    // --------------------------------------------------------
    // 2. Проверяем ближайших родителей.
    //
    // Используем только прямые / небольшие контейнеры,
    // чтобы не забрать первый заголовок огромного FTO-блока.
    // --------------------------------------------------------

    let parent =
        element.parentElement;


    for (
        let level = 0;
        level < 6 && parent;
        level++
    ) {

        for (
            const selector
            of QUESTION_TITLE_SELECTORS
        ) {

            const candidates =
                Array.from(
                    parent.children
                )
                .filter(
                    child =>
                        child.matches(selector)
                );


            if (
                candidates.length
            ) {

                // Берём последний подходящий заголовок
                // перед нашим элементом.

                let candidateTitle =
                    null;


                for (
                    const candidate
                    of candidates
                ) {

                    const position =
                        candidate.compareDocumentPosition(
                            element
                        );


                    if (
                        position &
                        Node.DOCUMENT_POSITION_FOLLOWING
                    ) {

                        candidateTitle =
                            candidate;

                    }

                }


                if (candidateTitle) {

                    const text =
                        getTitleText(
                            candidateTitle
                        );


                    if (text) {

                        return text;

                    }

                }

            }

        }


        parent =
            parent.parentElement;

    }


    // --------------------------------------------------------
    // 3. Старый fallback.
    // --------------------------------------------------------

    parent =
        element.closest(
            ".question-card, .qa-group, .question, fieldset, .form-group"
        );


    if (parent) {

        for (
            const selector
            of QUESTION_TITLE_SELECTORS
        ) {

            const title =
                parent.querySelector(
                    selector
                );


            if (title) {

                const text =
                    getTitleText(title);


                if (text) {

                    return text;

                }

            }

        }

    }


    // --------------------------------------------------------
    // 4. Последний fallback.
    // --------------------------------------------------------

    return `Вопрос ${fallbackNumber}`;

}


// ============================================================
// LABEL RADIO
// ============================================================

function getRadioText(radio) {

    if (!radio) {

        return "Нет ответа";

    }


    if (radio.id) {

        const label =
            document.querySelector(
                `label[for="${CSS.escape(radio.id)}"]`
            );


        if (label) {

            const text =
                getTitleText(label);


            if (text) {

                return text;

            }

        }

    }


    const label =
        radio.closest("label");


    if (label) {

        const clone =
            label.cloneNode(true);


        const input =
            clone.querySelector("input");


        if (input) {

            input.remove();

        }


        const text =
            getTitleText(clone);


        if (text) {

            return text;

        }

    }


    return String(
        radio.value ||
        "Выбранный вариант"
    ).trim();

}


// ============================================================
// СОБИРАЕМ RADIO
// ============================================================

function collectRadioAnswers(form) {

    const radios =
        Array.from(
            form.querySelectorAll(
                "input[type='radio']"
            )
        );


    const groups = [];
    const map = new Map();


    radios.forEach(
        (radio, radioIndex) => {

            const name =
                radio.name ||
                `radio_${radioIndex}`;


            if (!map.has(name)) {

                const group = {

                    name,

                    first:
                        radio,

                    radios:
                        []

                };


                map.set(
                    name,
                    group
                );


                groups.push(group);

            }


            map
                .get(name)
                .radios
                .push(radio);

        }
    );


    return groups.map(
        (group, index) => {

            const selected =
                group.radios.find(
                    radio =>
                        radio.checked
                );


            return {

                title:
                    findQuestionTitle(
                        group.first,
                        index + 1
                    ),

                answer:
                    selected
                        ? getRadioText(selected)
                        : "Нет ответа",

                type:
                    "radio",

                element:
                    group.first

            };

        }
    );

}


// ============================================================
// TEXTAREA
// ============================================================

function collectTextareaAnswers(form) {

    const textareas =
        Array.from(
            form.querySelectorAll(
                "textarea"
            )
        );


    return textareas.map(
        (textarea, index) => {

            const answer =
                String(
                    textarea.value || ""
                ).trim();


            return {

                title:
                    findQuestionTitle(
                        textarea,
                        index + 1
                    ),

                answer:
                    answer ||
                    "Нет ответа",

                type:
                    "textarea",

                element:
                    textarea

            };

        }
    );

}


// ============================================================
// SELECT
// ============================================================

function collectSelectAnswers(form) {

    return Array
        .from(
            form.querySelectorAll(
                "select"
            )
        )
        .map(
            (select, index) => {

                const option =
                    select.options[
                        select.selectedIndex
                    ];


                return {

                    title:
                        findQuestionTitle(
                            select,
                            index + 1
                        ),

                    answer:
                        option
                            ? option.text.trim()
                            : "Нет ответа",

                    type:
                        "select",

                    element:
                        select

                };

            }
        );

}


// ============================================================
// CHECKBOX
// ============================================================

function collectCheckboxAnswers(form) {

    const checkboxes =
        Array.from(
            form.querySelectorAll(
                "input[type='checkbox']"
            )
        );


    const groups = [];
    const map = new Map();


    checkboxes.forEach(
        (checkbox, checkboxIndex) => {

            const name =
                checkbox.name ||
                `checkbox_${checkboxIndex}`;


            if (!map.has(name)) {

                const group = {

                    name,

                    first:
                        checkbox,

                    checkboxes:
                        []

                };


                map.set(
                    name,
                    group
                );


                groups.push(group);

            }


            map
                .get(name)
                .checkboxes
                .push(checkbox);

        }
    );


    return groups.map(
        (group, index) => {

            const selected =
                group.checkboxes.filter(
                    checkbox =>
                        checkbox.checked
                );


            const answers =
                selected.map(
                    checkbox => {

                        if (checkbox.id) {

                            const label =
                                document.querySelector(
                                    `label[for="${CSS.escape(checkbox.id)}"]`
                                );


                            if (label) {

                                return getTitleText(
                                    label
                                );

                            }

                        }


                        return String(
                            checkbox.value || ""
                        ).trim();

                    }
                );


            return {

                title:
                    findQuestionTitle(
                        group.first,
                        index + 1
                    ),

                answer:
                    answers.length
                        ? answers.join(", ")
                        : "Нет ответа",

                type:
                    "checkbox",

                element:
                    group.first

            };

        }
    );

}


// ============================================================
// СОБИРАЕМ ВСЕ ОТВЕТЫ
// ============================================================

function collectAnswers(form) {

    const answers = [

        ...collectRadioAnswers(form),

        ...collectTextareaAnswers(form),

        ...collectSelectAnswers(form),

        ...collectCheckboxAnswers(form)

    ];


    // --------------------------------------------------------
    // Сортируем строго по расположению элементов в HTML.
    // --------------------------------------------------------

    answers.sort(
        (a, b) => {

            if (
                a.element ===
                b.element
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

        }
    );


    // --------------------------------------------------------
    // Убираем служебный element.
    // --------------------------------------------------------

    return answers.map(
        (item, index) => {

            let title =
                String(
                    item.title || ""
                )
                .replace(/\s+/g, " ")
                .trim();


            if (!title) {

                title =
                    `Вопрос ${index + 1}`;

            }


            return {

                title,

                answer:
                    item.answer ||
                    "Нет ответа",

                type:
                    item.type

            };

        }
    );

}


// ============================================================
// ФОРМАТ ВРЕМЕНИ
// ============================================================

function getTimeSpent() {

    const seconds =
        Math.max(
            0,
            Math.floor(
                (
                    Date.now() -
                    quizStartTime
                ) / 1000
            )
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    return (
        `${minutes} мин. ` +
        `${remaining} сек.`
    );

}


// ============================================================
// СОХРАНЕНИЕ РЕЗУЛЬТАТА
// ============================================================

function saveResult(data) {

    localStorage.setItem(
        "lastQuizResult",
        JSON.stringify(data)
    );


    localStorage.setItem(
        "pendingQuizResult",
        JSON.stringify(data)
    );

}


// ============================================================
// УДАЛИТЬ PENDING
// ============================================================

function clearPendingResult() {

    localStorage.removeItem(
        "pendingQuizResult"
    );

}


// ============================================================
// РАЗБИТЬ ДЛИННЫЙ ТЕКСТ
// ============================================================
//
// Discord:
//
// field.name  <= 256
// field.value <= 1024
//
// Поэтому один длинный ответ разбиваем на части.
//
// ВАЖНО:
//
// Мы больше НЕ режем ответ на 950 символах.
//
// Если ответ 3000 / 5000 / 10000 символов,
// он полностью сохраняется и разбивается.
// ============================================================

function splitText(text, maxLength) {

    const value =
        String(text ?? "");


    if (
        value.length <= maxLength
    ) {

        return [value];

    }


    const chunks = [];


    let remaining =
        value;


    while (
        remaining.length >
        maxLength
    ) {

        // ----------------------------------------------------
        // Сначала пытаемся разрезать по переносу строки.
        // ----------------------------------------------------

        let cut =
            remaining.lastIndexOf(
                "\n",
                maxLength
            );


        // ----------------------------------------------------
        // Если нормального переноса нет,
        // режем по пробелу.
        // ----------------------------------------------------

        if (
            cut < maxLength * 0.5
        ) {

            cut =
                remaining.lastIndexOf(
                    " ",
                    maxLength
                );

        }


        // ----------------------------------------------------
        // Если и пробела нет — режем жёстко.
        // ----------------------------------------------------

        if (
            cut <= 0
        ) {

            cut =
                maxLength;

        }


        chunks.push(
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

        chunks.push(
            remaining
        );

    }


    return chunks;

}


// ============================================================
// ЛИМИТЫ DISCORD
// ============================================================
//
// Оставляем запас.
//
// Discord maximum embed size = 6000.
//
// Используем 5000 как безопасный максимум.
// ============================================================

const DISCORD_EMBED_SAFE_LIMIT = 5000;

const DISCORD_FIELD_VALUE_LIMIT = 1024;

const DISCORD_FIELD_NAME_LIMIT = 256;

const DISCORD_MAX_FIELDS = 25;

const DISCORD_MAX_EMBEDS_PER_MESSAGE = 10;


// ============================================================
// РАЗМЕР EMBED
// ============================================================

function getEmbedSize(embed) {

    let size = 0;


    if (embed.title) {

        size +=
            String(embed.title).length;

    }


    if (embed.description) {

        size +=
            String(embed.description).length;

    }


    if (embed.footer?.text) {

        size +=
            String(
                embed.footer.text
            ).length;

    }


    if (embed.author?.name) {

        size +=
            String(
                embed.author.name
            ).length;

    }


    if (Array.isArray(embed.fields)) {

        for (const field of embed.fields) {

            size +=
                String(
                    field.name || ""
                ).length;

            size +=
                String(
                    field.value || ""
                ).length;

        }

    }


    return size;

}


// ============================================================
// СОЗДАТЬ EMBED ОТВЕТОВ
// ============================================================

function createAnswersEmbed(number) {

    return {

        title:
            `📝 Ответы ${number}`,

        fields:
            [],

        color:
            0x1e88e5

    };

}


// ============================================================
// СОЗДАТЬ HEADER EMBED
// ============================================================

function createHeaderEmbed(data) {

    return {

        title:
            `📋 ${data.schoolTitle}`,

        description:
            [

                "**ПРОЙДЕН ТЕСТ**",

                "",

                `👤 **IC:** ${cleanText(data.icName)}`,

                `🎮 **OOC / Discord:** ${cleanText(data.oocName)}`,

                `⏱️ **Время:** ${cleanText(data.timeSpent)}`,

                `⚠️ **Уходов со вкладки:** ${data.tabSwitches}`

            ].join("\n"),

        color:
            0x38bdf8,

        footer: {

            text:
                "LSPD Qualification Portal"

        },

        timestamp:
            data.completedAt

    };

}


// ============================================================
// СОЗДАТЬ FOOTER EMBED
// ============================================================

function createFooterEmbed(data) {

    return {

        description:
            "✅ **Результаты тестирования сохранены.**",

        color:
            0x22c55e,

        footer: {

            text:
                `${data.schoolKey} • LSPD Qualification Portal`

        }

    };

}


// ============================================================
// СОЗДАЁМ EMBEDS
// ============================================================
//
// Здесь основная защита от ошибки:
//
// "Embed size exceeds maximum size of 6000"
//
// Каждый embed контролируется:
//
// - по количеству fields;
// - по размеру;
// - по Discord field limit;
// - длинные ответы разбиваются.
// ============================================================

function buildEmbeds(data) {

    const embeds = [];


    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    embeds.push(
        createHeaderEmbed(data)
    );


    // --------------------------------------------------------
    // Текущий embed ответов.
    // --------------------------------------------------------

    let currentEmbed =
        createAnswersEmbed(1);


    let answerEmbedNumber = 1;


    // --------------------------------------------------------
    // Добавить текущий embed в массив.
    // --------------------------------------------------------

    function flushCurrentEmbed() {

        if (
            currentEmbed &&
            currentEmbed.fields.length
        ) {

            embeds.push(
                currentEmbed
            );

        }

    }


    // --------------------------------------------------------
    // Создать новый embed.
    // --------------------------------------------------------

    function startNewEmbed() {

        flushCurrentEmbed();


        answerEmbedNumber++;


        currentEmbed =
            createAnswersEmbed(
                answerEmbedNumber
            );

    }


    // --------------------------------------------------------
    // Добавить field безопасно.
    // --------------------------------------------------------

    function addFieldSafe(
        fieldName,
        fieldValue
    ) {

        const safeName =
            String(fieldName || "")
                .slice(
                    0,
                    DISCORD_FIELD_NAME_LIMIT
                );


        const safeValue =
            String(fieldValue || "")
                .slice(
                    0,
                    DISCORD_FIELD_VALUE_LIMIT
                );


        const field = {

            name:
                safeName,

            value:
                safeValue,

            inline:
                false

        };


        const fieldSize =
            safeName.length +
            safeValue.length;


        const currentSize =
            getEmbedSize(
                currentEmbed
            );


        // ----------------------------------------------------
        // Если field не помещается —
        // новый embed.
        // ----------------------------------------------------

        if (

            currentEmbed.fields.length >=
            DISCORD_MAX_FIELDS ||

            currentSize +
            fieldSize >
            DISCORD_EMBED_SAFE_LIMIT

        ) {

            startNewEmbed();

        }


        currentEmbed.fields.push(
            field
        );

    }


    // --------------------------------------------------------
    // ОБРАБАТЫВАЕМ КАЖДЫЙ ВОПРОС
    // --------------------------------------------------------

    data.qaList.forEach(
        (item, index) => {

            const question =
                cleanText(
                    item.title ||
                    `Вопрос ${index + 1}`
                );


            const answer =
                cleanText(
                    item.answer ||
                    "Нет ответа"
                );


            // ------------------------------------------------
            // Разбиваем ответ на куски <= 1024.
            // ------------------------------------------------

            const answerParts =
                splitText(
                    answer,
                    950
                );


            // ------------------------------------------------
            // Если ответ короткий.
            // ------------------------------------------------

            if (
                answerParts.length === 1
            ) {

                addFieldSafe(

                    `Вопрос ${index + 1}`,

                    `**${question}**\n${answerParts[0]}`

                );


                return;

            }


            // ------------------------------------------------
            // Если ответ длинный.
            //
            // Каждый кусок сохраняется.
            //
            // Например:
            //
            // Вопрос 7
            // [1/4] длинный ответ...
            //
            // Вопрос 7 — продолжение
            // [2/4] ...
            // ------------------------------------------------

            answerParts.forEach(
                (part, partIndex) => {

                    const isFirst =
                        partIndex === 0;


                    const partLabel =
                        `[${partIndex + 1}/${answerParts.length}]`;


                    let fieldName;


                    if (isFirst) {

                        fieldName =
                            `Вопрос ${index + 1}`;

                    } else {

                        fieldName =
                            `Вопрос ${index + 1} — продолжение`;

                    }


                    let fieldValue;


                    if (isFirst) {

                        fieldValue =
                            `**${question}**\n` +
                            `${partLabel}\n` +
                            part;

                    } else {

                        fieldValue =
                            `${partLabel}\n` +
                            part;

                    }


                    addFieldSafe(
                        fieldName,
                        fieldValue
                    );

                }
            );

        }
    );


    // --------------------------------------------------------
    // Последний embed ответов.
    // --------------------------------------------------------

    flushCurrentEmbed();


    // --------------------------------------------------------
    // FOOTER
    // --------------------------------------------------------

    embeds.push(
        createFooterEmbed(data)
    );


    // --------------------------------------------------------
    // ФИНАЛЬНАЯ ЗАЩИТА.
    //
    // Теоретически сюда уже ничего не должно попасть
    // больше 5000, но проверяем ещё раз.
    // --------------------------------------------------------

    embeds.forEach(
        (embed) => {

            const size =
                getEmbedSize(embed);


            if (
                size >
                DISCORD_EMBED_SAFE_LIMIT
            ) {

                console.warn(
                    "Embed still too large:",
                    size,
                    embed
                );

            }

        }
    );


    return embeds;

}


// ============================================================
// РАЗБИВАЕМ EMBEDS НА ГРУППЫ ПО 10
// ============================================================
//
// Discord позволяет максимум 10 embeds
// в одном webhook message.
//
// Если получилось 11+:
//
// request #1 -> 10 embeds
// request #2 -> остальные
//
// Поэтому длинный FTO результат не падает.
// ============================================================

function splitEmbedBatches(embeds) {

    const batches = [];


    for (
        let i = 0;
        i < embeds.length;
        i +=
            DISCORD_MAX_EMBEDS_PER_MESSAGE
    ) {

        batches.push(
            embeds.slice(
                i,
                i +
                DISCORD_MAX_EMBEDS_PER_MESSAGE
            )
        );

    }


    return batches;

}


// ============================================================
// ОТПРАВКА WEBHOOK
// ============================================================

async function sendWebhook(
    embeds,
    content = ""
) {

    const payload = {

        username:
            "Портал квалификации LSPD",

        content:
            content,

        embeds:
            embeds,

        allowed_mentions: {

            parse:
                []

        }

    };


    const response =
        await fetch(
            DISCORD_WEBHOOK_URL,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(
                        payload
                    ),

                keepalive:
                    true

            }
        );


    if (!response.ok) {

        let errorText =
            "";


        try {

            errorText =
                await response.text();

        } catch {

            errorText =
                "Неизвестная ошибка Discord";

        }


        throw new Error(
            `Discord ${response.status}: ${errorText}`
        );

    }

}


// ============================================================
// ОТПРАВКА ВСЕГО РЕЗУЛЬТАТА
// ============================================================

async function sendResultToDiscord(
    data
) {

    const embeds =
        buildEmbeds(data);


    const batches =
        splitEmbedBatches(
            embeds
        );


    console.log(
        "Discord embeds:",
        embeds.length
    );


    console.log(
        "Discord batches:",
        batches.length
    );


    // --------------------------------------------------------
    // Отправляем batches последовательно.
    //
    // batch 1 = Discord message 1
    // batch 2 = Discord message 2
    // batch 3 = Discord message 3
    //
    // Так ответы не перемешиваются.
    // --------------------------------------------------------

    for (
        let i = 0;
        i < batches.length;
        i++
    ) {

        const isFirst =
            i === 0;


        await sendWebhook(

            batches[i],

            isFirst
                ? "📋 **Новый результат тестирования**"
                : ""

        );

    }

}


// ============================================================
// ЭКРАН ЗАГРУЗКИ
// ============================================================

function showSubmittingScreen() {

    let overlay =
        document.getElementById(
            "quizSubmittingOverlay"
        );


    if (!overlay) {

        overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "quizSubmittingOverlay";


        overlay.innerHTML = `

            <div class="quiz-submit-box">

                <div class="quiz-spinner"></div>

                <div class="quiz-submit-title">
                    Отправка результатов
                </div>

                <div class="quiz-submit-text">
                    Пожалуйста, не закрывайте страницу.
                </div>

                <div class="quiz-submit-subtext">
                    Результат сохраняется и отправляется
                    в систему проверки.
                </div>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        const style =
            document.createElement(
                "style"
            );


        style.textContent = `

            #quizSubmittingOverlay {

                position: fixed;

                inset: 0;

                z-index: 999999;

                display: flex;

                align-items: center;

                justify-content: center;

                background:
                    rgba(2, 6, 23, 0.92);

                backdrop-filter:
                    blur(8px);

                font-family:
                    Inter,
                    Arial,
                    sans-serif;

            }


            .quiz-submit-box {

                width:
                    min(
                        430px,
                        calc(100vw - 40px)
                    );

                padding:
                    32px;

                text-align:
                    center;

                background:
                    #0f172a;

                border:
                    1px solid #26364d;

                border-radius:
                    16px;

                box-shadow:
                    0 25px 80px
                    rgba(0,0,0,.45);

            }


            .quiz-spinner {

                width:
                    44px;

                height:
                    44px;

                margin:
                    0 auto 22px;

                border:
                    4px solid
                    rgba(56,189,248,.2);

                border-top-color:
                    #38bdf8;

                border-radius:
                    50%;

                animation:
                    quizSpin
                    .8s linear infinite;

            }


            .quiz-submit-title {

                color:
                    #f8fafc;

                font-size:
                    22px;

                font-weight:
                    800;

                margin-bottom:
                    10px;

            }


            .quiz-submit-text {

                color:
                    #38bdf8;

                font-size:
                    15px;

                font-weight:
                    700;

                margin-bottom:
                    8px;

            }


            .quiz-submit-subtext {

                color:
                    #94a3b8;

                font-size:
                    13px;

                line-height:
                    1.5;

            }


            @keyframes quizSpin {

                from {

                    transform:
                        rotate(0deg);

                }

                to {

                    transform:
                        rotate(360deg);

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    overlay.style.display =
        "flex";

}


// ============================================================
// СКРЫТЬ ЭКРАН ЗАГРУЗКИ
// ============================================================

function hideSubmittingScreen() {

    const overlay =
        document.getElementById(
            "quizSubmittingOverlay"
        );


    if (overlay) {

        overlay.style.display =
            "none";

    }

}


// ============================================================
// БЛОКИРУЕМ УХОД СО СТРАНИЦЫ
// ============================================================

function enableBeforeUnloadProtection() {

    window.onbeforeunload =
        function () {

            return (
                "Результаты теста ещё отправляются. " +
                "Пожалуйста, не закрывайте страницу."
            );

        };

}


// ============================================================
// УБИРАЕМ БЛОКИРОВКУ
// ============================================================

function disableBeforeUnloadProtection() {

    window.onbeforeunload =
        null;

}


// ============================================================
// SUBMIT
// ============================================================

async function handleSubmit(
    event
) {

    event.preventDefault();


    if (isSubmitting) {

        return;

    }


    isSubmitting =
        true;


    const form =
        event.target;


    const submitButton =
        form.querySelector(
            "button[type='submit'], input[type='submit']"
        );


    try {

        // ----------------------------------------------------
        // IC
        // ----------------------------------------------------

        const icName =
            getIcName(form);


        // ----------------------------------------------------
        // OOC
        // ----------------------------------------------------

        const oocName =
            getOocName(form);


        if (!icName) {

            throw new Error(
                "Введите IC никнейм."
            );

        }


        if (!oocName) {

            throw new Error(
                "Введите OOC / Discord никнейм."
            );

        }


        // ----------------------------------------------------
        // ОТВЕТЫ
        // ----------------------------------------------------

        const qaList =
            collectAnswers(form);


        // ----------------------------------------------------
        // РЕЗУЛЬТАТ
        // ----------------------------------------------------

        const config =
            getSchoolConfig();


        const result = {

            schoolKey:
                config.key,

            schoolTitle:
                config.title,

            icName:
                icName,

            oocName:
                oocName,

            timeSpent:
                getTimeSpent(),

            tabSwitches:
                tabSwitches,

            qaList:
                qaList,

            completedAt:
                new Date().toISOString()

        };


        console.log(
            "Результат теста:",
            result
        );


        // ----------------------------------------------------
        // Сохраняем ДО отправки.
        // ----------------------------------------------------

        saveResult(
            result
        );


        // ----------------------------------------------------
        // Экран отправки.
        // ----------------------------------------------------

        showSubmittingScreen();


        enableBeforeUnloadProtection();


        // ----------------------------------------------------
        // Блокируем кнопку.
        // ----------------------------------------------------

        if (submitButton) {

            submitButton.disabled =
                true;


            submitButton.style.pointerEvents =
                "none";


            if (
                submitButton.tagName
                    .toLowerCase() ===
                "input"
            ) {

                submitButton.value =
                    "Отправка...";

            } else {

                submitButton.innerText =
                    "Отправка...";

            }

        }


        // ----------------------------------------------------
        // DISCORD
        // ----------------------------------------------------

        await sendResultToDiscord(
            result
        );


        // ----------------------------------------------------
        // Успешно.
        // ----------------------------------------------------

        clearPendingResult();


        disableBeforeUnloadProtection();


        window.location.href =
            "results.html";

    }


    catch (error) {

        console.error(
            "Ошибка:",
            error
        );


        isSubmitting =
            false;


        hideSubmittingScreen();


        disableBeforeUnloadProtection();


        if (submitButton) {

            submitButton.disabled =
                false;


            submitButton.style.pointerEvents =
                "";


            if (
                submitButton.tagName
                    .toLowerCase() ===
                "input"
            ) {

                submitButton.value =
                    "Завершить тестирование";

            } else {

                submitButton.innerText =
                    "Завершить тестирование";

            }

        }


        alert(

            "❌ Не удалось отправить результаты.\n\n" +

            error.message +

            "\n\n" +

            "Ваш результат сохранён. " +

            "Ничего заново проходить не нужно."

        );

    }

}


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            getQuizForm();


        if (!form) {

            console.error(
                "Quiz Handler: форма не найдена."
            );

            return;

        }


        // ----------------------------------------------------
        // Не подключаем handler второй раз.
        // ----------------------------------------------------

        if (
            form.dataset.quizHandlerLoaded ===
            "true"
        ) {

            return;

        }


        form.dataset.quizHandlerLoaded =
            "true";


        quizStartTime =
            Date.now();


        // ----------------------------------------------------
        // SUBMIT
        // ----------------------------------------------------

        form.addEventListener(
            "submit",
            handleSubmit
        );


        console.log(
            "================================"
        );


        console.log(
            "✅ QUIZ HANDLER READY"
        );


        console.log(
            "School:",
            getSchoolConfig()
        );


        console.log(
            "Form:",
            form
        );


        console.log(
            "================================"
        );

    }
);
