// ============================================================
// LSPD QUIZ HANDLER
// FTO / SUPERVISOR / METRO / SWAT
// ============================================================


// ============================================================
// DISCORD WEBHOOK
// ============================================================
//
// ОСТАВЬ ЗДЕСЬ СВОЙ ТЕКУЩИЙ WEBHOOK URL.
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
// НАЙТИ ЗАГОЛОВОК ВОПРОСА
// ============================================================

function findQuestionTitle(
    element,
    fallbackNumber
) {

    let parent =
        element.closest(
            ".question-card, .qa-group, .question, fieldset, .form-group"
        );

    if (!parent) {
        parent = element.parentElement;
    }

    for (
        let i = 0;
        i < 6 && parent;
        i++
    ) {

        const title =
            parent.querySelector(
                ".question-title, .question-text, h3, h4, legend"
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
                    first: radio,
                    radios: []
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

    return Array
        .from(
            form.querySelectorAll(
                "textarea"
            )
        )
        .map(
            (textarea, index) => {

                return {

                    title:
                        findQuestionTitle(
                            textarea,
                            index + 1
                        ),

                    answer:
                        String(
                            textarea.value || ""
                        ).trim() ||
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
                                return label.innerText.trim();
                            }

                        }

                        return checkbox.value;

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
    // Сортируем по реальному положению элемента в HTML
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
// ============================================================
// DISCORD EMBED SYSTEM
// ============================================================
// ============================================================
//
// ВАЖНО:
//
// Discord имеет ограничения:
//
// - field.value <= 1024
// - максимум 25 fields в embed
// - embed <= 6000 символов
// - webhook message <= 10 embeds
//
// Поэтому здесь используется запас:
//
// FIELD_VALUE_LIMIT = 850
// EMBED_SAFE_LIMIT = 5000
// MESSAGE_SAFE_LIMIT = 5000
//
// Благодаря этому длинные FTO ответы не режутся.
// Они разбиваются на части и уходят несколькими
// отдельными webhook-сообщениями.
// ============================================================


// ============================================================
// ЛИМИТЫ
// ============================================================

const DISCORD_FIELD_VALUE_LIMIT = 850;

const DISCORD_EMBED_SAFE_LIMIT = 5000;

const DISCORD_MESSAGE_SAFE_LIMIT = 5000;

const DISCORD_MAX_FIELDS_PER_EMBED = 20;

const DISCORD_MAX_EMBEDS_PER_MESSAGE = 10;


// ============================================================
// РАЗБИВАЕМ ДЛИННЫЙ ТЕКСТ
// ============================================================

function splitTextIntoChunks(
    text,
    maxLength
) {

    text =
        String(text ?? "");

    if (!text) {
        return [""];
    }

    const chunks = [];

    let remaining =
        text;

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
            chunks.push(chunk);
        }

        remaining =
            remaining
                .slice(cut)
                .trim();

    }

    if (remaining) {
        chunks.push(remaining);
    }

    return chunks;

}


// ============================================================
// РЕАЛЬНЫЙ РАЗМЕР EMBED
// ============================================================
//
// Здесь учитываются:
//
// title
// description
// field.name
// field.value
// footer
//
// А не только question + answer.
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

    if (embed.footer) {

        size +=
            String(
                embed.footer.text || ""
            ).length;

    }

    if (Array.isArray(embed.fields)) {

        embed.fields.forEach(
            field => {

                size +=
                    String(
                        field.name || ""
                    ).length;

                size +=
                    String(
                        field.value || ""
                    ).length;

            }
        );

    }

    return size;

}


// ============================================================
// РАЗМЕР ВСЕГО WEBHOOK MESSAGE
// ============================================================

function getMessageEmbedsSize(
    embeds
) {

    return embeds.reduce(
        (total, embed) => {

            return (
                total +
                getEmbedSize(embed)
            );

        },
        0
    );

}


// ============================================================
// СОЗДАТЬ EMBED ОТВЕТОВ
// ============================================================

function createAnswersEmbed(
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
// СОЗДАЁМ HEADER
// ============================================================

function createHeaderEmbed(data) {

    return {

        title:
            `📋 ${cleanText(data.schoolTitle)}`,

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
// FOOTER EMBED
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
// ДОБАВИТЬ FIELD БЕЗ ПЕРЕПОЛНЕНИЯ
// ============================================================

function canAddField(
    embed,
    field
) {

    if (
        embed.fields.length >=
        DISCORD_MAX_FIELDS_PER_EMBED
    ) {

        return false;
    }

    const testEmbed = {

        ...embed,

        fields: [
            ...embed.fields,
            field
        ]

    };

    return (
        getEmbedSize(testEmbed) <=
        DISCORD_EMBED_SAFE_LIMIT
    );

}


// ============================================================
// СОЗДАЁМ ВСЕ EMBEDS
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
    // Текущий answers embed
    // --------------------------------------------------------

    let currentEmbed =
        createAnswersEmbed(1);

    let answerEmbedNumber =
        1;

    // --------------------------------------------------------
    // ВСЕ ВОПРОСЫ
    // --------------------------------------------------------

    data.qaList.forEach(
        (item, index) => {

            const question =
                cleanText(
                    item.title ||
                    `Вопрос ${index + 1}`
                );

            const rawAnswer =
                cleanText(
                    item.answer ||
                    "Нет ответа"
                );

            // ------------------------------------------------
            // Очень важный момент:
            //
            // Мы НЕ режем ответ до 950.
            //
            // Мы разбиваем его на безопасные части.
            // ------------------------------------------------

            const answerChunks =
                splitTextIntoChunks(
                    rawAnswer,
                    DISCORD_FIELD_VALUE_LIMIT
                );

            answerChunks.forEach(
                (chunk, chunkIndex) => {

                    let fieldName;

                    if (
                        answerChunks.length === 1
                    ) {

                        fieldName =
                            `Вопрос ${index + 1}`;

                    } else {

                        fieldName =
                            `Вопрос ${index + 1} — часть ${chunkIndex + 1}/${answerChunks.length}`;

                    }

                    // ----------------------------------------
                    // Первый кусок содержит вопрос.
                    // Последующие — продолжают ответ.
                    // ----------------------------------------

                    let fieldValue;

                    if (
                        chunkIndex === 0
                    ) {

                        const questionPrefix =
                            `**${question}**\n`;

                        // ------------------------------------
                        // Даже вопрос + ответ должны
                        // помещаться в 1024.
                        // ------------------------------------

                        const available =
                            Math.max(
                                100,
                                DISCORD_FIELD_VALUE_LIMIT -
                                questionPrefix.length
                            );

                        let safeChunk =
                            chunk;

                        if (
                            safeChunk.length >
                            available
                        ) {

                            safeChunk =
                                safeChunk.slice(
                                    0,
                                    available
                                );

                        }

                        fieldValue =
                            questionPrefix +
                            safeChunk;

                        // ------------------------------------
                        // Если split неожиданно оставил
                        // остаток — добавим его отдельным
                        // chunk ниже.
                        // ------------------------------------

                        const remaining =
                            chunk.slice(
                                safeChunk.length
                            ).trim();

                        if (remaining) {

                            // --------------------------------
                            // Этот остаток добавляем
                            // обратно в список невозможно,
                            // поэтому в нормальной работе
                            // сюда попасть не должно.
                            //
                            // available рассчитан так,
                            // чтобы chunk уже был безопасным.
                            // --------------------------------

                        }

                    } else {

                        fieldValue =
                            chunk;

                    }

                    const field = {

                        name:
                            fieldName,

                        value:
                            fieldValue || " ",

                        inline:
                            false

                    };

                    // ----------------------------------------
                    // Если field не помещается —
                    // создаём новый embed.
                    // ----------------------------------------

                    if (
                        !canAddField(
                            currentEmbed,
                            field
                        )
                    ) {

                        if (
                            currentEmbed.fields.length
                        ) {

                            embeds.push(
                                currentEmbed
                            );

                        }

                        answerEmbedNumber++;

                        currentEmbed =
                            createAnswersEmbed(
                                answerEmbedNumber
                            );

                    }

                    currentEmbed.fields.push(
                        field
                    );

                }
            );

        }
    );

    // --------------------------------------------------------
    // Последний answers embed
    // --------------------------------------------------------

    if (
        currentEmbed.fields.length
    ) {

        embeds.push(
            currentEmbed
        );

    }

    // --------------------------------------------------------
    // FOOTER
    // --------------------------------------------------------

    embeds.push(
        createFooterEmbed(data)
    );

    return embeds;

}


// ============================================================
// ============================================================
// РАЗБИВАЕМ EMBEDS НА ОТДЕЛЬНЫЕ WEBHOOK-СООБЩЕНИЯ
// ============================================================
//
//
// ЭТО ГЛАВНОЕ ИЗМЕНЕНИЕ.
//
// Раньше:
//
//   [embed1, embed2, embed3, embed4...]
//              ↓
//       один webhook request
//
// Теперь:
//
//   [embed1, embed2]
//              ↓
//       WEBHOOK MESSAGE #1
//
//   [embed3, embed4]
//              ↓
//       WEBHOOK MESSAGE #2
//
//   [embed5, embed6]
//              ↓
//       WEBHOOK MESSAGE #3
//
// И так далее.
//
// ============================================================

function splitEmbedBatches(
    embeds
) {

    const batches = [];

    let currentBatch = [];

    let currentSize = 0;

    embeds.forEach(
        embed => {

            const embedSize =
                getEmbedSize(embed);

            // ------------------------------------------------
            // Если даже один embed вдруг оказался
            // слишком большим — он уже должен был быть
            // разбит buildEmbeds().
            // ------------------------------------------------

            if (
                currentBatch.length &&
                (
                    currentSize +
                    embedSize >
                    DISCORD_MESSAGE_SAFE_LIMIT
                ||
                    currentBatch.length >=
                    DISCORD_MAX_EMBEDS_PER_MESSAGE
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
    );

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
        "================================"
    );

    console.log(
        "Discord embeds:",
        embeds.length
    );

    console.log(
        "Discord messages:",
        batches.length
    );

    batches.forEach(
        (batch, index) => {

            console.log(
                `Message ${index + 1}:`,
                {
                    embeds:
                        batch.length,

                    chars:
                        getMessageEmbedsSize(
                            batch
                        )
                }
            );

        }
    );

    console.log(
        "================================"
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
                    min(430px, calc(100vw - 40px));

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
// БЛОКИРУЕМ УХОД
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
        // ШКОЛА
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
            "Результат теста:",
            result
        );

        // ----------------------------------------------------
        // СОХРАНЯЕМ ДО ОТПРАВКИ
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

            submitButton.innerText =
                "Отправка...";

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

            submitButton.innerText =
                "Завершить тестирование";

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
