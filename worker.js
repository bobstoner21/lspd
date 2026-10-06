const GITHUB_USERNAME = "bobstoner21";
const GITHUB_REPOSITORY = "lspd";
const GITHUB_BRANCH = "main";
const STATUS_FILE = "status.json";

const API_VERSION = "LSPD API v10";

/*
=========================================================
ALLOWED ORIGINS
=========================================================
*/

const ALLOWED_ORIGINS = [
    "https://lspd-f03.pages.dev"
];

/*
=========================================================
PUBLIC STATUS FALLBACK
=========================================================

Репозиторий GitHub приватный.

Поэтому если GitHub API не даст Worker-у прочитать
status.json из-за прав токена, Worker попробует получить
тот же status.json из опубликованного Pages-сайта.

Это позволяет /status продолжать работать даже при проблеме
с GitHub API.

*/

const PUBLIC_STATUS_URL =
    "https://lspd-f03.pages.dev/status.json";

/*
=========================================================
SIMPLE ADMIN PROTECTION
=========================================================
*/

const MAX_PASSWORD_FAILURES = 5;
const FAILURE_WINDOW_MS = 2 * 60 * 1000;

const MAX_REQUESTS = 10;
const REQUEST_WINDOW_MS = 5 * 1000;

const BLOCK_TIME_MS = 10 * 60 * 1000;

/*
=========================================================
QUIZ RESULT RATE LIMIT
=========================================================
*/

const MAX_QUIZ_SUBMISSIONS = 7;
const QUIZ_WINDOW_MS = 10 * 60 * 1000;
const QUIZ_BLOCK_TIME_MS = 15 * 60 * 1000;

/*
=========================================================
DISCORD LIMITS
=========================================================

Discord:
- максимум 10 embeds в одном сообщении;
- максимум 25 fields в одном embed;
- максимум 6000 символов суммарно по всем embeds
  одного сообщения.

Используем безопасный запас 5900.

*/

const DISCORD_MAX_EMBEDS_PER_MESSAGE = 10;
const DISCORD_MAX_FIELDS_PER_EMBED = 25;
const DISCORD_SAFE_TOTAL_SIZE = 5900;

const DISCORD_MAX_EMBED_SIZE = 6000;
const DISCORD_MAX_TITLE_LENGTH = 256;
const DISCORD_MAX_DESCRIPTION_LENGTH = 4096;
const DISCORD_MAX_FIELD_NAME_LENGTH = 256;
const DISCORD_MAX_FIELD_VALUE_LENGTH = 1024;
const DISCORD_MAX_FOOTER_LENGTH = 2048;
const DISCORD_MAX_AUTHOR_NAME_LENGTH = 256;

/*
=========================================================
WEBHOOK DELIVERY (RETRY / BACKOFF)
=========================================================

Discord вебхуки периодически отвечают:

- 429 (rate limit) — нужно ждать retry_after;
- 5xx (временный сбой на стороне Discord,
  в т.ч. "500: Internal Server Error, code 0").

Раньше при любой такой ошибке весь POST
на /quiz-result падал в catch, и Worker отвечал
клиенту 502 — при этом часть embeds (например,
только "шапка" теста) уже успевала уйти в Discord
до сбоя. В канал прилетала пустая карточка без
вопросов и ответов, хотя тест был пройден и
сохранён.

Ниже — ретраи с экспоненциальным backoff + пауза
между последовательными сообщениями одного теста,
чтобы Discord не резал нас лимитом при отправке
нескольких embeds подряд.

*/

const WEBHOOK_MAX_ATTEMPTS = 5;
const WEBHOOK_BASE_DELAY_MS = 400;
const WEBHOOK_MAX_DELAY_MS = 8000;
const WEBHOOK_PAUSE_BETWEEN_BATCHES_MS = 400;

/*
=========================================================
MAPS
=========================================================
*/

const adminProtection = new Map();
const quizProtection = new Map();

const MAP_MAX_SIZE = 5000;

function pruneMapIfNeeded(map) {
    if (map.size > MAP_MAX_SIZE) {
        map.clear();
    }
}

/*
=========================================================
SLEEP
=========================================================
*/

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/*
=========================================================
SAFE SLICE
=========================================================

Обычный String.slice(0, N) режет строку по 16-битным
"код-юнитам" (UTF-16). Эмодзи и часть символов (например
📋 📝 ⚠️) занимают ДВЕ такие единицы (суррогатную пару).

Если обрезать строку ровно между половинками пары,
получается битый одиночный суррогат. Локально такая
строка выглядит нормально и проходит все наши проверки
длины, но при отправке в Discord их парсер на такой
строке может упасть с generic "500: Internal Server
Error, code 0" вместо внятной ошибки валидации.

safeSlice подстраховывает границу: если символ прямо
перед точкой среза — "старшая" половинка суррогатной
пары, отступаем на 1 назад, чтобы не разрезать пару.

*/

function safeSlice(value, maxLength) {
    const str = String(value ?? "");

    if (str.length <= maxLength) {
        return str;
    }

    if (maxLength <= 0) {
        return "";
    }

    let end = maxLength;

    const code = str.charCodeAt(end - 1);

    if (code >= 0xd800 && code <= 0xdbff) {
        end -= 1;
    }

    return str.slice(0, end);
}

/*
=========================================================
STRIP INVALID CHARS
=========================================================

Убирает:

1. Управляющие символы (кроме \n, \r, \t), которые
   иногда попадают в текст при копипасте из других
   программ и могут ломать JSON-парсеры на стороне
   получателя.

2. "Одинокие" суррогаты — половинки суррогатных пар
   без парной половинки. Такое может возникнуть из-за
   обрезки строк в браузере/фронтенде ДО того, как
   данные попали в Worker (мы не контролируем весь
   путь данных, поэтому чистим ещё раз здесь).

*/

function stripInvalidChars(value) {
    const str = String(value ?? "");

    const noControlChars = str.replace(
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
        ""
    );

    const noLoneSurrogates = noControlChars.replace(
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)([\uDC00-\uDFFF])/g,
        (match, lowSurrogate) =>
            lowSurrogate ? match.slice(0, -1) : ""
    );

    return noLoneSurrogates;
}

