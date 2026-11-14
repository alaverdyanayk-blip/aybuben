#!/usr/bin/env bash
# Полная проверка перед выкладкой: сборка, локальный сервер, все тесты. Итог — в последних строках; код выхода 0 = всё прошло.
# Нужны: python3, Node.js 22+, Playwright (npm i playwright; браузер: npx playwright install chromium).
cd "$(dirname "$0")/../.." || exit 1
python3 src/build.py || exit 1
PORT=8765; STARTED=
if ! curl -s -o /dev/null "http://localhost:$PORT/index.html"; then python3 -m http.server $PORT >/dev/null 2>&1 & STARTED=$!; sleep 1; fi
fail=0
run(){ echo; echo "=== $1"; shift; "$@" || fail=$((fail+1)); }
run "Приложение"             node tools/qa/app.test.js
run "Режим Телеграма"        node tools/qa/tg.test.js
run "Сервер: напоминания"    node --no-warnings tools/qa/server-reminders.mjs
run "Слияние прогресса"      bash -c 'out=$(node tools/qa/merge.js); echo "$out"; ! echo "$out" | grep -q "^FAIL"'
[ -n "$STARTED" ] && kill $STARTED
echo; [ $fail -eq 0 ] && echo "ВСЁ ПРОШЛО" || echo "НЕ ПРОШЛО НАБОРОВ: $fail"
exit $fail
