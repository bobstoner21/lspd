// ============================================================
// LSPD QUIZ HANDLER
// FTO / SUPERVISOR / METRO / SWAT
// ============================================================

// ВСТАВЬ СЮДА СВОЙ НОВЫЙ WEBHOOK URL
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

    return (
        SCHOOL_CONFIGS[filename] || {
            key: "LSPD",
            title: "LSPD QUALIFICATION TEST"
        }
    );
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
// ПОИСК БЛИЖАЙШЕГО ЗАГОЛОВКА
// ============================================================
//
// ГЛАВНОЕ ИЗМЕНЕНИЕ:
//
// Старый код делал:
//
// parent.querySelector(".question-title")
//
// Из-за этого несколько textarea внутри одного общего блока
// получали ОДИН И ТОТ ЖЕ первый вопрос.
//
// Теперь сначала проверяем:
// 1. label
// 2. legend
// 3. ближайший title/text
// 4. предыдущие элементы
// 5. ближайшие контейнеры
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
    // 1. Если textarea/input находится внутри label
    // --------------------------------------------------------

    const ownLabel =
        element.closest("label");

    if (ownLabel) {

        const clone =
            ownLabel.cloneNode(true);

        const input =
            clone.querySelector(
                "input, textarea, select"
            );

        if (input) {
            input.remove();
        }

        const labelText =
            normalizeText(
                clone.innerText
            );

        if (labelText) {
            return labelText;
        }

    }


    // --------------------------------------------------------
    // 2. Ищем ближайшие элементы-заголовки
    // НЕ через parent.querySelector,
    // потому что это возвращает первый заголовок.
    // --------------------------------------------------------

    const directTitleSelectors = [

        ".question-title",
        ".question-text",
        ".question-label",
        ".scenario-title",
        ".case-title",
        ".task-title",
        "legend",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5"

    ];


    // Проверяем предыдущие siblings
    let sibling =
        element.previousElementSibling;


    let siblingSteps = 0;


    while (
        sibling &&
        siblingSteps < 8
    ) {

        for (
            const selector
            of directTitleSelectors
        ) {

            const title =
                sibling.matches(selector)
                    ? sibling
                    : sibling.querySelector(selector);


            if (title) {

                const text =
                    normalizeText(
                        title.innerText
                    );

                if (text) {
                    return text;
                }

            }

        }


        sibling =
            sibling.previousElementSibling;

        siblingSteps++;

    }


    // --------------------------------------------------------
    // 3. Проверяем ближайшие контейнеры.
    //
    // Здесь НЕ используем querySelector() вслепую.
    // Берем только заголовок, который является
    // непосредственным/ближайшим элементом контейнера.
    // --------------------------------------------------------

    let parent =
        element.parentElement;


    for (
        let level = 0;
        level < 8 && parent;
        level++
    ) {

        // Сначала ищем прямых детей-заголовков
        for (
            const selector
            of directTitleSelectors
        ) {

            const children =
                Array.from(
                    parent.children
                );


            for (
                const child
                of children
            ) {

                if (
                    child.matches(selector)
                ) {

                    const text =
                        normalizeText(
                            child.innerText
                        );


                    if (text) {

                        // Проверяем, что этот заголовок
                        // находится перед element.
                        const position =
                            child.compareDocumentPosition(
                                element
                            );


                        if (
                            position &
                            Node.DOCUMENT_POSITION_FOLLOWING
                        ) {

                            return text;
                        }

                    }

                }

            }

        }


        // ----------------------------------------------------
        // 4. Ищем ближайший текстовый блок непосредственно
        // перед textarea.
        // ----------------------------------------------------

        const children =
            Array.from(
                parent.children
            );


        const elementIndex =
            children.indexOf(element);


        if (elementIndex > 0) {

            for (
                let i = elementIndex - 1;
                i >= 0;
                i--
            ) {

                const candidate =
                    children[i];


                const text =
                    normalizeText(
                        candidate.innerText
                    );


                if (
                    text &&
                    text.length <= 500
                ) {

                    // Если это не служебная кнопка
                    // и не ответ другого элемента
                    const tag =
                        candidate.tagName
                            .toLowerCase();


                    if (
                        ![
                            "button",
                            "script",
                            "style",
                            "textarea"
                        ].includes(tag)
                    ) {

                        return text;
                    }

                }

            }

        }


        parent =
            parent.parentElement;
    }


    // --------------------------------------------------------
    // 5. Fallback
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
                normalizeText(
                    label.innerText
                );


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
            normalizeText(
                clone.innerText
            );


        if (text) {
            return text;
        }

    }


    return normalizeText(
        radio.value ||
        "Выбранный вариант"
    );

}