/*
=========================================================
CLEAN + SAFE TRUNCATE
=========================================================

Комбинация очистки и безопасной обрезки — используется
везде, где текст из пользовательского ввода попадает
в итоговый JSON, отправляемый в Discord.

*/

function cleanAndSafeSlice(value, maxLength) {
    return safeSlice(
        stripInvalidChars(value),
        maxLength
    );
}

/*
=========================================================
CORS
=========================================================
*/

function corsHeaders(request) {
    const origin = request?.headers.get("Origin") || "";

    const allowOrigin =
        ALLOWED_ORIGINS.includes(origin)
            ? origin
            : "";

    const headers = {
        "Access-Control-Allow-Methods":
            "GET, POST, PUT, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type, X-Admin-Password",

        "Access-Control-Max-Age":
            "86400",

        "Cache-Control":
            "no-store, no-cache, must-revalidate, max-age=0",

        "Pragma":
            "no-cache",

        "Vary":
            "Origin"
    };

    if (allowOrigin) {
        headers["Access-Control-Allow-Origin"] =
            allowOrigin;
    }

    return headers;
}

/*
=========================================================
JSON RESPONSE
=========================================================
*/

function jsonResponse(
    data,
    status = 200,
    request = null
) {
    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=utf-8",

                ...corsHeaders(request)
            }
        }
    );
}

/*
=========================================================
CLIENT IP
=========================================================
*/

function getClientIP(request) {
    return (
        request.headers.get("CF-Connecting-IP") ||
        "unknown"
    );
}

/*
=========================================================
CONSTANT-TIME STRING COMPARE
=========================================================
*/

function timingSafeEqual(a, b) {
    const strA = String(a ?? "");
    const strB = String(b ?? "");

    if (strA.length !== strB.length) {
        return false;
    }

    let result = 0;

    for (let i = 0; i < strA.length; i++) {
        result |=
            strA.charCodeAt(i) ^
            strB.charCodeAt(i);
    }

    return result === 0;
}

/*
=========================================================
ADMIN PROTECTION STATE
=========================================================
*/

function getProtectionState(ip) {
    const now = Date.now();

    let state = adminProtection.get(ip);

    if (!state) {
        pruneMapIfNeeded(adminProtection);

        state = {
            failures: 0,
            failureStartedAt: now,

            requests: 0,
            requestStartedAt: now,

            blockedUntil: 0
        };

        adminProtection.set(ip, state);

        return state;
    }

    if (
        state.blockedUntil > 0 &&
        state.blockedUntil <= now
    ) {
        state.failures = 0;
        state.failureStartedAt = now;

        state.requests = 0;
        state.requestStartedAt = now;

        state.blockedUntil = 0;
    }

    if (
        now - state.failureStartedAt >
        FAILURE_WINDOW_MS
    ) {
        state.failures = 0;
        state.failureStartedAt = now;
    }

    if (
        now - state.requestStartedAt >
        REQUEST_WINDOW_MS
    ) {
        state.requests = 0;
        state.requestStartedAt = now;
    }

    return state;
}

/*
=========================================================
CHECK ADMIN IP
=========================================================
*/

function checkAdminIP(request) {
    const ip = getClientIP(request);
    const now = Date.now();

    const state =
        getProtectionState(ip);

    if (state.blockedUntil > now) {
        return {
            allowed: false,
            blocked: true,
            ip
        };
    }

    state.requests += 1;

    if (state.requests > MAX_REQUESTS) {
        state.blockedUntil =
            now + BLOCK_TIME_MS;

        return {
            allowed: false,
            blocked: true,
            ip
        };
    }

    return {
        allowed: true,
        blocked: false,
        ip
    };
}

/*
=========================================================
WRONG PASSWORD
=========================================================
*/

function recordWrongPassword(ip) {
    const now = Date.now();

    const state =
        getProtectionState(ip);

    if (state.blockedUntil > now) {
        return {
            blocked: true
        };
    }

    if (
        now - state.failureStartedAt >
        FAILURE_WINDOW_MS
    ) {
        state.failures = 0;
        state.failureStartedAt = now;
    }

    state.failures += 1;

    if (
        state.failures >=
        MAX_PASSWORD_FAILURES
    ) {
        state.blockedUntil =
            now + BLOCK_TIME_MS;

        return {
            blocked: true
        };
    }

    return {
        blocked: false,

        failures:
            state.failures,

        remaining:
            MAX_PASSWORD_FAILURES -
            state.failures
    };
}

/*
=========================================================
SUCCESSFUL LOGIN
=========================================================
*/

function recordSuccessfulLogin(ip) {
    adminProtection.delete(ip);
}

/*
=========================================================
ADMIN PROTECTION
=========================================================
*/

function protectAdmin(request) {
    const result =
        checkAdminIP(request);

    if (!result.allowed) {
        return {
            allowed: false,

            response:
                new Response(
                    "Not Found",
                    {
                        status: 404,
                        headers:
                            corsHeaders(request)
                    }
                )
        };
    }

    return {
        allowed: true,
        ip: result.ip
    };
}

/*
=========================================================
QUIZ RATE LIMIT
=========================================================
*/

function checkQuizRateLimit(request) {
    const ip = getClientIP(request);
    const now = Date.now();

    let state =
        quizProtection.get(ip);

    if (!state) {
        pruneMapIfNeeded(
            quizProtection
        );

        state = {
            count: 0,
            windowStartedAt: now,
            blockedUntil: 0
        };

        quizProtection.set(
            ip,
            state
        );
    }

    if (
        state.blockedUntil > 0 &&
        state.blockedUntil <= now
    ) {
        state.count = 0;
        state.windowStartedAt = now;
        state.blockedUntil = 0;
    }

    if (
        state.blockedUntil > now
    ) {
        return {
            allowed: false
        };
    }

    if (
        now - state.windowStartedAt >
        QUIZ_WINDOW_MS
    ) {
        state.count = 0;
        state.windowStartedAt = now;
    }

    state.count += 1;

    if (
        state.count >
        MAX_QUIZ_SUBMISSIONS
    ) {
        state.blockedUntil =
            now + QUIZ_BLOCK_TIME_MS;

        return {
            allowed: false
        };
    }

    return {
        allowed: true
    };
}

