#!/bin/bash
# Узнать, куда бот должен присылать заявки.
#
# 1. Откройте в Telegram бота @SamNazContact_Bot и нажмите «Начать» (/start)
#    Если нужно, чтобы заявки шли в группу — добавьте бота в группу и напишите там любое сообщение.
# 2. Запустите этот скрипт.
# 3. Полученные числа впишите в assets/js/vendor/metrics.js в поле to: [ ... ]

TOKEN="$(grep -oE "'[A-Za-z0-9+/=]{40,}'" "$(dirname "$0")/../assets/js/vendor/metrics.js" | head -1 | tr -d "'" | base64 --decode)"

if [ -z "$TOKEN" ]; then echo "Не нашёл ключ в assets/js/vendor/metrics.js"; exit 1; fi

curl -s "https://api.telegram.org/bot$TOKEN/getUpdates" | python3 -c '
import json, sys
d = json.load(sys.stdin)
if not d.get("ok"):
    print("Ошибка:", d.get("description")); raise SystemExit(1)
seen = {}
for u in d.get("result", []):
    m = u.get("message") or u.get("edited_message") or u.get("my_chat_member") or {}
    c = m.get("chat") or {}
    if c.get("id"):
        seen[c["id"]] = c.get("title") or " ".join(filter(None, [c.get("first_name"), c.get("last_name")])) or c.get("username")
if not seen:
    print("Пока никто не писал боту.")
    print("Откройте @SamNazContact_Bot, нажмите «Начать» и запустите скрипт снова.")
else:
    print("Найдены чаты:\n")
    for k, v in seen.items():
        print(f"  {k}   {v}")
    print("\nВпишите в assets/js/vendor/metrics.js:")
    print("    to: [" + ", ".join(str(k) for k in seen) + "]")
'
