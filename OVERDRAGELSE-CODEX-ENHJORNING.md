# Overdragelse til Codex: Enhjørningeland sammen (server-v0.5.1, opgave F)

Skrevet af Claude den 3. oktober 2026. Ejeren vil gerne have, at børnene kan spille den nye verden
**Enhjørningeland** sammen på familiens server, ligesom de andre verdener. Arbejd på en gren
(fx `codex/enhjorning`) fra `main`, og lad ejeren flette. Push aldrig direkte til `main`.

## Det, der allerede ligger på main
- **Verdenstypen `enhjorning`** ("Enhjørningeland", 🦄) ligger i `spil/broekraft/verdener.js`.
  - Opskriften virker i serverens størrelser (128–1024, højde 64) og i 64 × 32.
  - 1024 tager ca. 1,7 sekunder.
  - Stalden står, hvor `enhjørningStald(BX, BZ)` siger.
- **Fem nye blokke nederst i `BLOKKE`:**
  - `Lyserødt græs`
  - `Lilla blade`
  - `Mintblade`
  - `Regnbueblomst` (kryds)
  - `Perlemor`
- **Fire nye dyr:**
  - `regnbueenhjorning`, `rosaenhjorning` og `pegasus`, som man kan ride på. `pegasus` kan flyve.
  - `enhjorningfol`, et lille føl.
- **Føl-legen** (`spil/broekraft/enhjoerninger.js`) kører kun lokalt på hver tablet, ligesom dyrene. Den
  skal ikke deles: hvert barn finder sine egne fem føl.
- Alle 106 servertests består med de nye filer.

## 1. Udgiv server-v0.5.1 med den nye verden
Den udgivne server-v0.5.0 kender hverken verdenstypen eller de nye blok-id'er. Derfor kan
Enhjørningeland ikke oprettes i kontrolpanelet, og blokkene bliver afvist, når man spiller sammen.

- Sæt `UDGAVE = "0.5.1"`, og skriv i `server/UDGIVELSE.md`:
  - "🦄 Ny verden: Enhjørningeland"
  - "🐴 Man kan se, når de andre rider" (punkt 2)
- Kontrolpanelet viser verdenen af sig selv ud fra `VERDENER`.
- Opdatér Pi'en på samme måde som ved 0.5.0, når ejeren siger god for det.

## 2. Man skal kunne se, at de andre rider på en enhjørning
Det dyr, man rider på, findes kun på ens egen tablet. De andre ser derfor bare ens dyrefigur svæve hen
over engen, også når man flyver på en flyvende enhjørning. Det gælder alle dyr, man kan ride på
(ko, hest, drage, enhjørninger …), i alle verdener.

**Tabletterne er allerede klar (på main):**
- `spil.js` kalder nu `net.pos(x, y, z, yaw, pitch, rid)`. `rid` er id'et på det dyr, man rider på (fx
  `"pegasus"`), ellers `null`. Den nuværende `net.js` ignorerer det sjette argument.
- Når en spiller i `pos.liste` eller i `velkommen.spillere` har `rid`, tegner `figurer.js` dyret under
  spillerens figur (`Figur.sætRid`). Spillerens fødder er 0,6 blok over dyrets.
- I Enhjørningeland kommer der også regnbuespor bag de andre, der rider på en enhjørning.

**Det skal serveren og `net.js` gøre:**
- **Klienten:**
  - `net.pos(x, y, z, yaw, pitch, rid = null)` gemmer `rid` i positionen, så den kommer med igen efter
    genforbindelse.
  - Den sender `{ t: "pos", x, y, z, yaw, pitch, rid }`. `rid` udelades, når det er `null`.
  - Skifter `rid`, skal den nye position sendes med det samme. Den må ikke vente på de 100 ms.
- **Serveren:**
  - Gem `s.rid`, når `rid` er en streng på 2–24 tegn med `a–z`. Er `rid` ikke med i en ellers gyldig
    `pos`, sættes `s.rid = null`. Ugyldige værdier giver også `null`.
  - Serveren behøver ikke at kende listen over dyr. Tabletterne viser kun dyr med `ride: true` fra
    `dyr.js` og ignorerer resten.
- **Videre til de andre:**
  - `spillerInfo` får `rid` med, når det er sat. Så kommer det med i `pos.liste` og i
    `velkommen.spillere`.
  - Gamle klienter ignorerer feltet.
- Skriv det i `server/protokol.md` under `pos`.

## Tests (mindst)
- Man kan oprette en `enhjorning`-verden i alle fire størrelser, og de nye blok-id'er kan sættes og
  fjernes.
- `rid` kommer med i `pos.liste` og i en ny spillers `velkommen.spillere`.
- `rid` forsvinder, når en `pos` kommer uden `rid`.
- Ugyldige `rid` (tal, for lange, store bogstaver) gemmes ikke.
- Gamle 0.1.0-klienter og klienter uden `rid` virker som før.
