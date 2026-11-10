# Озвучка букв для «Айбубена» (ElevenLabs, модель eleven_v3).
# Как запустить: правой кнопкой по файлу → «Выполнить с помощью PowerShell».
# Скрипт спросит ключ ElevenLabs (вводится только здесь, никуда не сохраняется) и ID голоса,
# которым озвучены остальные слова. Готовые mp3 появятся в папке aybuben-letters рядом со скриптом.
# Уже скачанные файлы повторно не запрашиваются — скрипт можно перезапускать.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$items = @(
  @{ file='e4044a2c.mp3'; text='ա'; note='звук буквы Ա (а)' }
  @{ file='c64c427b.mp3'; text='այբ'; note='название буквы Ա («айб»)' }
  @{ file='43f25e7d.mp3'; text='տա'; note='звук буквы Տ (т)' }
  @{ file='5e4b9b17.mp3'; text='տյուն'; note='название буквы Տ («тюн»)' }
  @{ file='2bdc7266.mp3'; text='մա'; note='звук буквы Մ (м)' }
  @{ file='1c19fb8c.mp3'; text='մեն'; note='название буквы Մ («мен»)' }
  @{ file='ee0459ea.mp3'; text='ի'; note='звук буквы Ի (и)' }
  @{ file='0029b56d.mp3'; text='ինի'; note='название буквы Ի («ини»)' }
  @{ file='37f7406b.mp3'; text='սա'; note='звук буквы Ս (с)' }
  @{ file='3bf746b7.mp3'; text='սե'; note='название буквы Ս («се»)' }
  @{ file='62d132da.mp3'; text='րա'; note='звук буквы Ր (р)' }
  @{ file='5ed12c8e.mp3'; text='րե'; note='название буквы Ր («ре»)' }
  @{ file='5302a3df.mp3'; text='ու'; note='звук буквы Ու (у)' }
  @{ file='63d4f36d.mp3'; text='կա'; note='звук буквы Կ (к)' }
  @{ file='3329c0f5.mp3'; text='կեն'; note='название буквы Կ («кен»)' }
  @{ file='e00443e0.mp3'; text='ե'; note='звук буквы Ե (е / йе)' }
  @{ file='3fbb22db.mp3'; text='եչ'; note='название буквы Ե («йечʰ»)' }
  @{ file='3bd59bde.mp3'; text='լա'; note='звук буквы Լ (л)' }
  @{ file='7a716e4e.mp3'; text='լյուն'; note='название буквы Լ («люн»)' }
  @{ file='5232b8f3.mp3'; text='նու'; note='название буквы Ն («ну»)' }
  @{ file='4bbda849.mp3'; text='գա'; note='звук буквы Գ (г)' }
  @{ file='7ca3a1dd.mp3'; text='գիմ'; note='название буквы Գ («гим»)' }
  @{ file='2fc2e0cc.mp3'; text='բա'; note='звук буквы Բ (б)' }
  @{ file='d9c69042.mp3'; text='բեն'; note='название буквы Բ («бен»)' }
  @{ file='8203afe6.mp3'; text='և'; note='звук буквы և (ев)' }
  @{ file='fd047187.mp3'; text='ո'; note='звук буквы Ո (о / во)' }
  @{ file='43e5928a.mp3'; text='հա'; note='звук буквы Հ (һ)' }
  @{ file='4ce5a0b5.mp3'; text='հո'; note='название буквы Հ («һо»)' }
  @{ file='4bb0dc56.mp3'; text='դա'; note='звук буквы Դ (д)' }
  @{ file='47d739e3.mp3'; text='յա'; note='звук буквы Յ (й)' }
  @{ file='51d749a1.mp3'; text='հի'; note='название буквы Յ («һи»)' }
  @{ file='4ac67fb6.mp3'; text='քա'; note='звук буквы Ք (кʰ)' }
  @{ file='4ec68602.mp3'; text='քե'; note='название буквы Ք («кʰе»)' }
  @{ file='27f47100.mp3'; text='վա'; note='звук буквы Վ (в)' }
  @{ file='63cfc4b6.mp3'; text='վեվ'; note='название буквы Վ («вев»)' }
  @{ file='8003acc0.mp3'; text='օ'; note='звук буквы Օ (о)' }
  @{ file='53eb87f5.mp3'; text='շա'; note='звук буквы Շ (ш)' }
  @{ file='3fff2424.mp3'; text='պա'; note='звук буквы Պ (п)' }
  @{ file='3bff1dd8.mp3'; text='պե'; note='название буквы Պ («пе»)' }
  @{ file='4ff3c88f.mp3'; text='չա'; note='звук буквы Չ (чʰ)' }
  @{ file='3ed82d97.mp3'; text='ցա'; note='звук буквы Ց (цʰ)' }
  @{ file='45d8389c.mp3'; text='ցո'; note='название буквы Ց («цʰо»)' }
  @{ file='2fcfacbf.mp3'; text='թա'; note='звук буквы Թ (тʰ)' }
  @{ file='46cfd0f4.mp3'; text='թո'; note='название буквы Թ («тʰо»)' }
  @{ file='47ca6df0.mp3'; text='ծա'; note='звук буквы Ծ (ц)' }
  @{ file='4ad34ba9.mp3'; text='փա'; note='звук буквы Փ (пʰ)' }
  @{ file='98f89e8d.mp3'; text='փյուր'; note='название буквы Փ («пʰюр»)' }
  @{ file='4ff84d9c.mp3'; text='ղա'; note='звук буквы Ղ (гъ)' }
  @{ file='c6dabd59.mp3'; text='ղատ'; note='название буквы Ղ («гъат»)' }
  @{ file='57d1f65b.mp3'; text='խա'; note='звук буквы Խ (х)' }
  @{ file='5bd1fca7.mp3'; text='խե'; note='название буквы Խ («хе»)' }
  @{ file='5bf9b7ae.mp3'; text='ռա'; note='звук буквы Ռ (рр)' }
  @{ file='5c0683a1.mp3'; text='ջա'; note='звук буквы Ջ (дж)' }
  @{ file='600689ed.mp3'; text='ջե'; note='название буквы Ջ («дже»)' }
  @{ file='5fecf207.mp3'; text='ձա'; note='звук буквы Ձ (дз)' }
  @{ file='57c6bd68.mp3'; text='զա'; note='звук буквы Զ (з)' }
  @{ file='2be93e59.mp3'; text='ճա'; note='звук буквы Ճ (ч)' }
  @{ file='2fe944a5.mp3'; text='ճե'; note='название буквы Ճ («че»)' }
  @{ file='5fe02614.mp3'; text='ժա'; note='звук буквы Ժ (ж)' }
  @{ file='5be01fc8.mp3'; text='ժե'; note='название буквы Ժ («же»)' }
  @{ file='e2044706.mp3'; text='է'; note='звук буквы Է (э)' }
  @{ file='ed045857.mp3'; text='ը'; note='звук буквы Ը (ы)' }
  @{ file='5bdec89a.mp3'; text='ըթ'; note='название буквы Ը («ытʰ»)' }
  @{ file='56d481c8.mp3'; text='ֆա'; note='звук буквы Ֆ (ф)' }
  @{ file='5ad48814.mp3'; text='ֆե'; note='название буквы Ֆ («фе»)' }
)
$out = Join-Path $PSScriptRoot 'aybuben-letters'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$sec = Read-Host 'Ключ ElevenLabs (символы не видны)' -AsSecureString
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$voice = (Read-Host 'ID голоса (Voices → голос → Copy voice ID)').Trim()
$ok = 0; $fail = 0
foreach ($it in $items) {
  $path = Join-Path $out $it.file
  if (Test-Path $path) { $ok++; continue }
  $body = @{ text = $it.text; model_id = 'eleven_v3' } | ConvertTo-Json -Compress
  try {
    Invoke-WebRequest -Method Post -Uri "https://api.elevenlabs.io/v1/text-to-speech/$voice`?output_format=mp3_44100_128" `
      -Headers @{ 'xi-api-key' = $key; 'Accept' = 'audio/mpeg' } -ContentType 'application/json; charset=utf-8' `
      -Body ([Text.Encoding]::UTF8.GetBytes($body)) -OutFile $path -UseBasicParsing
    $ok++; Write-Host ("готово: " + $it.note)
  } catch { $fail++; Write-Host ("ошибка: " + $it.note + " — " + $_.Exception.Message) -ForegroundColor Red }
  Start-Sleep -Milliseconds 400
}
$key = $null
Write-Host ""
Write-Host "Готово файлов: $ok, ошибок: $fail. Папка: $out"
Read-Host 'Нажмите Enter, чтобы закрыть'
