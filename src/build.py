#!/usr/bin/env python3
"""Собирает телеграм-версию Айбубена: src/aybuben.html + src/tg-adapter.js -> index.html в корне репозитория.
Запуск из корня репозитория: python3 src/build.py"""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'src')
html = open(os.path.join(src, 'aybuben.html'), encoding='utf-8').read()
adapter = open(os.path.join(src, 'tg-adapter.js'), encoding='utf-8').read()
cut = html.index('<header class="top">')
head, body = html[:cut], html[cut:]
marker = '\nroute();\n</script>'
assert marker in body, 'не найден конец основного скрипта'
body = body.replace(marker, marker + '\n<script>\n' + adapter + '</script>', 1)
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
import hashlib, json
build_id = hashlib.sha1((html + adapter).encode('utf-8')).hexdigest()[:10]
page = page.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', '<script>window.BUILD_ID=' + json.dumps(build_id) + '</script>\n<script src="https://telegram.org/js/telegram-web-app.js"></script>', 1)
an_path = os.path.join(src, 'analytics.json')
if os.path.exists(an_path):
    server = json.load(open(an_path, encoding='utf-8')).get('server', '').strip().rstrip('/')
    if server:
        sender = open(os.path.join(src, 'stats-sender.js'), encoding='utf-8').read().replace('__SERVER__', server)
        page = page.replace('</body>', '<script>\n' + sender + '</script>\n</body>', 1)
        print('статистика:', server)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(page)
open(os.path.join(root, 'version.json'), 'w', encoding='utf-8').write(json.dumps({'build': build_id}))
print('версия сборки:', build_id)
print(f'index.html собран: {len(page)//1024} КБ')
