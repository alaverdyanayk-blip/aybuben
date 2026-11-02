# Айбубен — телеграм-бот @aybubenHAY_bot

Приложение для изучения восточноармянского (литературная норма), Duolingo-стиль, персонаж — абрикос Циро.
Сайт: https://alaverdyanayk-blip.github.io/aybuben/ (GitHub Pages, ветка main, корень). Бот открывает его как Mini App.
Артефакт-исходник на claude.ai: https://claude.ai/artifact/MLhXKy9k1YpundYV9zMX85

## Структура
- `src/aybuben.html` — исходник приложения (тот же файл, что публикуется как артефакт). Править только его.
- `src/tg-adapter.js` — интеграция с Telegram WebApp: тема, вибро, кнопка «Назад», прогресс в CloudStorage.
  Использует хуки из приложения: `window.__onSave(S)`, `window.__haptic(t)`, функции `route`, `quitLesson`, `closeGame`, глобальные `S`, `KEY`.
- `src/build.py` — собирает `index.html` в корне. Не редактировать `index.html` руками.
- `audio/*.mp3` — озвучка (ElevenLabs, eleven_v3). Имя файла = FNV-1a от ключа: текст без «։», trim, lowercase (см. `fnv`/`akey` в приложении).
- `src/avatar.png`, `src/banner.png` — аватар бота и баннер Mini App.

## Как выкатить обновление
1. Изменить `src/aybuben.html` (и при необходимости опубликовать его же как артефакт по ссылке выше).
2. `python3 src/build.py`
3. `git add -A && git commit -m "…" && git push` — GitHub Pages обновится за ~1 минуту, бот подхватит сам.

Новые фразы для озвучки нужно сгенерировать (скрипт ElevenLabs запускается на компьютере пользователя, ключ вводит только пользователь) и положить в `audio/`, добавив ключи в `AUDIO_KEYS`.