/*
=========================================================
GITHUB HEADERS
=========================================================
*/

function githubHeaders(env) {
    const headers = {
        "Accept":
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28",

        "User-Agent":
            "LSPD-School-API"
    };

    if (env.GITHUB_TOKEN) {
        headers["Authorization"] =
            `Bearer ${env.GITHUB_TOKEN}`;
    }

    return headers;
}

/*
=========================================================
DEFAULT STATUS
=========================================================
*/

function defaultStatuses() {
    return {
        fto: false,
        supervisor: false,
        metro: false,
        swat: false
    };
}

/*
=========================================================
NORMALIZE STATUS
=========================================================
*/

function normalizeStatuses(value) {
    if (
        !value ||
        typeof value !== "object"
    ) {
        return defaultStatuses();
    }

    return {
        fto: Boolean(value.fto),
        supervisor: Boolean(value.supervisor),
        metro: Boolean(value.metro),
        swat: Boolean(value.swat)
    };
}

/*
=========================================================
BASE64 -> UTF8
=========================================================
*/

function decodeBase64(base64) {
    const clean =
        String(base64 || "")
            .replace(/\s/g, "")
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const binary =
        atob(clean);

    const bytes =
        Uint8Array.from(
            binary,
            char =>
                char.charCodeAt(0)
        );

    return new TextDecoder()
        .decode(bytes);
}

/*
=========================================================
UTF8 -> BASE64
=========================================================
*/

function encodeBase64(text) {
    const bytes =
        new TextEncoder()
            .encode(text);

    let binary = "";

    for (const byte of bytes) {
        binary +=
            String.fromCharCode(byte);
    }

    return btoa(binary);
}

/*
=========================================================
GITHUB URL
=========================================================
*/

function githubStatusUrl() {
    return (
        `https://api.github.com/repos/` +
        `${GITHUB_USERNAME}/` +
        `${GITHUB_REPOSITORY}/` +
        `contents/${STATUS_FILE}`
    );
}

/*
=========================================================
GET STATUS FILE FROM GITHUB
=========================================================
*/

async function getGithubStatusFile(env) {
    const url =
        githubStatusUrl() +
        `?ref=${encodeURIComponent(
            GITHUB_BRANCH
        )}`;

    try {
        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers:
                        githubHeaders(env),

                    cache: "no-store"
                }
            );

        const text =
            await response.text();

        if (!response.ok) {
            return {
                ok: false,

                status:
                    response.status,

                error:
                    text ||
                    `GitHub HTTP ${response.status}`
            };
        }

        let file;

        try {
            file =
                JSON.parse(text);
        } catch {
            return {
                ok: false,
                status: 500,
                error:
                    "GitHub вернул неправильный JSON."
            };
        }

        return {
            ok: true,
            file
        };

    } catch (error) {
        return {
            ok: false,
            status: 502,

            error:
                error instanceof Error
                    ? error.message
                    : "Ошибка соединения с GitHub."
        };
    }
}

/*
=========================================================
GET PUBLIC STATUS FALLBACK
=========================================================
*/

async function getPublicStatusFile() {
    const url =
        PUBLIC_STATUS_URL +
        `?worker_cache_bust=${Date.now()}`;

    try {
        const response =
            await fetch(
                url,
                {
                    method: "GET",

                    headers: {
                        "Cache-Control":
                            "no-cache"
                    },

                    cache: "no-store"
                }
            );

        const text =
            await response.text();

        if (!response.ok) {
            return {
                ok: false,

                status:
                    response.status,

                error:
                    text ||
                    `Pages HTTP ${response.status}`
            };
        }

        let parsed;

        try {
            parsed =
                JSON.parse(text);
        } catch {
            return {
                ok: false,
                status: 500,

                error:
                    "Pages status.json содержит неправильный JSON."
            };
        }

        return {
            ok: true,
            data: parsed
        };

    } catch (error) {
        return {
            ok: false,
            status: 502,

            error:
                error instanceof Error
                    ? error.message
                    : "Ошибка получения status.json из Pages."
        };
    }
}

/*
=========================================================
GET STATUS
=========================================================

Сначала GitHub API.

Если приватный репозиторий не даёт доступ —
берём опубликованный status.json с Pages.

*/

async function getStatuses(env, request) {
    const github =
        await getGithubStatusFile(env);

    if (github.ok) {
        let content;

        try {
            content =
                decodeBase64(
                    github.file.content || ""
                );
        } catch {
            content = "";
        }

        try {
            const statuses =
                JSON.parse(content);

            return jsonResponse(
                {
                    success: true,
                    statuses:
                        normalizeStatuses(
                            statuses
                        ),

                    source:
                        "github"
                },
                200,
                request
            );

        } catch {
            /*
             * GitHub-файл повреждён.
             * Ниже попробуем Pages.
             */
        }
    }

    /*
     * FALLBACK:
     * status.json с Pages.
     */

    const publicStatus =
        await getPublicStatusFile();

    if (publicStatus.ok) {
        return jsonResponse(
            {
                success: true,

                statuses:
                    normalizeStatuses(
                        publicStatus.data
                    ),

                source:
                    "pages"
            },
            200,
            request
        );
    }

    return jsonResponse(
        {
            success: false,

            error:
                "Не удалось получить status.json ни из GitHub, ни из Pages.",

            githubError:
                github.error || null,

            githubStatus:
                github.status || null,

            pagesError:
                publicStatus.error || null,

            pagesStatus:
                publicStatus.status || null
        },
        502,
        request
    );
}

/*
=========================================================
PASSWORD CHECK
=========================================================
*/

