#!/usr/bin/env python3
"""Сборка Айбубена. Запуск из корня репозитория:  python3 src/build.py

Исходники лежат раздельно, а в бот уходит один файл:
  src/app.html   — каркас страницы (шапка, вкладки, пустые контейнеры)
  src/css/*.css  — оформление
  src/data/*.js  — учебный контент: буквы, слова, темы, фразы, правила, курс, реплики Циро
  src/js/*.js    — логика и экраны
Порядок файлов задан списками CSS и JS ниже: всё склеивается в один <style> и один <script>.

Результат:
  index.html + version.json — версия для Телеграма (с адаптером и статистикой); руками не править
  build/aybuben.html        — та же страница без Телеграма, для превью-артефакта (в git не хранится;
                              шрифты там с Google Fonts, потому что папки fonts/ рядом с превью нет)
"""
import hashlib, json, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'src')

CSS = ['base', 'learn', 'lesson', 'reference', 'profile', 'home', 'games', 'polish', 'phrases']
JS = [
    'js/utils',
    # контент
    'data/outfits', 'data/ciro-lines', 'data/letters', 'data/words', 'data/themes', 'data/rules',
    'data/phrases', 'data/achievements', 'data/audio-keys',
    # логика
    'js/icons', 'js/ciro', 'js/alphabet', 'js/exercises',
    'data/course',  # курс собирается из генераторов упражнений, поэтому идёт после них
    'js/state', 'js/sound', 'js/phrases', 'js/memory', 'js/app', 'js/path', 'js/lesson', 'js/games',
    'js/reference', 'js/profile', 'js/growth',
    'js/main',
]


def read(*parts):
    return open(os.path.join(src, *parts), encoding='utf-8').read()


css = '\n'.join(read('css', n + '.css').rstrip('\n') for n in CSS)
js = '\n'.join(read(n + '.js').rstrip('\n') for n in JS)
app = read('app.html')
assert '/*@CSS*/' in app and '/*@JS*/' in app, 'в app.html нет меток /*@CSS*/ и /*@JS*/'
html = app.replace('/*@CSS*/', css, 1).replace('/*@JS*/', js, 1)

# 1. Страница без Телеграма — для превью
os.makedirs(os.path.join(root, 'build'), exist_ok=True)
open(os.path.join(root, 'build', 'aybuben.html'), 'w', encoding='utf-8').write(html)

# 2. Версия для Телеграма: шрифты берутся из папки fonts/, а не с Google Fonts
import re
tg = re.sub(r'<link [^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\n', '', html)
assert 'fonts.googleapis' not in tg
tg = tg.replace('<style>\n', '<link rel="preload" href="fonts/golos-text-cyrillic.woff2" as="font" type="font/woff2" crossorigin>\n'
                '<link rel="preload" href="fonts/noto-sans-armenian.woff2" as="font" type="font/woff2" crossorigin>\n'
                '<style>\n' + read('css', 'fonts.css'), 1)
cut = tg.index('<header class="top">')
head, body = tg[:cut], tg[cut:]
body = body.rstrip('\n') + '\n<script>\n' + read('tg-adapter.js') + '</script>'
page = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="color-scheme" content="light dark">
<meta name="description" content="Айбубен — учим читать и писать по-армянски вместе с абрикосом Циро">
<link rel="icon" href="icon.png">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}html,body{{-webkit-tap-highlight-color:transparent}}</style>
{head}</head>
<body>
{body}
</body>
</html>
'''
an_path = os.path.join(src, 'analytics.json')
if os.path.exists(an_path):
    server = json.load(open(an_path, encoding='utf-8')).get('server', '').strip().rstrip('/')
    if server:
        sender = read('stats-sender.js').replace('__SERVER__', server)
        page = page.replace('</body>', '<script>\n' + sender + '</script>\n</body>', 1)
        print('статистика:', server)
build_id = hashlib.sha1(page.encode('utf-8')).hexdigest()[:10]  # хэш всей страницы, включая подключённую статистику
page = page.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', '<script>window.BUILD_ID=' + json.dumps(build_id) + '</script>\n<script src="https://telegram.org/js/telegram-web-app.js"></script>', 1)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(page)
open(os.path.join(root, 'version.json'), 'w', encoding='utf-8').write(json.dumps({'build': build_id}))
print('версия сборки:', build_id)
print(f'index.html собран: {len(page)//1024} КБ')
