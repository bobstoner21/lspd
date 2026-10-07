export async function onRequest(context) {
    const url = new URL(context.request.url);

    if (url.pathname.startsWith("/img/")) {
        const dest = context.request.headers.get("Sec-Fetch-Dest");
        const mode = context.request.headers.get("Sec-Fetch-Mode");

        // прямой переход по ссылке / ввод в адресную строку
        if (dest === "document" || mode === "navigate") {
            return new Response("Not found", { status: 404 });
        }
    }

    const response = await context.next();

    // чтобы браузер не отдавал закэшированную картинку при прямом заходе
    const out = new Response(response.body, response);
    out.headers.append("Vary", "Sec-Fetch-Dest");
    return out;
}
