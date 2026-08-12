/* =========================================================
   TEXT HELPERS FOR DISCORD
========================================================= */

function cleanDiscordText(value) {

    return String(value ?? "")
        .replace(/@everyone/gi, "@\u200beveryone")
        .replace(/@here/gi, "@\u200bhere")
        .trim();

}


/* =========================================================
   SPLIT TEXT
========================================================= */

function splitText(text, maxLength) {

    const value =
        String(text ?? "");

    if (value.length <= maxLength) {

        return [value];

    }

    const chunks = [];

    let remaining = value;

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

        chunks.push(
            remaining.slice(
                0,
                cut
            )
        );

        remaining =
            remaining
                .slice(cut)
                .trimStart();

    }

    if (remaining.length) {

        chunks.push(
            remaining
        );

    }

    return chunks;

}


/* =========================================================
   EMBED SIZE
========================================================= */

function getEmbedSize(embed) {

    let size = 0;

    if (embed.title) {

        size +=
            String(
                embed.title
            ).length;

    }

    if (embed.description) {

        size +=
            String(
                embed.description
            ).length;

    }

    if (embed.footer?.text) {

        size +=
            String(
                embed.footer.text
            ).length;

    }

    for (
        const field of (
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


/* =========================================================
   VALIDATE EMBED
========================================================= */

function validateEmbed(embed) {

    const size =
        getEmbedSize(
            embed
        );

    /*
     * Discord:
     * максимум 6000 символов
     * на один embed.
     */

    if (size > 6000) {

        throw new Error(
            `Embed слишком большой: ${size} символов.`
        );

    }

    /*
     * Discord:
     * максимум 25 fields.
     */

    if (
        (embed.fields || []).length > 25
    ) {

        throw new Error(
            "В embed больше 25 полей."
        );

    }

    /*
     * Проверяем title.
     */

    if (
        embed.title &&
        String(embed.title).length > 256
    ) {

        throw new Error(
            "Title embed слишком длинный."
        );

    }

    /*
     * Проверяем description.
     */

    if (
        embed.description &&
        String(embed.description).length > 4096
    ) {

        throw new Error(
            "Description embed слишком длинный."
        );

    }

    /*
     * Проверяем footer.
     */

    if (
        embed.footer?.text &&
        String(embed.footer.text).length > 2048
    ) {

        throw new Error(
            "Footer embed слишком длинный."
        );

    }

    /*
     * Проверяем fields.
     */

    for (
        const field of (
            embed.fields || []
        )
    ) {

        if (
            String(
                field.name || ""
            ).length > 256
        ) {

            throw new Error(
                "Слишком длинное имя field."
            );

        }

        if (
            String(
                field.value || ""
            ).length > 1024
        ) {

            throw new Error(
                "Слишком длинное значение field."
            );

        }

    }

}


/* =========================================================
   CREATE ANSWER EMBEDS
========================================================= */

function buildAnswerEmbeds(qaList) {

    const embeds = [];

    let currentEmbed = {

        title:
            "📝 Ответы 1",

        fields:
            [],

        color:
            0x1e88e5

    };

    for (
        let index = 0;
        index < qaList.length;
        index++
    ) {

        const item =
            qaList[index] || {};

        /*
         * Название вопроса
         */

        const question =
            cleanDiscordText(
                item.title ||
                `Вопрос ${index + 1}`
            );

        /*
         * Ответ
         */

        const answer =
            cleanDiscordText(
                item.answer ||
                "Нет ответа"
            );

        /*
         * Discord field.value максимум 1024.
         *
         * Используем 850, чтобы оставался запас
         * для форматирования.
         */

        const chunks =
            splitText(
                answer,
                850
            );

        for (
            let chunkIndex = 0;
            chunkIndex < chunks.length;
            chunkIndex++
        ) {

            const chunk =
                chunks[chunkIndex];

            let fieldName =
                `Вопрос ${index + 1}`;

            if (
                chunks.length > 1
            ) {

                fieldName +=
                    ` — часть ${chunkIndex + 1}/${chunks.length}`;

            }

            /*
             * Защита question от слишком длинного
             * текста внутри field.value.
             */

            const safeQuestion =
                question.length > 1000
                    ? question.slice(0, 1000) + "…"
                    : question;

            const field = {

                name:
                    fieldName,

                value:
                    `**${safeQuestion}**\n${chunk}`,

                inline:
                    false

            };

            /*
             * Проверяем, помещается ли field
             * в текущий embed.
             */

            const proposedSize =
                getEmbedSize(
                    currentEmbed
                ) +
                field.name.length +
                field.value.length;

            /*
             * Оставляем запас до лимита Discord.
             */

            if (

                currentEmbed.fields.length >= 20 ||

                proposedSize > 5500

            ) {

                /*
                 * Сохраняем текущий embed.
                 */

                if (
                    currentEmbed.fields.length
                ) {

                    validateEmbed(
                        currentEmbed
                    );

                    embeds.push(
                        currentEmbed
                    );

                }

                /*
                 * Создаём новый.
                 */

                currentEmbed = {

                    title:
                        `📝 Ответы ${embeds.length + 1}`,

                    fields:
                        [],

                    color:
                        0x1e88e5

                };

            }

            currentEmbed.fields.push(
                field
            );

        }

    }

    /*
     * Добавляем последний embed.
     */

    if (
        currentEmbed.fields.length
    ) {

        validateEmbed(
            currentEmbed
        );

        embeds.push(
            currentEmbed
        );

    }

    return embeds;

}


/* =========================================================
   HEADER EMBED
========================================================= */

function buildHeaderEmbed(data) {

    const schoolTitle =
        cleanDiscordText(
            data.schoolTitle ||
            "LSPD QUALIFICATION TEST"
        );

    const icName =
        cleanDiscordText(
            data.icName ||
            "Не указано"
        );

    const oocName =
        cleanDiscordText(
            data.oocName ||
            "Не указано"
        );

    const timeSpent =
        cleanDiscordText(
            data.timeSpent ||
            "Неизвестно"
        );

    const tabSwitches =
        Number(
            data.tabSwitches
        ) || 0;

    const completedAt =
        data.completedAt ||
        new Date().toISOString();

    const embed = {

        title:
            `📋 ${schoolTitle}`,

        description:

            [

                "**ПРОЙДЕН ТЕСТ**",

                "",

                `👤 **IC:** ${icName}`,

                `🎮 **OOC / Discord:** ${oocName}`,

                `⏱️ **Время:** ${timeSpent}`,

                `⚠️ **Уходов со вкладки:** ${tabSwitches}`

            ].join("\n"),

        color:
            0x38bdf8,

        footer: {

            text:
                "LSPD Qualification Portal"

        },

        timestamp:
            completedAt

    };

    validateEmbed(
        embed
    );

    return embed;

}


/* =========================================================
   FOOTER EMBED
========================================================= */

function buildFooterEmbed(data) {

    const schoolKey =
        cleanDiscordText(
            data.schoolKey ||
            "LSPD"
        );

    const embed = {

        description:
            "✅ **Результаты тестирования сохранены.**",

        color:
            0x22c55e,

        footer: {

            text:
                `${schoolKey} • LSPD Qualification Portal`

        }

    };

    validateEmbed(
        embed
    );

    return embed;

}


/* =========================================================
   BUILD ALL QUIZ EMBEDS
========================================================= */

function buildQuizEmbeds(data) {

    const embeds = [];

    /*
     * HEADER
     */

    embeds.push(
        buildHeaderEmbed(
            data
        )
    );

    /*
     * QUESTIONS / ANSWERS
     */

    embeds.push(
        ...buildAnswerEmbeds(
            Array.isArray(data.qaList)
                ? data.qaList
                : []
        )
    );

    /*
     * FOOTER
     */

    embeds.push(
        buildFooterEmbed(
            data
        )
    );

    /*
     * Discord максимум 10 embeds
     * за один webhook.
     *
     * Но здесь мы возвращаем весь массив,
     * а ниже submitQuizResult разделит его.
     */

    return embeds;

}


/* =========================================================
   SPLIT EMBEDS INTO WEBHOOK BATCHES
========================================================= */

function splitEmbedBatches(embeds) {

    const batches = [];

    /*
     * Discord:
     * максимум 10 embeds
     * за один webhook request.
     */

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


/* =========================================================
   SEND DISCORD WEBHOOK
========================================================= */

async function sendDiscordWebhook(
    env,
    embeds,
    content = ""
) {

    /*
     * Проверяем Webhook URL
     */

    if (
        !env.DISCORD_WEBHOOK_URL
    ) {

        throw new Error(
            "DISCORD_WEBHOOK_URL не настроен в Cloudflare."
        );

    }

    /*
     * Проверяем embeds
     */

    if (
        !Array.isArray(embeds)
    ) {

        throw new Error(
            "Discord embeds должен быть массивом."
        );

    }

    if (
        embeds.length > 10
    ) {

        throw new Error(
            "Discord принимает максимум 10 embeds за один запрос."
        );

    }

    /*
     * Валидируем каждый embed
     */

    embeds.forEach(
        validateEmbed
    );

    /*
     * Создаём payload
     */

    const payload = {

        username:
            "Портал квалификации LSPD",

        content:
            cleanDiscordText(
                content
            ),

        embeds:
            embeds,

        allowed_mentions: {

            parse:
                []

        }

    };

    /*
     * Отправляем Discord webhook
     */

    const response =
        await fetch(
            env.DISCORD_WEBHOOK_URL,
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
                    )

            }
        );

    /*
     * Discord вернул ошибку
     */

    if (!response.ok) {

        let errorText =
            "";

        try {

            errorText =
                await response.text();

        } catch {

            errorText =
                "Неизвестная ошибка Discord.";

        }

        throw new Error(
            `Discord ${response.status}: ${errorText}`
        );

    }

}


/* =========================================================
   QUIZ RESULT HANDLER
========================================================= */

async function submitQuizResult(
    request,
    env
) {

    /*
     * Проверяем Discord Webhook
     */

    if (
        !env.DISCORD_WEBHOOK_URL
    ) {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "DISCORD_WEBHOOK_URL не настроен в Cloudflare."

            },
            500
        );

    }

    /*
     * Читаем JSON
     */

    let data;

    try {

        data =
            await request.json();

    } catch {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "Неверный JSON."

            },
            400
        );

    }

    /*
     * Проверяем основной объект
     */

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "Некорректные данные теста."

            },
            400
        );

    }

    /*
     * qaList обязателен
     */

    if (
        !Array.isArray(
            data.qaList
        )
    ) {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "Отсутствует qaList."

            },
            400
        );

    }

    /*
     * Ограничение количества вопросов
     */

    if (
        data.qaList.length > 500
    ) {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "Слишком много вопросов в результате."

            },
            413
        );

    }

    /*
     * Проверяем размер исходного JSON
     */

    let serialized;

    try {

        serialized =
            JSON.stringify(
                data
            );

    } catch {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "Не удалось обработать данные теста."

            },
            400
        );

    }

    /*
     * Не принимаем огромный payload
     */

    if (
        serialized.length > 900000
    ) {

        return jsonResponse(
            {

                success:
                    false,

                error:
                    "Результат теста слишком большой."

            },
            413
        );

    }

    /*
     * Нормализуем данные.
     */

    const result = {

        schoolKey:
            String(
                data.schoolKey ||
                "LSPD"
            ).slice(
                0,
                100
            ),

        schoolTitle:
            String(
                data.schoolTitle ||
                "LSPD QUALIFICATION TEST"
            ).slice(
                0,
                200
            ),

        icName:
            String(
                data.icName ||
                ""
            ).slice(
                0,
                500
            ),

        oocName:
            String(
                data.oocName ||
                ""
            ).slice(
                0,
                500
            ),

        timeSpent:
            String(
                data.timeSpent ||
                "Неизвестно"
            ).slice(
                0,
                100
            ),

        tabSwitches:
            Number(
                data.tabSwitches
            ) || 0,

        qaList:
            data.qaList.map(
                (item) => {

                    /*
                     * Защита от null,
                     * строк и других неожиданных типов.
                     */

                    const safeItem =
                        (
                            item &&
                            typeof item === "object"
                        )
                            ? item
                            : {};

                    return {

                        title:
                            String(
                                safeItem.title ||
                                "Вопрос"
                            ).slice(
                                0,
                                1000
                            ),

                        answer:
                            String(
                                safeItem.answer ||
                                "Нет ответа"
                            ),

                        type:
                            String(
                                safeItem.type ||
                                "unknown"
                            ).slice(
                                0,
                                50
                            )

                    };

                }
            ),

        completedAt:
            data.completedAt ||
            new Date().toISOString()

    };

    /*
     * Создаём и отправляем Discord embeds.
     */

    try {

        /*
         * Создаём все embeds.
         */

        const embeds =
            buildQuizEmbeds(
                result
            );

        /*
         * Проверяем, что что-то получилось.
         */

        if (
            !embeds.length
        ) {

            return jsonResponse(
                {

                    success:
                        false,

                    error:
                        "Не удалось создать Discord embeds."

                },
                500
            );

        }

        /*
         * Разбиваем embeds:
         *
         * 1 webhook = максимум 10 embeds.
         */

        const batches =
            splitEmbedBatches(
                embeds
            );

        /*
         * Отправляем batches ПОСЛЕДОВАТЕЛЬНО.
         *
         * Это важно:
         * не создаём одновременно несколько запросов
         * к Discord.
         */

        for (
            let i = 0;
            i < batches.length;
            i++
        ) {

            const content =
                i === 0
                    ? "📋 **Новый результат тестирования**"
                    : "";

            await sendDiscordWebhook(
                env,
                batches[i],
                content
            );

        }

        /*
         * Успех
         */

        return jsonResponse(
            {

                success:
                    true,

                message:
                    "Результат успешно отправлен.",

                batches:
                    batches.length,

                embeds:
                    embeds.length,

                questions:
                    result.qaList.length

            },
            200
        );

    } catch (error) {

        console.error(
            "Quiz result error:",
            error
        );

        return jsonResponse(
            {

                success:
                    false,

                error:
                    error?.message ||
                    "Не удалось отправить результат."

            },
            502
        );

    }

}