function checkAdminPassword(
    request,
    env,
    ip
) {
    if (!env.ADMIN_PASSWORD) {
        return {
            ok: false,

            response:
                jsonResponse(
                    {
                        success: false,

                        error:
                            "ADMIN_PASSWORD не настроен в Cloudflare."
                    },
                    500,
                    request
                )
        };
    }

    const password =
        request.headers.get(
            "X-Admin-Password"
        );

    if (!password) {
        const failure =
            recordWrongPassword(ip);

        if (failure.blocked) {
            return {
                ok: false,

                response:
                    new Response(
                        "Not Found",
                        {
                            status: 404,
                            headers:
                                corsHeaders(
                                    request
                                )
                        }
                    )
            };
        }

        return {
            ok: false,

            response:
                jsonResponse(
                    {
                        success: false,

                        error:
                            "Пароль администратора не передан."
                    },
                    401,
                    request
                )
        };
    }

    if (
        !timingSafeEqual(
            password,
            env.ADMIN_PASSWORD
        )
    ) {
        const failure =
            recordWrongPassword(ip);

        if (failure.blocked) {
            return {
                ok: false,

                response:
                    new Response(
                        "Not Found",
                        {
                            status: 404,
                            headers:
                                corsHeaders(
                                    request
                                )
                        }
                    )
            };
        }

        return {
            ok: false,

            response:
                jsonResponse(
                    {
                        success: false,

                        error:
                            "Неверный пароль администратора.",

                        remainingAttempts:
                            failure.remaining
                    },
                    403,
                    request
                )
        };
    }

    recordSuccessfulLogin(ip);

    return {
        ok: true
    };
}

/*
=========================================================
ADMIN LOGIN
=========================================================
*/

async function adminLogin(
    request,
    env
) {
    const protection =
        protectAdmin(request);

    if (!protection.allowed) {
        return protection.response;
    }

    const auth =
        checkAdminPassword(
            request,
            env,
            protection.ip
        );

    if (!auth.ok) {
        return auth.response;
    }

    return jsonResponse(
        {
            success: true,

            authenticated: true,

            message:
                "Авторизация успешна."
        },
        200,
        request
    );
}

/*
=========================================================
UPDATE STATUS
=========================================================
*/

async function updateStatuses(
    request,
    env
) {
    const protection =
        protectAdmin(request);

    if (!protection.allowed) {
        return protection.response;
    }

    const auth =
        checkAdminPassword(
            request,
            env,
            protection.ip
        );

    if (!auth.ok) {
        return auth.response;
    }

    if (!env.GITHUB_TOKEN) {
        return jsonResponse(
            {
                success: false,

                error:
                    "GITHUB_TOKEN не настроен в Cloudflare."
            },
            500,
            request
        );
    }

    let body;

    try {
        body =
            await request.json();
    } catch {
        return jsonResponse(
            {
                success: false,

                error:
                    "Неверный JSON."
            },
            400,
            request
        );
    }

    if (
        !body ||
        typeof body !== "object" ||
        !body.statuses
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Отсутствует объект statuses."
            },
            400,
            request
        );
    }

    const statuses =
        normalizeStatuses(
            body.statuses
        );

    const current =
        await getGithubStatusFile(
            env
        );

    if (!current.ok) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Не удалось получить status.json из GitHub для сохранения.",

                details:
                    current.error,

                status:
                    current.status
            },
            current.status || 502,
            request
        );
    }

    if (!current.file.sha) {
        return jsonResponse(
            {
                success: false,

                error:
                    "GitHub не вернул SHA status.json."
            },
            500,
            request
        );
    }

    const content =
        JSON.stringify(
            statuses,
            null,
            2
        ) + "\n";

    const encodedContent =
        encodeBase64(content);

    try {
        const response =
            await fetch(
                githubStatusUrl(),
                {
                    method: "PUT",

                    headers: {
                        ...githubHeaders(env),

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            {
                                message:
                                    "Update school statuses",

                                content:
                                    encodedContent,

                                sha:
                                    current.file.sha,

                                branch:
                                    GITHUB_BRANCH
                            }
                        )
                }
            );

        const text =
            await response.text();

        if (!response.ok) {
            return jsonResponse(
                {
                    success: false,

                    error:
                        "GitHub не разрешил сохранить status.json.",

                    details:
                        text,

                    status:
                        response.status
                },
                response.status,
                request
            );
        }

        return jsonResponse(
            {
                success: true,

                message:
                    "Статусы успешно сохранены.",

                statuses,

                note:
                    "Pages может обновить опубликованный status.json с небольшой задержкой."
            },
            200,
            request
        );

    } catch (error) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Ошибка соединения с GitHub.",

                details:
                    error instanceof Error
                        ? error.message
                        : "Unknown error"
            },
            502,
            request
        );
    }
}

/*
=========================================================
DISCORD TEXT
=========================================================
*/

