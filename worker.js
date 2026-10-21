
const fixes = [
  [/\btalim\b/gi, "ta’lim"],
  [/\bboyicha\b/gi, "bo‘yicha"],
  [/\bboldi\b/gi, "bo‘ldi"],
  [/\boquvchi\b/gi, "o‘quvchi"],
  [/\boqituvchi\b/gi, "o‘qituvchi"],
  [/\bOzbekiston\b/gi, "O‘zbekiston"]
];

function fixSpelling(text) {
  for (const [pattern, replacement] of fixes) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

function newAlphabet(text) {
  return text
    .replace(/[oO][ʻʼ‘’']/g, m =>
      m[0] === "O" ? "Ö" : "ö")
    .replace(/[gG][ʻʼ‘’']/g, m =>
      m[0] === "G" ? "Ğ" : "ğ")
    .replace(/sh/gi, m => m === "SH" ? "Ş" : m === "Sh" ? "Ş" : "ş")
    .replace(/ch/gi, m => m === "CH" ? "Ç" : m === "Ch" ? "Ç" : "ç");
}

async function sendMessage(env, chatId, text, replyTo) {
  const body = {
    chat_id: chatId,
    text
  };

  if (replyTo) {
    body.reply_parameters = { message_id: replyTo };
  }

  await fetch(
    `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("ImloNazorat ishlayapti!");
    }

    if (!env.BOT_TOKEN) {
      return new Response("BOT_TOKEN sozlanmagan", { status: 500 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Noto‘g‘ri so‘rov", { status: 400 });
    }

    const msg = update.message;
    if (!msg?.text) return new Response("OK");

    const text = msg.text.trim();
    const chatId = msg.chat.id;
    const isPrivate = msg.chat.type === "private";

    if (text === "/start") {
      await sendMessage(
        env,
        chatId,
        "Assalomu alaykum! Men ImloNazorat botiman.\n\n" +
        "Matn yuboring — imlo xatolarini tekshirishga va yangi yozuv shakliga o‘girishga yordam beraman.\n\n" +
        "/new — yangi alifboga o‘girish\n" +
        "/imlo — matn imlosini tekshirish",
        msg.message_id
      );
      return new Response("OK");
    }

    if (text === "/help") {
      await sendMessage(
        env,
        chatId,
        "/new matn — yangi alifboga o‘girish\n" +
        "/imlo matn — imlo tekshiruvi\n" +
        "Shaxsiy chatda oddiy matn yuborsangiz, ikkala amal ham bajariladi.",
        msg.message_id
      );
      return new Response("OK");
    }

    const isNew = text.startsWith("/new ");
    const isImlo = text.startsWith("/imlo ");
    const command = text.startsWith("/");

    if (command && !isNew && !isImlo) {
      return new Response("OK");
    }

    const original = (isNew || isImlo)
      ? text.replace(/^\/(new|imlo)\s+/, "")
      : text;

    if (!original.trim()) return new Response("OK");

    const corrected = fixSpelling(original);
    const converted = newAlphabet(corrected);

    if (isPrivate) {
      const result = isNew
        ? newAlphabet(original)
        : isImlo
          ? corrected
          : converted;

      if (result !== original || isNew || isImlo) {
        await sendMessage(
          env,
          chatId,
          "✍️ Natija:\n\n" + result,
          msg.message_id
        );
      }
    } else if (corrected !== original) {
      await sendMessage(
        env,
        chatId,
        "✍️ Tuzatilgan matn:\n\n" + newAlphabet(corrected),
        msg.message_id
      );
    }

    return new Response("OK");
  }
};
