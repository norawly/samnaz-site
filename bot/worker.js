/* ============================================================
   SAMNAZ — обработчик заявок и Telegram-бот
   Один Cloudflare Worker делает две вещи:
     POST /submit          — принимает заявку с сайта и рассылает её подписчикам
     POST /tg/<secret>     — webhook Telegram: /start, вход по логину и паролю

   Почему воркер, а не сам сайт: сайт на GitHub Pages статический,
   серверного кода там нет. Если слать в Telegram прямо из браузера,
   токен бота окажется в исходниках страницы и его сможет забрать любой.
   ============================================================ */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), env);
    if (url.pathname === '/submit' && request.method === 'POST') return handleSubmit(request, env);
    if (url.pathname === `/tg/${env.WEBHOOK_SECRET}` && request.method === 'POST') return handleTelegram(request, env);
    if (url.pathname === '/health') return new Response('ok');

    return new Response('Not found', { status: 404 });
  }
};

/* ---------------- заявка с сайта ---------------- */
async function handleSubmit(request, env) {
  let data;
  try { data = await request.json(); } catch { return bad('Некорректный запрос', env); }

  // приманка для ботов: настоящий человек это поле не заполняет
  if (data.company_site) return cors(json({ ok: true }), env);

  const name = clean(data.name, 80);
  const phone = clean(data.phone, 40);
  if (!name || !phone) return bad('Укажите имя и телефон', env);

  // не чаще одной заявки в минуту с одного адреса
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rlKey = `rl:${ip}`;
  if (await env.SAMNAZ.get(rlKey)) return bad('Заявка уже отправлена, подождите минуту', env, 429);
  await env.SAMNAZ.put(rlKey, '1', { expirationTtl: 60 });

  const lines = [
    '🟡 *Новая заявка с сайта*',
    '',
    `*Имя:* ${esc(name)}`,
    `*Телефон:* ${esc(phone)}`,
    data.email    ? `*E-mail:* ${esc(clean(data.email, 120))}` : '',
    data.company  ? `*Компания:* ${esc(clean(data.company, 120))}` : '',
    data.tech     ? `*Техника:* ${esc(clean(data.tech, 200))}` : '',
    data.msg      ? `\n*Задача:*\n${esc(clean(data.msg, 2000))}` : '',
    '',
    `_Страница:_ ${esc(clean(data.page || '—', 200))}`,
    `_Время:_ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })} (Астана)`
  ].filter(Boolean).join('\n');

  const subs = await listSubscribers(env);
  if (!subs.length) {
    // заявку не теряем даже если никто не подписан
    await env.SAMNAZ.put(`lead:${Date.now()}`, lines, { expirationTtl: 60 * 60 * 24 * 30 });
    return cors(json({ ok: true, delivered: 0 }), env);
  }

  let delivered = 0;
  for (const chatId of subs) {
    const sent = await tg(env, 'sendMessage', { chat_id: chatId, text: lines, parse_mode: 'Markdown' });
    if (sent) delivered++;
  }
  return cors(json({ ok: true, delivered }), env);
}

/* ---------------- webhook Telegram ---------------- */
async function handleTelegram(request, env) {
  const update = await request.json().catch(() => null);
  const msg = update && (update.message || update.edited_message);
  if (!msg || !msg.chat) return new Response('ok');

  const chatId = String(msg.chat.id);
  const text = (msg.text || '').trim();
  const stateKey = `state:${chatId}`;
  const subKey = `sub:${chatId}`;

  if (text === '/start') {
    if (await env.SAMNAZ.get(subKey)) {
      await reply(env, chatId, 'Вы уже подключены — заявки с сайта приходят сюда.\n\n/status — проверить\n/stop — отключить уведомления');
    } else {
      await env.SAMNAZ.put(stateKey, 'await_login', { expirationTtl: 600 });
      await reply(env, chatId, '🔐 *Доступ к заявкам SAMNAZ*\n\nВведите логин:', 'Markdown');
    }
    return new Response('ok');
  }

  if (text === '/stop') {
    await env.SAMNAZ.delete(subKey);
    await reply(env, chatId, 'Уведомления отключены. Чтобы включить снова — /start');
    return new Response('ok');
  }

  if (text === '/status') {
    const on = await env.SAMNAZ.get(subKey);
    await reply(env, chatId, on ? '✅ Уведомления включены' : '❌ Не подключено. Нажмите /start');
    return new Response('ok');
  }

  const state = await env.SAMNAZ.get(stateKey);

  if (state === 'await_login') {
    if (text === env.BOT_LOGIN) {
      await env.SAMNAZ.put(stateKey, 'await_password', { expirationTtl: 600 });
      await reply(env, chatId, 'Логин принят. Теперь введите пароль:');
    } else {
      await env.SAMNAZ.delete(stateKey);
      await reply(env, chatId, '❌ Неверный логин. Начните заново: /start');
    }
    return new Response('ok');
  }

  if (state === 'await_password') {
    await env.SAMNAZ.delete(stateKey);
    if (text === env.BOT_PASSWORD) {
      const who = [msg.from && msg.from.first_name, msg.from && msg.from.username].filter(Boolean).join(' @');
      await env.SAMNAZ.put(subKey, who || 'сотрудник');
      await reply(env, chatId, '✅ *Доступ открыт*\n\nЗаявки с сайта будут приходить в этот чат.\n\n/status — проверить\n/stop — отключить', 'Markdown');
    } else {
      await reply(env, chatId, '❌ Неверный пароль. Начните заново: /start');
    }
    return new Response('ok');
  }

  await reply(env, chatId, 'Нажмите /start, чтобы подключиться к заявкам.');
  return new Response('ok');
}

/* ---------------- вспомогательное ---------------- */
async function listSubscribers(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.SAMNAZ.list({ prefix: 'sub:', cursor });
    page.keys.forEach(k => out.push(k.name.slice(4)));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return out;
}

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body)
  });
  return r.ok;
}
const reply = (env, chatId, text, mode) =>
  tg(env, 'sendMessage', { chat_id: chatId, text, parse_mode: mode || undefined });

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const esc = (s) => String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
const bad = (message, env, status = 400) => cors(json({ ok: false, error: message }, status), env);

function cors(res, env) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', env.ALLOWED_ORIGIN || '*');
  h.set('access-control-allow-methods', 'POST, OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  h.set('access-control-max-age', '86400');
  return new Response(res.body, { status: res.status, headers: h });
}