function cleanDiscordText(value) {
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

/*
=========================================================
TRUNCATE TEXT
=========================================================
*/

function truncateText(
    text,
    maxLength
) {
    const value =
        String(text ?? "");

    if (
        value.length <=
        maxLength
    ) {
        return value;
    }

    if (maxLength <= 3) {
        return safeSlice(
            value,
            maxLength
        );
    }

    return (
        safeSlice(
            value,
            maxLength - 3
        ) +
        "..."
    );
}

/*
=========================================================
SPLIT TEXT
=========================================================
*/

function splitText(
    text,
    maxLength
) {
    const value =
        String(text ?? "");

    if (
        value.length <=
        maxLength
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
        let cut =
            remaining.lastIndexOf(
                "\n",
                maxLength
            );

        if (cut < 300) {
            cut =
                remaining.lastIndexOf(
                    " ",
                    maxLength
                );
        }

        if (cut < 1) {
            cut =
                maxLength;
        }

        /*
         * Не резать посередине суррогатной пары
         * (эмодзи и т.п.), иначе получим битый
         * символ на границе чанка.
         */
        const cutCode =
            remaining.charCodeAt(
                cut - 1
            );

        if (
            cutCode >= 0xd800 &&
            cutCode <= 0xdbff
        ) {
            cut -= 1;
        }

        const chunk =
            remaining
                .slice(0, cut)
                .trimEnd();

        chunks.push(chunk);

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

/*
=========================================================
EMBED SIZE
=========================================================

Учитываются все текстовые части embed:

- title
- description
- author.name
- footer.text
- field.name
- field.value

URL сами по себе в этот лимит символов не входят.

*/

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

    if (
        embed.author?.name
    ) {
        size +=
            String(
                embed.author.name
            ).length;
    }

    if (
        embed.footer?.text
    ) {
        size +=
            String(
                embed.footer.text
            ).length;
    }

    for (
        const field of
        (embed.fields || [])
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

/*
=========================================================
VALIDATE SINGLE EMBED
=========================================================
*/

function validateEmbed(embed) {
    if (!embed || typeof embed !== "object") {
        throw new Error(
            "Некорректный Discord embed."
        );
    }

    const size =
        getEmbedSize(embed);

    if (
        size >
        DISCORD_MAX_EMBED_SIZE
    ) {
        throw new Error(
            `Embed слишком большой: ${size}/${DISCORD_MAX_EMBED_SIZE}`
        );
    }

    if (
        String(
            embed.title || ""
        ).length >
        DISCORD_MAX_TITLE_LENGTH
    ) {
        throw new Error(
            "Слишком длинный title Discord embed."
        );
    }

    if (
        String(
            embed.description || ""
        ).length >
        DISCORD_MAX_DESCRIPTION_LENGTH
    ) {
        throw new Error(
            "Слишком длинное description Discord embed."
        );
    }

    if (
        String(
            embed.footer?.text || ""
        ).length >
        DISCORD_MAX_FOOTER_LENGTH
    ) {
        throw new Error(
            "Слишком длинный footer Discord embed."
        );
    }

    if (
        String(
            embed.author?.name || ""
        ).length >
        DISCORD_MAX_AUTHOR_NAME_LENGTH
    ) {
        throw new Error(
            "Слишком длинное имя author Discord embed."
        );
    }

    if (
        (embed.fields || []).length >
        DISCORD_MAX_FIELDS_PER_EMBED
    ) {
        throw new Error(
            "В embed больше 25 полей."
        );
    }

    for (
        const field of
        (embed.fields || [])
    ) {
        if (
            String(
                field.name || ""
            ).length >
            DISCORD_MAX_FIELD_NAME_LENGTH
        ) {
            throw new Error(
                "Слишком длинное имя field."
            );
        }

        if (
            String(
                field.value || ""
            ).length >
            DISCORD_MAX_FIELD_VALUE_LENGTH
        ) {
            throw new Error(
                "Слишком длинное значение field."
            );
        }
    }

    return true;
}

/*
=========================================================
VALIDATE DISCORD MESSAGE
=========================================================

Проверяет уже ВСЕ embeds, которые пойдут
одним POST-запросом.

*/

function validateDiscordMessage(
    embeds
) {
    if (
        !Array.isArray(embeds)
    ) {
        throw new Error(
            "Discord embeds должны быть массивом."
        );
    }

    if (
        embeds.length >
        DISCORD_MAX_EMBEDS_PER_MESSAGE
    ) {
        throw new Error(
            `Слишком много embeds в одном сообщении: ${embeds.length}/${DISCORD_MAX_EMBEDS_PER_MESSAGE}`
        );
    }

    let totalSize = 0;

    for (
        const embed of embeds
    ) {
        validateEmbed(embed);

        totalSize +=
            getEmbedSize(embed);
    }

    if (
        totalSize >
        DISCORD_MAX_EMBED_SIZE
    ) {
        throw new Error(
            `Суммарный размер embeds слишком большой: ${totalSize}/${DISCORD_MAX_EMBED_SIZE}`
        );
    }

    return true;
}

/*
=========================================================
CREATE ANSWER FIELD NAME
=========================================================
*/

function buildFieldName(
    question,
    questionNumber,
    chunkIndex,
    totalChunks
) {
    let suffix =
        `Вопрос ${questionNumber}`;

    if (totalChunks > 1) {
        suffix +=
            ` — часть ${chunkIndex + 1}/${totalChunks}`;
    }

    const separator =
        ": ";

    const maxQuestionLength =
        Math.max(
            0,
            DISCORD_MAX_FIELD_NAME_LENGTH -
                suffix.length -
                separator.length
        );

    const shortQuestion =
        truncateText(
            question,
            maxQuestionLength
        );

    if (shortQuestion) {
        return (
            suffix +
            separator +
            shortQuestion
        );
    }

    return suffix;
}

/*
=========================================================
CREATE ANSWER EMBEDS
=========================================================

Каждый вопрос:

field.name:
    Вопрос N: короткий текст вопроса

field.value:
    только ответ

Ответ разбивается на chunks <= 1000,
чтобы гарантированно оставаться ниже Discord 1024.

*/

function buildAnswerEmbeds(
    qaList
) {
    const embeds = [];

    let currentEmbed = {
        title: "📝 Ответы 1",

        fields: [],

        color: 0x1e88e5
    };

    for (
        let index = 0;
        index < qaList.length;
        index++
    ) {
        const item =
            qaList[index] || {};

        const question =
            cleanDiscordText(
                item.title ||
                `Вопрос ${index + 1}`
            );

        const answer =
            cleanDiscordText(
                item.answer ||
                "Нет ответа"
            );

        /*
         * 1000 вместо 1024 —
         * оставляем запас.
         */
        const chunks =
            splitText(
                answer,
                1000
            );

        for (
            let chunkIndex = 0;
            chunkIndex < chunks.length;
            chunkIndex++
        ) {
            const chunk =
                chunks[chunkIndex];

            const fieldName =
                buildFieldName(
                    question,
                    index + 1,
                    chunkIndex,
                    chunks.length
                );

            const field = {
                name:
                    fieldName,

                value:
                    chunk ||
                    "Нет ответа",

                inline:
                    false
            };

            const proposedSize =
                getEmbedSize(
                    currentEmbed
                ) +
                field.name.length +
                field.value.length;

            /*
             * Не превышаем:
             * - 25 fields
             * - безопасные 5900 символов
             */
            if (
                currentEmbed.fields.length >=
                    DISCORD_MAX_FIELDS_PER_EMBED ||
                proposedSize >
                    DISCORD_SAFE_TOTAL_SIZE
            ) {
                validateEmbed(
                    currentEmbed
                );

                embeds.push(
                    currentEmbed
                );

                currentEmbed = {
                    title:
                        `📝 Ответы ${embeds.length + 1}`,

                    fields: [],

                    color: 0x1e88e5
                };
            }

            currentEmbed.fields.push(
                field
            );
        }
    }

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

/*
=========================================================
HEADER EMBED
=========================================================
*/

function buildHeaderEmbed(
    data
) {
    return {
        title:
            truncateText(
                `📋 ${cleanDiscordText(data.schoolTitle)}`,
                DISCORD_MAX_TITLE_LENGTH
            ),

        description: [
            "**ПРОЙДЕН ТЕСТ**",
            "",
            `👤 **IC:** ${truncateText(
                cleanDiscordText(data.icName),
                500
            )}`,
            `🎮 **OOC / Discord:** ${truncateText(
                cleanDiscordText(data.oocName),
                500
            )}`,
            `⏱️ **Время:** ${truncateText(
                cleanDiscordText(data.timeSpent),
                100
            )}`,
            `⚠️ **Уходов со вкладки:** ${
                Number(data.tabSwitches) || 0
            }`
        ].join("\n"),

        color:
            0x38bdf8,

        footer: {
            text:
                "LSPD Qualification Portal"
        },

        timestamp:
            data.completedAt ||
            new Date().toISOString()
    };
}

/*
=========================================================
FOOTER EMBED
=========================================================
*/

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
                truncateText(
                    `${cleanDiscordText(
                        data.schoolKey
                    )} • LSPD Qualification Portal`,
                    DISCORD_MAX_FOOTER_LENGTH
                )
        }
    };
}

/*
=========================================================
BUILD ALL EMBEDS
=========================================================
*/

function buildQuizEmbeds(
    data
) {
    const embeds = [];

    embeds.push(
        buildHeaderEmbed(
            data
        )
    );

    embeds.push(
        ...buildAnswerEmbeds(
            Array.isArray(
                data.qaList
            )
                ? data.qaList
                : []
        )
    );

    embeds.push(
        buildFooterEmbed(
            data
        )
    );

    return embeds;
}

/*
=========================================================
SPLIT EMBEDS INTO DISCORD MESSAGE BATCHES
=========================================================

Каждое сообщение проверяется по:

1. максимум 10 embeds;
2. максимум 5900 символов суммарно.

*/

function splitEmbedBatches(
    embeds
) {
    const batches = [];

    let currentBatch = [];
    let currentSize = 0;

    for (
        const embed of embeds
    ) {
        const embedSize =
            getEmbedSize(
                embed
            );

        if (
            embedSize >
            DISCORD_SAFE_TOTAL_SIZE
        ) {
            throw new Error(
                `Один embed слишком большой для Discord batch: ${embedSize}/${DISCORD_SAFE_TOTAL_SIZE}`
            );
        }

        const wouldExceedCount =
            currentBatch.length >=
            DISCORD_MAX_EMBEDS_PER_MESSAGE;

        const wouldExceedSize =
            currentSize +
            embedSize >
            DISCORD_SAFE_TOTAL_SIZE;

        if (
            currentBatch.length &&
            (
                wouldExceedCount ||
                wouldExceedSize
            )
        ) {
            validateDiscordMessage(
                currentBatch
            );

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
        validateDiscordMessage(
            currentBatch
        );

        batches.push(
            currentBatch
        );
    }

    return batches;
}

/*
=========================================================
SEND DISCORD WEBHOOK (SINGLE ATTEMPT)
=========================================================
*/

async function sendDiscordWebhookOnce(
    env,
    embeds,
    content
) {
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
            parse: []
        }
    };

    return await fetch(
        env.DISCORD_WEBHOOK_URL,
        {
            method: "POST",

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
}

/*
=========================================================
SEND DISCORD WEBHOOK WITH RETRY
=========================================================

Discord периодически отвечает 429 (rate limit)
или временными 5xx-ошибками (в т.ч. "code: 0").

Раньше одна такая ошибка на ЛЮБОМ из батчей
роняла весь /quiz-result в catch — при этом
предыдущие батчи (например, "шапка" теста)
уже успевали уйти в канал, а вопросы/ответы —
нет. Отсюда пустые карточки без результатов.

Теперь каждый батч отправляется с повторными
попытками и экспоненциальной задержкой,
плюс уважаем Retry-After при 429.

*/

async function sendDiscordWebhookWithRetry(
    env,
    embeds,
    content = ""
) {
    if (
        !env.DISCORD_WEBHOOK_URL
    ) {
        throw new Error(
            "DISCORD_WEBHOOK_URL не настроен в Cloudflare."
        );
    }

    /*
     * Проверяем именно ВСЁ сообщение,
     * а не отдельные embeds.
     */
    validateDiscordMessage(
        embeds
    );

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= WEBHOOK_MAX_ATTEMPTS;
        attempt++
    ) {
        let response;

        try {
            response =
                await sendDiscordWebhookOnce(
                    env,
                    embeds,
                    content
                );
        } catch (networkError) {
            /*
             * Сетевая ошибка (fetch упал целиком) —
             * тоже пробуем ретраить.
             */
            lastError =
                networkError instanceof Error
                    ? networkError
                    : new Error(
                          "Сетевая ошибка при отправке в Discord."
                      );

            if (
                attempt <
                WEBHOOK_MAX_ATTEMPTS
            ) {
                const delay =
                    Math.min(
                        WEBHOOK_BASE_DELAY_MS *
                            Math.pow(2, attempt - 1),
                        WEBHOOK_MAX_DELAY_MS
                    ) +
                    Math.floor(
                        Math.random() * 250
                    );

                await sleep(delay);

                continue;
            }

            throw lastError;
        }

        if (response.ok) {
            return;
        }

        let errorText = "";

        try {
            errorText =
                await response.text();
        } catch {
            errorText =
                "Неизвестная ошибка Discord.";
        }

        lastError = new Error(
            `Discord ${response.status}: ${errorText}`
        );

        /*
         * 429 — уважаем Retry-After
         * (и в заголовке, и в теле).
         */
        if (response.status === 429) {
            let retryAfterMs =
                WEBHOOK_BASE_DELAY_MS *
                Math.pow(2, attempt - 1);

            const headerRetry =
                response.headers.get(
                    "Retry-After"
                );

            if (headerRetry) {
                const parsed =
                    parseFloat(
                        headerRetry
                    );

                if (
                    !Number.isNaN(
                        parsed
                    )
                ) {
                    retryAfterMs =
                        Math.ceil(
                            parsed * 1000
                        );
                }
            } else {
                try {
                    const body =
                        JSON.parse(
                            errorText
                        );

                    if (
                        body &&
                        typeof body.retry_after ===
                            "number"
                    ) {
                        retryAfterMs =
                            Math.ceil(
                                body.retry_after *
                                    1000
                            );
                    }
                } catch {
                    /* тело не JSON — используем backoff по умолчанию */
                }
            }

            if (
                attempt <
                WEBHOOK_MAX_ATTEMPTS
            ) {
                await sleep(
                    Math.min(
                        retryAfterMs + 150,
                        WEBHOOK_MAX_DELAY_MS
                    )
                );

                continue;
            }

            throw lastError;
        }

        /*
         * 5xx — временный сбой Discord,
         * ретраим с backoff.
         */
        if (response.status >= 500) {
            if (
                attempt <
                WEBHOOK_MAX_ATTEMPTS
            ) {
                const delay =
                    Math.min(
                        WEBHOOK_BASE_DELAY_MS *
                            Math.pow(2, attempt - 1),
                        WEBHOOK_MAX_DELAY_MS
                    ) +
                    Math.floor(
                        Math.random() * 250
                    );

                await sleep(delay);

                continue;
            }

            throw lastError;
        }

        /*
         * Остальные 4xx (400, 401, 404 и т.д.) —
         * повторная отправка того же payload
         * ничего не изменит, ретраить бессмысленно.
         */
        throw lastError;
    }

    throw (
        lastError ||
        new Error(
            "Не удалось отправить сообщение в Discord."
        )
    );
}

/*
=========================================================
SEND ALL BATCHES
=========================================================

Отправляем батчи ПОСЛЕДОВАТЕЛЬНО (порядок важен —
сначала шапка, потом ответы, потом footer), с
паузой между сообщениями, чтобы не словить рейт-лимит
Discord при нескольких embeds подряд.

Если какой-то батч не удалось отправить даже после
всех ретраев — бросаем ошибку с указанием, сколько
батчей всё-таки успело уйти, чтобы это было видно
в логах Worker-а.

*/

async function sendAllQuizBatches(
    env,
    batches
) {
    for (
        let i = 0;
        i < batches.length;
        i++
    ) {
        try {
            await sendDiscordWebhookWithRetry(
                env,

                batches[i],

                i === 0
                    ? "📋 **Новый результат тестирования**"
                    : ""
            );
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Неизвестная ошибка Discord.";

            throw new Error(
                `Отправлено ${i}/${batches.length} сообщений, ` +
                `затем сбой: ${message}`
            );
        }

        if (
            i <
            batches.length - 1
        ) {
            await sleep(
                WEBHOOK_PAUSE_BETWEEN_BATCHES_MS
            );
        }
    }
}

/*
=========================================================
TURNSTILE VERIFICATION
=========================================================
*/

async function verifyTurnstileToken(
    env,
    token,
    ip
) {
    if (
        !env.TURNSTILE_SECRET_KEY
    ) {
        return {
            ok: false,

            error:
                "TURNSTILE_SECRET_KEY не настроен в Cloudflare."
        };
    }

    if (
        !token ||
        typeof token !== "string"
    ) {
        return {
            ok: false,

            error:
                "Отсутствует токен проверки безопасности. Обновите страницу и попробуйте снова."
        };
    }

    const formData =
        new URLSearchParams();

    formData.append(
        "secret",
        env.TURNSTILE_SECRET_KEY
    );

    formData.append(
        "response",
        token
    );

    if (
        ip &&
        ip !== "unknown"
    ) {
        formData.append(
            "remoteip",
            ip
        );
    }

    try {
        const response =
            await fetch(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },

                    body:
                        formData.toString()
                }
            );

        const result =
            await response.json();

        if (
            !result.success
        ) {
            return {
                ok: false,

                error:
                    "Проверка безопасности не пройдена.",

                codes:
                    result["error-codes"] ||
                    []
            };
        }

        return {
            ok: true
        };

    } catch {
        return {
            ok: false,

            error:
                "Ошибка соединения с сервисом проверки безопасности."
        };
    }
}

