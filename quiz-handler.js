let tabSwitches = 0;
let quizStartTime = Date.now();
let isSubmitting = false;

const QUIZ_API_URL = "https://lspd-school-api.bobadventure.workers.dev/quiz-result";

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

function getSchoolConfig() {
    const filename = window.location.pathname
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

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        tabSwitches++;
    }
});

function getQuizForm() {
    return (
        document.querySelector("#quizForm") ||
        document.querySelector("#quiz-form") ||
        document.querySelector("form")
    );
}

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
        const element = form.querySelector(selector);

        if (!element) {
            continue;
        }

        const value = String(element.value || "").trim();

        if (value) {
            return value;
        }
    }

    return "";
}

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
        const element = form.querySelector(selector);

        if (!element) {
            continue;
        }

        const value = String(element.value || "").trim();

        if (value) {
            return value;
        }
    }

    return "";
}

function normalizeText(value) {
    return String(value ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();
}

function getElementText(element) {
    if (!element) {
        return "";
    }

    return normalizeText(
        element.innerText ||
        element.textContent ||
        ""
    );
}

function radioLabelContainsRadio(element) {
    return !!element.querySelector("input[type='radio']");
}

function getRadioQuestionTitle(element, fallbackNumber) {
    if (!element) {
        return `Вопрос ${fallbackNumber}`;
    }

    const directSelectors = [
        ".question-title",
        ".question-text",
        ".question-label",
        ".scenario-title",
        ".case-title",
        ".task-title",
        ".question-heading",
        ".question-header",
        "legend",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5"
    ];

    const radio = element.matches("input[type='radio']")
        ? element
        : element.querySelector("input[type='radio']");

    if (!radio) {
        return `Вопрос ${fallbackNumber}`;
    }

    const radioLabel = radio.closest("label");

    const containers = [];

    const fieldset = radio.closest("fieldset");

    if (fieldset) {
        containers.push(fieldset);
    }

    let parent = radio.parentElement;

    for (let level = 0; level < 10 && parent; level++) {
        if (!containers.includes(parent)) {
            containers.push(parent);
        }

        parent = parent.parentElement;
    }

    for (const container of containers) {
        const directChildren = Array.from(container.children);

        const directLegend = directChildren.find(
            child => child.matches("legend")
        );

        if (directLegend) {
            const text = getElementText(directLegend);

            if (text) {
                return text;
            }
        }

        for (const selector of directSelectors) {
            for (const child of directChildren) {
                if (!child.matches(selector)) {
                    continue;
                }

                if (
                    child === radioLabel ||
                    child.contains(radio) ||
                    radio.contains(child)
                ) {
                    continue;
                }

                if (child.matches("label")) {
                    continue;
                }

                if (radioLabelContainsRadio(child)) {
                    continue;
                }

                const text = getElementText(child);

                if (text && text.length <= 1000) {
                    return text;
                }
            }
        }

        if (radioLabel) {
            const labelParent = radioLabel.parentElement;

            if (labelParent) {
                const siblings = Array.from(
                    labelParent.children
                );

                const labelIndex =
                    siblings.indexOf(radioLabel);

                for (
                    let i = labelIndex - 1;
                    i >= 0;
                    i--
                ) {
                    const candidate = siblings[i];

                    if (
                        candidate.matches("label") ||
                        candidate.querySelector(
                            "input[type='radio']"
                        )
                    ) {
                        continue;
                    }

                    const text =
                        getElementText(candidate);

                    if (
                        text &&
                        text.length <= 1000
                    ) {
                        return text;
                    }
                }
            }
        }

        const radioParent = radio.parentElement;

        if (radioParent) {
            let current = radioParent;

            for (
                let level = 0;
                level < 5 && current;
                level++
            ) {
                const previous =
                    current.previousElementSibling;

                if (previous) {
                    const text =
                        getElementText(previous);

                    if (
                        text &&
                        text.length <= 1000 &&
                        !previous.matches("label") &&
                        !radioLabelContainsRadio(previous)
                    ) {
                        return text;
                    }
                }

                current = current.parentElement;
            }
        }
    }

    let current = radio;

    for (
        let level = 0;
        level < 10 && current;
        level++
    ) {
        const previous =
            current.previousElementSibling;

        if (previous) {
            for (const selector of directSelectors) {
                const title =
                    previous.matches(selector)
                        ? previous
                        : previous.querySelector(selector);

                if (
                    title &&
                    !title.matches("label") &&
                    !radioLabelContainsRadio(title)
                ) {
                    const text =
                        getElementText(title);

                    if (text) {
                        return text;
                    }
                }
            }

            if (
                !previous.matches("label") &&
                !radioLabelContainsRadio(previous)
            ) {
                const text =
                    getElementText(previous);

                if (
                    text &&
                    text.length <= 1000
                ) {
                    return text;
                }
            }
        }

        current = current.parentElement;
    }

    return `Вопрос ${fallbackNumber}`;
}

function findQuestionTitle(element, fallbackNumber) {
    if (!element) {
        return `Вопрос ${fallbackNumber}`;
    }

    if (
        element.matches("input[type='radio']")
    ) {
        return getRadioQuestionTitle(
            element,
            fallbackNumber
        );
    }

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

    let parent =
        element.parentElement;

    for (
        let level = 0;
        level < 8 && parent;
        level++
    ) {
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
                    child.matches(
                        selector
                    )
                ) {
                    const text =
                        normalizeText(
                            child.innerText
                        );

                    if (text) {
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

    return `Вопрос ${fallbackNumber}`;
}

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
                    first: radio,
                    radios: []
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
                    textarea,

                elementIndex:
                    index
            };
        }
    );
}

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
                    checkboxes: []
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

