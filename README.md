# 🎈 Børnespil

Små browser-spil til iPad og tablet — lavet til de 3-6 årige.
Ren HTML/CSS/JavaScript, ingen byggeproces. Udgives via GitHub Pages.

## ▶️ Spil nu

**https://freddybj95.github.io/boernespil/**

Scan koden med tablettens kamera:

<img src="qr.png" alt="QR-kode til Børnespil" width="220">

### Installer som app
- **iPad / iPhone:** Åbn linket i Safari → tryk på **Del-knappen** → **"Føj til hjemmeskærm"**.
- **Android:** Åbn linket i Chrome → tryk på **⋮** → **"Installer app"**.

Første gang skal der være internet. Bagefter virker spillene også offline.

## Spil
- 🐮 **Tryk på dyret**
- 🐍 **Fjollet Slange**
- 🎨 **Tegn!**
- 🎈 **Pop ballonerne**
- 🧠 **Find par**
- 🧺 **Fang frugten**
- 🔨 **Slå muldvarpen**
- 🔢 **Tæl dyrene**
- 🎵 **Husk farverne**
- 🎹 **Dyre-piano**
- 🚀 **Undvig stenene**
- 🧩 **Skydepuslespil**
- 🚽 **Skibidi Toilet**
- 🚜 **Vaskehallen**
- 🎣 **Mærkelige fisk** (3D)
- ⛏️ **Broekraft** (3D-byggespil i Minecraft-stil)

## Kør lokalt
Åbn `index.html` i en browser.

## Tilføj et nyt spil
1. Lav en ny mappe under `spil/`, fx `spil/mit-spil/` med en `index.html`.
2. Tilføj et nyt "spil-kort" i forsidens `index.html`.
3. Tilføj mappenavnet til `SPIL` i `sw.js` og sæt tallet i `CACHE` én op.

## Mærkelige fisk: flere fisk og stænger
Fiskespillet ligger i `spil/fisk/` og er delt op, så det er nemt at bygge videre på:

| Fil | Indhold |
|---|---|
| `fisk.js` | Alle fiskene (`FISKE`) — kopiér en blok for at lave en ny fisk |
| `staenger.js` | Fiskestængerne (`STÆNGER`) — kopiér en blok for en ny stang |
| `verden.js` | Søen, broen, himlen, træer og anden |
| `lyd.js` | Alle lydene (Web Audio, ingen lydfiler) |
| `spil.js` | Selve spillet: kast, bid, kamp og fangst |
| `three.js` | Hvilken version af 3D-motoren three.js der bruges |

Øverst i `fisk.js` og `staenger.js` står hvad hver værdi betyder.
Test en ny fisk ved at åbne `spil/fisk/?fisk=<id>` — så bider den fisk hver gang.
Nye filer skal også skrives ind i `EKSTRA` i `sw.js`.

## Broekraft: flere blokke og dyr
Byggespillet ligger i `spil/broekraft/` og er delt op på samme måde:

| Fil | Indhold |
|---|---|
| `blokke.js` | Alle blokkene (`BLOKKE`) og deres 16×16 pixel-mønstre (`MØNSTRE`) |
| `dyr.js` | De mærkelige dyr (`DYR`) — bygget af klodser målt i pixels, ligesom i Minecraft |
| `verdener.js` | Verdenerne (`VERDENER`): Græsøen, Zombieverdenen, Svampeverdenen og Ostemånen — farver, musik, tyngdekraft, dyr og en opskrift på terrænet |
| `verden.js` | Terrænet, 3D-modellen af blokkene og kollision |
| `lyd.js` | Lyde og den rolige klavermusik |
| `spil.js` | Spilleren, styringen, hotbar, inventar og gemning |

Øverst i `blokke.js`, `dyr.js` og `verdener.js` står hvad hver værdi betyder. Nye blokke skal
tilføjes nederst i `BLOKKE`, så gemte verdener stadig passer. Hver verden gemmes for sig på enheden;
"🌍 Verdener" skifter verden, og "Start forfra" i menuen (⏸) laver verdenen helt ny. `spil/broekraft/?debug` giver adgang til
spilleren i konsollen (`bk.sp`), hvis man vil fejlsøge.