/*
=========================================================
QUIZ RESULT
=========================================================
*/

async function submitQuizResult(
    request,
    env
) {
    /*
     * RATE LIMIT
     */

    const rateLimit =
        checkQuizRateLimit(
            request
        );

    if (
        !rateLimit.allowed
    ) {
        return new Response(
            "Not Found",
            {
                status: 404,

                headers:
                    corsHeaders(
                        request
                    )
            }
        );
    }

    /*
     * DISCORD WEBHOOK
     */

    if (
        !env.DISCORD_WEBHOOK_URL
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "DISCORD_WEBHOOK_URL не настроен в Cloudflare."
            },
            500,
            request
        );
    }

    /*
     * BODY
     */

    let data;

    try {
        data =
            await request.json();
    } catch {
        return jsonResponse(
            {
                success: false,

                error:
                    "Неверный JSON."
            },
            400,
            request
        );
    }

    if (
        !data ||
        typeof data !== "object"
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Некорректные данные теста."
            },
            400,
            request
        );
    }

    /*
     * TURNSTILE
     */

    const turnstileCheck =
        await verifyTurnstileToken(
            env,
            data.turnstileToken,
            getClientIP(request)
        );

    if (
        !turnstileCheck.ok
    ) {
        /*
         * ДИАГНОСТИКА:
         *
         * Раньше error-codes от Cloudflare siteverify
         * (timeout-or-duplicate, invalid-input-response,
         * internal-error и т.д.) нигде не логировались —
         * мы просто отдавали клиенту общий текст ошибки
         * и не могли понять, ПОЧЕМУ конкретно не прошла
         * проверка у конкретных пользователей (например,
         * массово у части пользователей из РФ).
         *
         * Теперь логируем причину + IP + страну
         * (request.cf.country заполняется Cloudflare
         * автоматически, без доп. вызовов) — это видно
         * в `wrangler tail` / Logs Worker-а.
         */
        console.error(
            "Turnstile verification failed:",
            {
                error:
                    turnstileCheck.error,

                codes:
                    turnstileCheck.codes ||
                    [],

                ip:
                    getClientIP(
                        request
                    ),

                country:
                    request.cf
                        ?.country ||
                    "unknown",

                asn:
                    request.cf
                        ?.asn ||
                    "unknown"
            }
        );

        return jsonResponse(
            {
                success: false,

                error:
                    turnstileCheck.error ||
                    "Проверка безопасности не пройдена."
            },
            403,
            request
        );
    }

    /*
     * QA LIST
     */

    if (
        !Array.isArray(
            data.qaList
        )
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Отсутствует qaList."
            },
            400,
            request
        );
    }

    if (
        data.qaList.length === 0
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "qaList пуст."
            },
            400,
            request
        );
    }

    if (
        data.qaList.length >
        200
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Слишком много вопросов в результате."
            },
            413,
            request
        );
    }

    /*
     * Ограничиваем общий JSON.
     */

    let serialized;

    try {
        serialized =
            JSON.stringify(data);
    } catch {
        return jsonResponse(
            {
                success: false,

                error:
                    "Не удалось обработать результат теста."
            },
            400,
            request
        );
    }

    if (
        serialized.length >
        900000
    ) {
        return jsonResponse(
            {
                success: false,

                error:
                    "Результат теста слишком большой."
            },
            413,
            request
        );
    }

    /*
     * НОРМАЛИЗОВАННЫЙ РЕЗУЛЬТАТ
     */

    const result = {
        schoolKey:
            cleanAndSafeSlice(
                data.schoolKey ||
                "LSPD",
                100
            ),

        schoolTitle:
            cleanAndSafeSlice(
                data.schoolTitle ||
                "LSPD QUALIFICATION TEST",
                200
            ),

        icName:
            cleanAndSafeSlice(
                data.icName ||
                "",
                500
            ),

        oocName:
            cleanAndSafeSlice(
                data.oocName ||
                "",
                500
            ),

        timeSpent:
            cleanAndSafeSlice(
                data.timeSpent ||
                "Неизвестно",
                100
            ),

        tabSwitches:
            Number(
                data.tabSwitches
            ) || 0,

        qaList:
            data.qaList.map(
                item => ({
                    title:
                        cleanAndSafeSlice(
                            item?.title ||
                            "Вопрос",
                            1000
                        ),

                    answer:
                        cleanAndSafeSlice(
                            item?.answer ||
                            "Нет ответа",
                            12000
                        ),

                    type:
                        cleanAndSafeSlice(
                            item?.type ||
                            "unknown",
                            50
                        )
                })
            ),

        /*
         * completedAt должен быть валидным ISO 8601,
         * иначе Discord embed timestamp может привести
         * к ошибке. Проверяем и подставляем текущее
         * время, если формат некорректен.
         */
        completedAt:
            (() => {
                const raw =
                    data.completedAt;

                if (
                    typeof raw === "string" &&
                    !Number.isNaN(
                        Date.parse(raw)
                    )
                ) {
                    return raw;
                }

                return new Date().toISOString();
            })()
    };

    /*
     * BUILD EMBEDS
     */

    try {
        const embeds =
            buildQuizEmbeds(
                result
            );

        /*
         * SPLIT ПО СУММАРНОМУ РАЗМЕРУ
         */

        const batches =
            splitEmbedBatches(
                embeds
            );

        /*
         * ОТПРАВЛЯЕМ НЕСКОЛЬКО DISCORD
         * СООБЩЕНИЙ ПОСЛЕДОВАТЕЛЬНО,
         * С РЕТРАЯМИ И ПАУЗОЙ МЕЖДУ НИМИ.
         *
         * При этом фронтенд всё равно
         * делает только один POST.
         */

        await sendAllQuizBatches(
            env,
            batches
        );

        return jsonResponse(
            {
                success: true,

                message:
                    "Результат успешно отправлен.",

                batches:
                    batches.length,

                embeds:
                    embeds.length
            },
            200,
            request
        );

    } catch (error) {
        console.error(
            "Quiz result error:",
            error
        );

        /*
         * Диагностика: логируем сам результат (без
         * turnstileToken), чтобы при повторном сбое
         * можно было увидеть в Cloudflare Logs, что
         * именно не проходит через Discord — не
         * гадая вслепую.
         */
        try {
            console.error(
                "Quiz result payload (для диагностики):",
                JSON.stringify(result).slice(
                    0,
                    8000
                )
            );
        } catch {
            console.error(
                "Не удалось сериализовать result для лога."
            );
        }

        return jsonResponse(
            {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "Не удалось отправить результат."
            },
            502,
            request
        );
    }
}

