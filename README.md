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
Forsiden har faner, så man kan vælge kategori (appen husker den sidste):

- 🧊 **3D:** ⛏️ Broekraft (byggespil i Minecraft-stil med mange verdener), 🎣 Mærkelige fisk, 🏁 Rulle Rasmus (styr en blob gennem fem baner ved at vippe iPad'en eller trykke),
  🍔 Burgerløbet (saml ingredienser på vejen, og send burgeren ind i munden på kæmpen)
- 🎮 **2D:** 🎈 Pop ballonerne (stryg over ballonerne som i Fruit Ninja), 🍔 Byg en burger (byg en burger og giv den til den sultne mand),
  🦄 Min enhjørning (lav din egen enhjørning, giv den sadel og pynt på, vask og fodr den), 🚜 Vaskehallen, 🐍 Fjollet Slange
- 🎨 **Tegn & musik:** 🎨 Tegn! (hold to fingre nede, så kommer der en streg imellem dem), 🎹 Dyre-piano

Nederst på forsiden ligger "For voksne" med 📷 Spil sammen (forbind tabletten til Broekraft Server).

## Kør lokalt
Åbn `index.html` i en browser.

## Tilføj et nyt spil
1. Lav en ny mappe under `spil/`, fx `spil/mit-spil/` med en `index.html`.
2. Kopiér et "spil-kort" ind i den rigtige kategori i forsidens `index.html`
   (`data-ny="ÅÅÅÅ-MM-DD"` giver et NY!-mærke i tre uger).
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

## Rulle Rasmus: flere baner og farver
Blob-spillet ligger i `spil/rulle-rasmus/`. Man vipper iPad'en eller trykker der, hvor Rasmus skal trille hen.
Falder han af banen, dukker han op igen ved det sidste flag.

| Fil | Indhold |
|---|---|
| `baner.js` | De fem baner (`BANER`), bygget af stykker: lige, sving, bakker, render, hop, trampoliner … |
| `temaer.js` | Hvordan hver bane ser ud: himmel, vand/skyer, overflade, rækværk og pynt |
| `blob.js` | Rasmus selv og hans farver (`SKINS`): ild, enhjørning, Broekraft, regnbue, galakse og guld |
| `bane.js` | Vejen: punkterne, kollision og 3D-modellen af banen |
| `ting.js` | Stjerner, frugt, flag, trampoliner, fartfelter, puder og målbuen |
| `verden.js` | Himmel, lys og skygger, vand med bølger, pynt og det der flyver i luften |
| `lyd.js` · `partikler.js` · `teksturer.js` | Lyde og musik · gnister og konfetti · overflader tegnet med kode |

Der er tre sværhedsgrader: 🐢 Nem (banen som den står), 🐇 Mellem (længere, smallere og hurtigere, hegn kun
i de skarpe sving) og 🚀 Svær (endnu længere og helt uden kanter, kun ved start og mål). De ekstra stykker står
i `mellem` og `svær` på hver bane i `baner.js`, og reglerne i `SVÆRHED` nederst i samme fil.

Øverst i `baner.js` står hvad hvert stykke kan. `spil/rulle-rasmus/?bane=is&sv=svær` starter på en bestemt bane
og sværhedsgrad, og `?debug` giver adgang til spillet i konsollen (`rr`).

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

## Burgerløbet
3D-løbespillet ligger i `spil/burgerloeb/`. Man trækker fingeren til siden for at styre den lille burger.
Stjerner på banen låser hatte op, trampoliner sender burgeren op efter stjerner i luften,
🧲 trækker ting til sig, og 🛡️ er en boble, der tager stødet fra en kagerulle.

| Fil | Indhold |
|---|---|
| `figurer.js` | Burgerens lag (`LAG`), den lille burger med ben, stjerner, trampoliner, bobler og hattene (`HATTE`) |
| `kaemper.js` | Kæmperne for enden: manden, dinoen og monsteret (de skifter fra bane til bane) |
| `bane.js` | Banen: bordet med dugen, tingene, kagerullerne, portene, trampolinerne og pynten i siderne (`TEMAER` = farverne) |
| `spil.js` | Selve spillet: løb, saml, målet og kameraet |
| `lyd.js` | Lydene (Web Audio, ingen lydfiler) |

`spil/burgerloeb/?niveau=3` starter på en bestemt bane, og `?debug` giver adgang til spillet i konsollen (`bl`).
