// ============================================================
// LSPD QUIZ HANDLER
// FTO / SUPERVISOR / METRO / SWAT
// ============================================================

// ============================================================
// WEBHOOK
// ============================================================
//
// ВСТАВЬ СЮДА СВОЙ ТЕКУЩИЙ WEBHOOK URL
//
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
// НОРМАЛИЗАЦИЯ ТЕКСТА
// ============================================================

function normalizeText(value) {

    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

}


// ============================================================
// ПОИСК ЗАГОЛОВКА ВОПРОСА
// ============================================================
//
// ВАЖНО:
//
// Старая версия делала:
//
// parent.querySelector(...)
//
// из-за чего при общем контейнере могла находить
// ПЕРВЫЙ вопрос внутри родителя.
//
// Теперь сначала ищем заголовок только внутри
// ближайшего question-контейнера.
//
// Если контейнеров нет — ищем БЛИЖАЙШИЙ предыдущий
// заголовок в DOM.
//
// ============================================================

function findQuestionTitle(
    element,
    fallbackNumber
) {

    if (!element) {
        return `Вопрос ${fallbackNumber}`;
    }


    // --------------------------------------------------------
    // 1. Ищем ближайший полноценный контейнер вопроса
    // --------------------------------------------------------

    const questionContainer =
        element.closest(
            [
                ".question-card",
                ".qa-group",
                ".question",
                "fieldset",
                ".form-group"
            ].join(", ")
        );


    if (questionContainer) {

        const title =
            questionContainer.querySelector(
                [
                    ":scope > .question-title",
                    ":scope > .question-text",
                    ":scope > h1",
                    ":scope > h2",
                    ":scope > h3",
                    ":scope > h4",
                    ":scope > legend",
                    ".question-title",
                    ".question-text",
                    "legend",
                    "h3",
                    "h4"
                ].join(", ")
            );


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


    // --------------------------------------------------------
    // 2. Ищем label, который относится к textarea
    // --------------------------------------------------------

    if (element.id) {

        const label =
            document.querySelector(
                `label[for="${CSS.escape(element.id)}"]`
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


    // --------------------------------------------------------
    // 3. Ищем ближайший предыдущий заголовок
    // --------------------------------------------------------
    //
    // Это главный фикс для FTO.
    //
    // Мы НЕ берем первый h3/h4 из общего родителя.
    //
    // Мы идем назад от конкретного textarea и берем
    // ближайший относящийся к нему заголовок.
    //
    // --------------------------------------------------------

    let current =
        element;


    for (
        let level = 0;
        level < 12 && current;
        level++
    ) {

        let sibling =
            current.previousElementSibling;


        while (sibling) {

            const title =
                sibling.matches(
                    [
                        ".question-title",
                        ".question-text",
                        "h1",
                        "h2",
                        "h3",
                        "h4",
                        "legend"
                    ].join(", ")
                )
                    ? sibling
                    : sibling.querySelector(
                        [
                            ".question-title",
                            ".question-text",
                            "h1",
                            "h2",
                            "h3",
                            "h4",
                            "legend"
                        ].join(", ")
                    );


            if (title) {

                const text =
                    title.innerText
                        .replace(/\s+/g, " ")
                        .trim();


                if (text) {
                    return text;
                }

            }


            sibling =
                sibling.previousElementSibling;

        }


        current =
            current.parentElement;

    }


    // --------------------------------------------------------
    // 4. Последняя попытка — старый безопасный алгоритм
    // --------------------------------------------------------

    let parent =
        element.parentElement;


    for (
        let i = 0;
        i < 4 && parent;
        i++
    ) {

        const directTitle =
            Array.from(
                parent.children
            ).find(
                child => {

                    if (
                        !child.matches(
                            [
                                ".question-title",
                                ".question-text",
                                "h1",
                                "h2",
                                "h3",
                                "h4",
                                "legend"
                            ].join(", ")
                        )
                    ) {
                        return false;
                    }


                    return (
                        child !== element
                    );

                }
            );


        if (directTitle) {

            const text =
                directTitle.innerText
                    .replace(/\s+/g, " ")
                    .trim();


            if (text) {
                return text;
            }

        }


        parent =
            parent.parentElement;

    }


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
                label.innerText
                    .replace(/\s+/g, " ")
                    .trim();


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
            clone.innerText
                .replace(/\s+/g, " ")
                .trim();


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


                groups.push(
                    group
                );

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
                        ? getRadioText(
                            selected
                        )
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
//
// ВАЖНО:
//
// Никакого slice здесь НЕТ.
//
// Полный ответ сохраняется в localStorage.
// Полный ответ уходит в Discord частями.
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
                normalizeText(
                    textarea.value
                );


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


                groups.push(
                    group
                );

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

                                return label.innerText
                                    .replace(/\s+/g, " ")
                                    .trim();

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
    // Сортировка строго по расположению элемента в HTML
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
    // Убираем служебный element
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
// РАЗБИВАЕМ ДЛИННЫЙ ТЕКСТ
// ============================================================
//
// Discord field.value = максимум 1024.
//
// Поэтому длинный ответ НЕ ОБРЕЗАЕМ.
//
// Он разбивается на части.
//
// Сначала стараемся резать по переносам строк,
// затем по пробелам,
// и только потом жестко по символам.
//
// ============================================================

function splitLongText(
    text,
    maxLength = 900
) {

    const value =
        String(
            text ?? ""
        );


    if (
        value.length <= maxLength
    ) {

        return [
            value
        ];

    }


    const chunks = [];


    let remaining =
        value;


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
            cut < maxLength * 0.5
        ) {

            cut =
                remaining.lastIndexOf(
                    " ",
                    maxLength
                );

        }


        if (
            cut < maxLength * 0.5
        ) {

            cut =
                maxLength;

        }


        const chunk =
            remaining
                .slice(
                    0,
                    cut
                )
                .trim();


        if (chunk) {

            chunks.push(
                chunk
            );

        }


        remaining =
            remaining
                .slice(cut)
                .trimStart();

    }


    if (remaining) {

        chunks.push(
            remaining
        );

    }


    return chunks;

}


// ============================================================
// СОЗДАТЬ ПУСТОЙ ANSWER EMBED
// ============================================================

function createAnswerEmbed(
    number
) {

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
// РАЗМЕР EMBED
// ============================================================
//
// Оставляем запас ниже 6000.
//
// ============================================================

function getEmbedSize(embed) {

    let size = 0;


    size +=
        String(
            embed.title || ""
        ).length;


    size +=
        String(
            embed.description || ""
        ).length;


    size +=
        String(
            embed.footer?.text || ""
        ).length;


    size +=
        String(
            embed.author?.name || ""
        ).length;


    for (
        const field
        of (
            embed.fields || []
        )
    ) {

        size +=
            String(
                field.name || ""
            ).length;


        size +=
            String(
                field.value || ""
            ).length;

    }


    return size;

}


// ============================================================
// СОЗДАЁМ EMBEDS
// ============================================================
//
// ВАЖНО:
//
// Тут больше НЕТ ограничения
// "ответ <= 950 и остальное потерять".
//
// Каждый длинный textarea разбивается.
//
// ============================================================

function buildEmbeds(data) {

    const embeds = [];


    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    embeds.push({

        title:
            `📋 ${cleanText(
                data.schoolTitle
            )}`,

        description:
            [

                "**ПРОЙДЕН ТЕСТ**",

                "",

                `👤 **IC:** ${cleanText(
                    data.icName
                )}`,

                `🎮 **OOC / Discord:** ${cleanText(
                    data.oocName
                )}`,

                `⏱️ **Время:** ${cleanText(
                    data.timeSpent
                )}`,

                `⚠️ **Уходов со вкладки:** ${
                    data.tabSwitches
                }`

            ].join("\n"),

        color:
            0x38bdf8,

        footer: {

            text:
                "LSPD Qualification Portal"

        },

        timestamp:
            data.completedAt

    });


    // --------------------------------------------------------
    // ТЕКУЩИЙ EMBED
    // --------------------------------------------------------

    let currentEmbed =
        null;


    function startNewEmbed() {

        currentEmbed =
            createAnswerEmbed(
                embeds.length + 1
            );

    }


    function pushCurrentEmbed() {

        if (
            currentEmbed &&
            currentEmbed.fields.length
        ) {

            embeds.push(
                currentEmbed
            );

        }

    }


    startNewEmbed();


    // --------------------------------------------------------
    // ВОПРОСЫ
    // --------------------------------------------------------

    data.qaList.forEach(
        (item, index) => {

            const question =
                cleanText(
                    item.title ||
                    `Вопрос ${index + 1}`
                )
                .slice(
                    0,
                    256
                );


            const answer =
                cleanText(
                    item.answer ||
                    "Нет ответа"
                );


            // ------------------------------------------------
            // Делим длинный ответ на части.
            // ------------------------------------------------

            const chunks =
                splitLongText(
                    answer,
                    850
                );


            chunks.forEach(
                (chunk, chunkIndex) => {

                    let fieldName =
                        `Вопрос ${index + 1}`;


                    let fieldValue =
                        "";


                    // ----------------------------------------
                    // Первый кусок
                    // ----------------------------------------

                    if (
                        chunkIndex === 0
                    ) {

                        fieldValue =
                            `**${question}**\n${chunk}`;

                    }


                    // ----------------------------------------
                    // Продолжение
                    // ----------------------------------------

                    else {

                        fieldName =
                            `Вопрос ${
                                index + 1
                            } — продолжение ${
                                chunkIndex + 1
                            }`;

                        fieldValue =
                            chunk;

                    }


                    // ----------------------------------------
                    // Страховка field.value <= 1024
                    // ----------------------------------------

                    if (
                        fieldValue.length >
                        1024
                    ) {

                        fieldValue =
                            fieldValue.slice(
                                0,
                                1024
                            );

                    }


                    const field = {

                        name:
                            fieldName.slice(
                                0,
                                256
                            ),

                        value:
                            fieldValue,

                        inline:
                            false

                    };


                    const fieldSize =
                        field.name.length +
                        field.value.length;


                    // ----------------------------------------
                    // Новый embed если:
                    //
                    // 1. 25 fields
                    // 2. embed близок к 6000
                    // ----------------------------------------

                    if (

                        currentEmbed.fields.length >=
                        25 ||

                        (
                            getEmbedSize(
                                currentEmbed
                            ) +
                            fieldSize
                        ) >
                        5600

                    ) {

                        pushCurrentEmbed();

                        startNewEmbed();

                    }


                    currentEmbed.fields.push(
                        field
                    );

                }
            );

        }
    );


    // --------------------------------------------------------
    // Последний answer embed
    // --------------------------------------------------------

    pushCurrentEmbed();


    // --------------------------------------------------------
    // FOOTER
    // --------------------------------------------------------

    embeds.push({

        description:
            "✅ **Результаты тестирования сохранены.**",

        color:
            0x22c55e,

        footer: {

            text:
                `${data.schoolKey} • LSPD Qualification Portal`

        }

    });


    return embeds;

}


// ============================================================
// РАЗБИВАЕМ EMBEDS НА WEBHOOK-СООБЩЕНИЯ
// ============================================================
//
// Discord разрешает максимум 10 embeds за одно сообщение.
//
// Также у одного сообщения общий лимит 6000 символов
// во всех embeds.
//
// Поэтому здесь учитываем ОБА ограничения.
//
// ============================================================

function splitEmbedBatches(
    embeds
) {

    const batches = [];


    let currentBatch = [];
    let currentSize = 0;


    for (
        const embed
        of embeds
    ) {

        const embedSize =
            getEmbedSize(
                embed
            );


        const wouldExceedEmbedCount =
            currentBatch.length >= 10;


        const wouldExceedMessageSize =
            (
                currentSize +
                embedSize
            ) >
            5600;


        if (
            currentBatch.length &&
            (
                wouldExceedEmbedCount ||
                wouldExceedMessageSize
            )
        ) {

            batches.push(
                currentBatch
            );


            currentBatch = [];
            currentSize = 0;

        }


        currentBatch.push(
            embed
        );


        currentSize +=
            embedSize;

    }


    if (
        currentBatch.length
    ) {

        batches.push(
            currentBatch
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

        }
        catch {

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
        buildEmbeds(
            data
        );


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
    // Каждый batch = отдельное сообщение Discord.
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
            getIcName(
                form
            );


        // ----------------------------------------------------
        // OOC
        // ----------------------------------------------------

        const oocName =
            getOocName(
                form
            );


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
            collectAnswers(
                form
            );


        // ----------------------------------------------------
        // КОНФИГ ШКОЛЫ
        // ----------------------------------------------------

        const config =
            getSchoolConfig();


        // ----------------------------------------------------
        // РЕЗУЛЬТАТ
        // ----------------------------------------------------

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
            "================================"
        );


        console.log(
            "Результат теста:",
            result
        );


        console.log(
            "Количество вопросов:",
            qaList.length
        );


        console.log(
            "================================"
        );


        // ----------------------------------------------------
        // СОХРАНЯЕМ ПОЛНЫЙ РЕЗУЛЬТАТ
        // ----------------------------------------------------

        saveResult(
            result
        );


        // ----------------------------------------------------
        // ЭКРАН ОТПРАВКИ
        // ----------------------------------------------------

        showSubmittingScreen();


        enableBeforeUnloadProtection();


        // ----------------------------------------------------
        // БЛОКИРУЕМ КНОПКУ
        // ----------------------------------------------------

        if (submitButton) {

            submitButton.disabled =
                true;


            submitButton.style.pointerEvents =
                "none";


            if (
                submitButton.tagName ===
                "INPUT"
            ) {

                submitButton.value =
                    "Отправка...";

            }
            else {

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
        // УСПЕШНО
        // ----------------------------------------------------

        clearPendingResult();


        disableBeforeUnloadProtection();


        window.location.href =
            "results.html";

    }
    catch (error) {

        console.error(
            "Ошибка отправки:",
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
                submitButton.tagName ===
                "INPUT"
            ) {

                submitButton.value =
                    "Завершить тестирование";

            }
            else {

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
        // Не подключаем handler второй раз
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
