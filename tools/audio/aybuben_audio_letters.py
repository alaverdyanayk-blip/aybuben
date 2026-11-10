# -*- coding: utf-8 -*-
"""Айбубен — озвучка через ElevenLabs. Буквы: звук каждой буквы и её армянское название. Ключ вводится в этом окне и никуда не сохраняется."""
import json, os, sys, time, zipfile, getpass, urllib.request, urllib.error

VOICE = "JBFqnCBsd6RMkjVDRZzb"           # стандартный голос ElevenLabs (George)
MODELS = ["eleven_v3", "eleven_v4"]       # модели с поддержкой армянского
OUT = "aybuben_letters"
# (ключ — по нему имя файла, текст — что произносится)
ITEMS = [
    ("ա", "ա"),
    ("այբ", "այբ"),
    ("տա", "տա"),
    ("տյուն", "տյուն"),
    ("մա", "մա"),
    ("մեն", "մեն"),
    ("ի", "ի"),
    ("ինի", "ինի"),
    ("սա", "սա"),
    ("սե", "սե"),
    ("րա", "րա"),
    ("րե", "րե"),
    ("ու", "ու"),
    ("կա", "կա"),
    ("կեն", "կեն"),
    ("ե", "ե"),
    ("եչ", "եչ"),
    ("լա", "լա"),
    ("լյուն", "լյուն"),
    ("նու", "նու"),
    ("գա", "գա"),
    ("գիմ", "գիմ"),
    ("բա", "բա"),
    ("բեն", "բեն"),
    ("և", "և"),
    ("ո", "ո"),
    ("հա", "հա"),
    ("հո", "հո"),
    ("դա", "դա"),
    ("յա", "յա"),
    ("յի", "հի"),
    ("քա", "քա"),
    ("քե", "քե"),
    ("վա", "վա"),
    ("վեվ", "վեվ"),
    ("օ", "օ"),
    ("շա", "շա"),
    ("պա", "պա"),
    ("պե", "պե"),
    ("չա", "չա"),
    ("ցա", "ցա"),
    ("ցո", "ցո"),
    ("թա", "թա"),
    ("թո", "թո"),
    ("ծա", "ծա"),
    ("փա", "փա"),
    ("փյուր", "փյուր"),
    ("ղա", "ղա"),
    ("ղատ", "ղատ"),
    ("խա", "խա"),
    ("խե", "խե"),
    ("ռա", "ռա"),
    ("ջա", "ջա"),
    ("ջե", "ջե"),
    ("ձա", "ձա"),
    ("զա", "զա"),
    ("ճա", "ճա"),
    ("ճե", "ճե"),
    ("ժա", "ժա"),
    ("ժե", "ժե"),
    ("է", "է"),
    ("ը", "ը"),
    ("ըթ", "ըթ"),
    ("ֆա", "ֆա"),
    ("ֆե", "ֆե")
]
TEXTS = [t for _, t in ITEMS]

def key(s): return s.replace("։", "").strip().lower()
def fnv(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch); h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "08x")

def tts(api, text, model):
    body = json.dumps({"text": text, "model_id": model, "language_code": "hy",
                       "voice_settings": {"stability": 0.8, "similarity_boost": 0.8, "speed": 0.82}}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_64",
        data=body, method="POST", headers={"xi-api-key": api, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def err_text(e):
    try: return f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}"
    except Exception: return str(e)

def main():
    os.makedirs(OUT, exist_ok=True)
    api = ""
    if False and os.path.exists("key.txt"):
        api = open("key.txt", encoding="utf-8-sig").read().strip()
        print("Ключ взят из файла key.txt")
    if not api:
        print("Вставьте API-ключ ElevenLabs (Ctrl+V или правый клик) и нажмите Enter.")
        api = input("Ключ: ").strip()
    if not api: sys.exit("Ключ пустой.")
    model = None
    for m in MODELS:
        try:
            tts(api, "Բարև", m); model = m; break
        except urllib.error.HTTPError as e:
            print(f"Модель {m}: {err_text(e)}")
            if e.code in (401, 403) and "model" not in err_text(e).lower():
                print("\nКлюч не принят или нет доступа. Проверьте, что ключ скопирован целиком"
                      " и что у него включено право Text to Speech."); input("Enter — выход"); return
        except Exception as e:
            print(f"Нет связи с ElevenLabs: {e}\nПопробуйте включить VPN."); input("Enter — выход"); return
    if not model:
        input("Ни одна модель не сработала. Enter — выход"); return
    print(f"\nМодель: {model}. Фраз: {len(TEXTS)}, символов: {sum(len(t) for t in TEXTS)}\n")
    failed = []
    for i, (k, t) in enumerate(ITEMS, 1):
        path = os.path.join(OUT, fnv(key(k)) + ".mp3")
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        for attempt in range(4):
            try:
                data = tts(api, t, model)
                open(path, "wb").write(data); print(f"[{i}/{len(TEXTS)}] {t}"); break
            except urllib.error.HTTPError as e:
                msg = err_text(e)
                if e.code == 429: time.sleep(5 * (attempt + 1)); continue
                if "quota" in msg.lower():
                    print("\nЗакончились символы бесплатного тарифа."); failed.append(t); break
                print(f"[{i}] ОШИБКА {t}: {msg}"); time.sleep(2)
            except Exception as e:
                print(f"[{i}] ОШИБКА {t}: {e}"); time.sleep(3)
        else:
            failed.append(t)
        if os.path.exists(path) and os.path.getsize(path) == 0: os.remove(path)
    done = {key(k): fnv(key(k)) + ".mp3" for k, _ in ITEMS if os.path.exists(os.path.join(OUT, fnv(key(k)) + ".mp3"))}
    json.dump({"voice": f"elevenlabs/{model}/{VOICE}", "files": done},
              open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with zipfile.ZipFile(OUT + ".zip", "w", zipfile.ZIP_DEFLATED) as z:
        for n in os.listdir(OUT): z.write(os.path.join(OUT, n), n)
    print(f"\nГотово: {len(done)} из {len(TEXTS)}. Архив: {os.path.abspath(OUT + '.zip')}")
    if len(done) < len(TEXTS): print("Запустите ещё раз, чтобы докачать недостающие.")
    input("Enter — закрыть окно")

if __name__ == "__main__":
    main()