// ============================================================
// RADIO
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
        (radio, index) => {

            const name =
                radio.name ||
                `radio_${index}`;


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
//
// КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ:
//
// Каждый textarea = отдельный ответ.
//
// Никаких группировок по name.
//
// Никаких попыток объединять textarea.
//
// Берем именно textarea.value.
//
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

            const rawValue =
                textarea.value;


            const answer =
                normalizeText(
                    rawValue
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
                    textarea,

                // Нужен для абсолютной привязки
                // ответа к конкретному textarea.
                elementIndex:
                    index

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
                            ? normalizeText(
                                option.text
                            )
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
        (checkbox, index) => {

            const name =
                checkbox.name ||
                `checkbox_${index}`;


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

                                return normalizeText(
                                    label.innerText
                                );

                            }

                        }


                        return normalizeText(
                            checkbox.value
                        );

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
    // Сортируем строго по позиции элемента в DOM
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
    // Нормализуем
    // --------------------------------------------------------

    return answers.map(
        (item, index) => {

            let title =
                normalizeText(
                    item.title
                );


            if (!title) {

                title =
                    `Вопрос ${index + 1}`;

            }


            let answer =
                normalizeText(
                    item.answer
                );


            if (!answer) {

                answer =
                    "Нет ответа";

            }


            return {

                title,

                answer,

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
// Поэтому длинный textarea превращаем в несколько частей.
//
// ВАЖНО:
// текст НЕ теряется.
//
// ============================================================

function splitText(
    text,
    maxLength
) {

    const value =
        String(text ?? "");


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
            cut < 500
        ) {

            cut =
                remaining.lastIndexOf(
                    " ",
                    maxLength
                );

        }


        if (
            cut < 1
        ) {

            cut =
                maxLength;

        }


        chunks.push(
            remaining.slice(
                0,
                cut
            )
        );


        remaining =
            remaining.slice(
                cut
            ).trimStart();

    }


    if (remaining.length) {

        chunks.push(
            remaining
        );

    }


    return chunks;

}


// ============================================================
// СОЗДАЁМ НОВЫЙ EMBED
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
// Считаем все текстовые части.
//
// Discord проверяет общий размер embed,
// а не только field.value.
//
// ============================================================

function getEmbedSize(
    embed
) {

    let size = 0;


    if (embed.title) {
        size += embed.title.length;
    }


    if (embed.description) {
        size += embed.description.length;
    }


    if (embed.footer?.text) {
        size +=
            embed.footer.text.length;
    }


    if (embed.author?.name) {
        size +=
            embed.author.name.length;
    }


    for (
        const field
        of (
            embed.fields ||
            []
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
// ДОБАВЛЯЕМ FIELD БЕЗ ПРЕВЫШЕНИЯ ЛИМИТА
// ============================================================

function canAddField(
    embed,
    field
) {

    // максимум 25 fields
    if (
        embed.fields.length >= 25
    ) {

        return false;
    }


    const fieldSize =
        String(
            field.name || ""
        ).length +
        String(
            field.value || ""
        ).length;


    // оставляем запас
    return (
        getEmbedSize(embed) +
        fieldSize <=
        5700
    );

}


// ============================================================
// СОЗДАЁМ EMBEDS С ОТВЕТАМИ
// ============================================================
//
// Теперь длинный ответ:
// 1024+
//   ↓
// часть 1
// часть 2
// часть 3
//
// И каждый следующий кусок остаётся
// привязанным к тому же вопросу.
//
// ============================================================

function buildAnswerEmbeds(
    qaList
) {

    const embeds = [];


    let currentEmbed =
        createAnswerEmbed(
            1
        );


    for (
        let index = 0;
        index < qaList.length;
        index++
    ) {

        const item =
            qaList[index];


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


        // ----------------------------------------------------
        // Заголовок поля
        // ----------------------------------------------------

        const baseName =
            `Вопрос ${index + 1}`;


        // ----------------------------------------------------
        // Разбиваем ответ на куски <= 900
        //
        // Оставляем место для форматирования.
        // ----------------------------------------------------

        const chunks =
            splitText(
                answer,
                900
            );


        for (
            let chunkIndex = 0;
            chunkIndex < chunks.length;
            chunkIndex++
        ) {

            const chunk =
                chunks[chunkIndex];


            let fieldName =
                baseName;


            if (
                chunks.length > 1
            ) {

                fieldName +=
                    ` — часть ${chunkIndex + 1}/${chunks.length}`;

            }


            const field = {

                name:
                    fieldName,

                value:
                    `**${question}**\n${chunk}`,

                inline:
                    false

            };


            // ------------------------------------------------
            // Если этот field не помещается —
            // создаём новый embed.
            // ------------------------------------------------

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


                currentEmbed =
                    createAnswerEmbed(
                        embeds.length + 1
                    );

            }


            currentEmbed.fields.push(
                field
            );

        }

    }


    if (
        currentEmbed.fields.length
    ) {

        embeds.push(
            currentEmbed
        );

    }


    return embeds;

}


// ============================================================
// HEADER EMBED
// ============================================================

function buildHeaderEmbed(
    data
) {

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
// FOOTER EMBED
// ============================================================

function buildFooterEmbed(
    data
) {

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
// СОЗДАЁМ ВСЕ EMBEDS
// ============================================================

function buildEmbeds(
    data
) {

    const embeds = [];


    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    embeds.push(
        buildHeaderEmbed(
            data
        )
    );


    // --------------------------------------------------------
    // ОТВЕТЫ
    // --------------------------------------------------------

    const answerEmbeds =
        buildAnswerEmbeds(
            data.qaList
        );


    embeds.push(
        ...answerEmbeds
    );


    // --------------------------------------------------------
    // FOOTER
    // --------------------------------------------------------

    embeds.push(
        buildFooterEmbed(
            data
        )
    );


    return embeds;

}


// ============================================================
// ПРОВЕРКА EMBED
// ============================================================

function validateEmbed(
    embed,
    index
) {

    const size =
        getEmbedSize(
            embed
        );


    if (
        size > 6000
    ) {

        throw new Error(
            `Внутренняя ошибка: embed ${index + 1} имеет ${size} символов.`
        );

    }


    if (
        (embed.fields || []).length >
        25
    ) {

        throw new Error(
            `Внутренняя ошибка: embed ${index + 1} содержит более 25 полей.`
        );

    }


    for (
        const field
        of (
            embed.fields ||
            []
        )
    ) {

        if (
            String(
                field.name || ""
            ).length > 256
        ) {

            throw new Error(
                "Внутренняя ошибка: слишком длинное имя field."
            );

        }


        if (
            String(
                field.value || ""
            ).length > 1024
        ) {

            throw new Error(
                "Внутренняя ошибка: слишком длинное значение field."
            );

        }

    }

}


// ============================================================
// РАЗБИВАЕМ EMBEDS НА WEBHOOK REQUESTS
// ============================================================
//
// Один Discord webhook request:
// максимум 10 embeds.
//
// ============================================================

function splitEmbedBatches(
    embeds
) {

    const batches = [];


    for (
        let i = 0;
        i < embeds.length;
        i += 10
    ) {

        batches.push(
            embeds.slice(
                i,
                i + 10
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

    // --------------------------------------------------------
    // Перед отправкой проверяем ВСЕ embeds.
    // --------------------------------------------------------

    embeds.forEach(
        (embed, index) => {

            validateEmbed(
                embed,
                index
            );

        }
    );


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
        buildEmbeds(
            data
        );


    console.log(
        "Всего embeds:",
        embeds.length
    );


    // --------------------------------------------------------
    // Проверяем каждый embed
    // --------------------------------------------------------

    embeds.forEach(
        (embed, index) => {

            console.log(
                `Embed ${index + 1}:`,
                getEmbedSize(embed),
                "символов"
            );

        }
    );


    const batches =
        splitEmbedBatches(
            embeds
        );


    console.log(
        "Discord batches:",
        batches.length
    );


    // --------------------------------------------------------
    // Отправляем максимум 10 embeds за request.
    // Если их больше — следующий request.
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
// СКРЫТЬ ЭКРАН
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
        // CONFIG
        // ----------------------------------------------------

        const config =
            getSchoolConfig();


        // ----------------------------------------------------
        // RESULT
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
        // Для отладки можно посмотреть конкретно textarea
        // ----------------------------------------------------

        console.log(
            "TEXTAREA ANSWERS:",
            qaList.filter(
                item =>
                    item.type === "textarea"
            )
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
        // КНОПКА
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
        // SUCCESS
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
        // Не подключаем второй раз
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
            "Textarea count:",
            form.querySelectorAll(
                "textarea"
            ).length
        );


        console.log(
            "================================"
        );

    }
);
