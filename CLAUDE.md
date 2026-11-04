# Айбубен — телеграм-бот @aybubenHAY_bot

Приложение для изучения восточноармянского (литературная норма), Duolingo-стиль, персонаж — абрикос Циро.
Сайт: https://alaverdyanayk-blip.github.io/aybuben/ (GitHub Pages, ветка main, корень). Бот открывает его как Mini App.
Артефакт-исходник на claude.ai: https://claude.ai/artifact/MLhXKy9k1YpundYV9zMX85

## Структура
- `src/aybuben.html` — исходник приложения (тот же файл, что публикуется как артефакт). Править только его.
- `src/tg-adapter.js` — интеграция с Telegram WebApp: тема, вибро, кнопка «Назад», прогресс в CloudStorage.
  Использует хуки из приложения: `window.__onSave(S)`, `window.__haptic(t)`, функции `route`, `quitLesson`, `closeGame`, глобальные `S`, `KEY`.
- Слова: базовый список `WORDS` + тематический словарь `THEMES` (13 тем, ~345 слов, формат [слово, как звучит, перевод]) в том же файле. Из тем автоматически строятся разделы «· Слова», они чередуются с грамматикой; порядок и нумерация разделов вычисляются кодом.
- `src/build.py` — собирает `index.html` и `version.json` в корне (хэш сборки). Не редактировать их руками. Адаптер сверяет `version.json` и перезагружает Mini App, если Телеграм показал старую версию из кэша.
- `audio/*.mp3` — озвучка (ElevenLabs, eleven_v3). Имя файла = FNV-1a от ключа: текст без «։», trim, lowercase (см. `fnv`/`akey` в приложении).
- `src/avatar.png`, `src/banner.png` — аватар бота и баннер Mini App.
- Раздел «Фразы» (`#phrases`, `#phrases/<id>`): данные `PHR` (9 ситуаций: фразы [армянский, как звучит, перевод, примечание] + диалоги), уроки `phGen1`/`phGen2`, прогресс в `S.phr`. Костюмы Циро `COSTUMES` открываются только за диалоги ситуаций; обычные `OUTFITS` — по уровню.
- Правила (`T`) собираются из `RC/RX/RN/RP/SIGNS` — карточки с примерами, а не сплошной текст.
- Транскрипция: связка եմ/եք/են пишется «эм/экʰ/эн»; оглушение (աղջիկ — «ахчʰик»).

## Статистика
- Страница: https://aybuben-stats.alaverdyanayk.workers.dev (пароль не задан — открыта по ссылке; можно добавить секрет ADMIN_PASSWORD).
- `server/worker.js` + `server/wrangler.toml` — Cloudflare Worker `aybuben-stats` + D1 `aybuben`. Cloudflare сам собирает его из GitHub при push (Workers Builds, Root directory = server).
- Приложение шлёт события через `src/stats-sender.js`; адрес сервера — в `src/analytics.json`, build.py вставляет отправщик. События: open, lesson, lesson_first, practice, fail, game (`track()` в приложении).
- Секреты (вводит только пользователь, в панели Cloudflare): ADMIN_PASSWORD, BOT_TOKEN (проверка подписи Telegram), SALT — все необязательны.

## Как выкатить обновление
1. Изменить `src/aybuben.html` (и при необходимости опубликовать его же как артефакт по ссылке выше).
2. `python3 src/build.py`
3. `git add -A && git commit -m "…" && git push` — GitHub Pages обновится за ~1 минуту, бот подхватит сам.

Новые фразы для озвучки нужно сгенерировать (скрипт ElevenLabs запускается на компьютере пользователя, ключ вводит только пользователь) и положить в `audio/`, добавив ключи в `AUDIO_KEYS`.