function collectAnswers(form) {
    const answers = [
        ...collectRadioAnswers(form),
        ...collectTextareaAnswers(form),
        ...collectSelectAnswers(form),
        ...collectCheckboxAnswers(form)
    ];

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

function clearPendingResult() {
    localStorage.removeItem(
        "pendingQuizResult"
    );
}

/*
 * =========================================================
 * ОТПРАВКА РЕЗУЛЬТАТА
 * =========================================================
 *
 * Раньше здесь было разбиение qaList на несколько
 * Discord-сообщений и несколько отдельных POST-запросов
 * (sendResultChunk). Это убрано: Worker уже сам режет
 * длинные ответы и раскидывает их по Discord embed'ам
 * (buildAnswerEmbeds / splitEmbedBatches на сервере),
 * поэтому дублировать это на фронте не нужно.
 *
 * Теперь один пройденный тест = один POST-запрос.
 * Это важно и для rate-limit на сервере: он рассчитан
 * именно на "один тест = один запрос".
 */
async function sendResultToDiscord(data) {
    if (
        !Array.isArray(data.qaList) ||
        !data.qaList.length
    ) {
        throw new Error(
            "Отсутствует qaList."
        );
    }

    const payload = {
        schoolKey: data.schoolKey,
        schoolTitle: data.schoolTitle,
        icName: data.icName,
        oocName: data.oocName,
        timeSpent: data.timeSpent,
        tabSwitches: data.tabSwitches,
        qaList: data.qaList,
        completedAt: data.completedAt
    };

    const response = await fetch(
        QUIZ_API_URL,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(payload),

            keepalive: true
        }
    );

    if (!response.ok) {
        let errorText = "";

        try {
            errorText = await response.text();
        } catch {
            errorText = "Неизвестная ошибка API";
        }

        throw new Error(
            `API ${response.status}: ${errorText}`
        );
    }

    return response;
}

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
                background: rgba(2, 6, 23, 0.92);
                backdrop-filter: blur(8px);
                font-family: Inter, Arial, sans-serif;
            }

            .quiz-submit-box {
                width: min(430px, calc(100vw - 40px));
                padding: 32px;
                text-align: center;
                background: #0f172a;
                border: 1px solid #26364d;
                border-radius: 16px;
                box-shadow: 0 25px 80px rgba(0,0,0,.45);
            }

            .quiz-spinner {
                width: 44px;
                height: 44px;
                margin: 0 auto 22px;
                border: 4px solid rgba(56,189,248,.2);
                border-top-color: #38bdf8;
                border-radius: 50%;
                animation: quizSpin .8s linear infinite;
            }

            .quiz-submit-title {
                color: #f8fafc;
                font-size: 22px;
                font-weight: 800;
                margin-bottom: 10px;
            }

            .quiz-submit-text {
                color: #38bdf8;
                font-size: 15px;
                font-weight: 700;
                margin-bottom: 8px;
            }

            .quiz-submit-subtext {
                color: #94a3b8;
                font-size: 13px;
                line-height: 1.5;
            }

            @keyframes quizSpin {
                from {
                    transform: rotate(0deg);
                }

                to {
                    transform: rotate(360deg);
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

function enableBeforeUnloadProtection() {
    window.onbeforeunload =
        function () {
            return (
                "Результаты теста ещё отправляются. " +
                "Пожалуйста, не закрывайте страницу."
            );
        };
}

function disableBeforeUnloadProtection() {
    window.onbeforeunload =
        null;
}

async function handleSubmit(event) {
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
        const icName =
            getIcName(
                form
            );

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

        const qaList =
            collectAnswers(
                form
            );

        if (
            !Array.isArray(
                qaList
            ) ||
            !qaList.length
        ) {
            throw new Error(
                "Не удалось собрать ответы теста."
            );
        }

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

        saveResult(
            result
        );

        showSubmittingScreen();

        enableBeforeUnloadProtection();

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

        await sendResultToDiscord(
            result
        );

        clearPendingResult();

        disableBeforeUnloadProtection();

        window.location.href =
            "results.html";
    } catch (error) {
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

        form.addEventListener(
            "submit",
            handleSubmit
        );
    }
);