/*
=========================================================
MAIN WORKER
=========================================================
*/

export default {
    async fetch(
        request,
        env
    ) {
        /*
         * CORS PREFLIGHT
         */

        if (
            request.method ===
            "OPTIONS"
        ) {
            return new Response(
                null,
                {
                    status: 204,

                    headers:
                        corsHeaders(
                            request
                        )
                }
            );
        }

        const url =
            new URL(
                request.url
            );

        const pathname =
            url.pathname.replace(
                /\/+$/,
                ""
            ) || "/";

        /*
         * HOME
         */

        if (
            pathname === "/" &&
            request.method === "GET"
        ) {
            return jsonResponse(
                {
                    success: true,

                    service:
                        "LSPD School API",

                    version:
                        API_VERSION,

                    endpoints: {
                        status:
                            "GET /status",

                        login:
                            "POST /admin/login",

                        update:
                            "PUT /status",

                        quiz:
                            "POST /quiz-result"
                    }
                },
                200,
                request
            );
        }

        /*
         * STATUS
         */

        if (
            pathname === "/status" &&
            request.method === "GET"
        ) {
            return await getStatuses(
                env,
                request
            );
        }

        /*
         * ADMIN LOGIN
         */

        if (
            pathname === "/admin/login" &&
            request.method === "POST"
        ) {
            return await adminLogin(
                request,
                env
            );
        }

        /*
         * UPDATE STATUS
         */

        if (
            pathname === "/status" &&
            request.method === "PUT"
        ) {
            return await updateStatuses(
                request,
                env
            );
        }

        /*
         * QUIZ RESULT
         */

        if (
            pathname === "/quiz-result" &&
            request.method === "POST"
        ) {
            return await submitQuizResult(
                request,
                env
            );
        }

        /*
         * NOT FOUND
         */

        return jsonResponse(
            {
                success: false,

                error:
                    "Not found",

                path:
                    url.pathname,

                method:
                    request.method
            },
            404,
            request
        );
    }
};