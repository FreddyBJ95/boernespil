# Overdragelse til Codex: Spilkassen på familieserveren (opgave G)

3. oktober 2026. Claude har sat Spilkassens logo, maskot og nye appikon på forsiden og lavet et låst
voksenrum (🔒 Voksenspil nederst på forsiden). Det hele virker på GitHub Pages. Familieserveren pakker
kun de filer, der står i `filer` i `server/byg.js`, og derfor mangler et par af dem dér.

## Det, der skal med i serverpakken (`server/byg.js` og det, `server/main.js` serverer)

| Fil eller mappe | Bruges til |
| --- | --- |
| `billeder/` (hele mappen) | billederne på forsiden, logoet og maskotterne i `billeder/spilkassen/` og `billeder/sigtekorn.jpg` |
| `favicon.png` | ikonet i browserfanen |
| `apple-touch-icon.png` | appikonet på iPad, når siden lægges på hjemmeskærmen |
| `icon-maskable-512.png` | appikonet på Android (står i `manifest.json`) |

`billeder/` stod allerede i Codex' egen overdragelse (OVERDRAGELSE-CLAUDE-SPILKASSEN.md). Siden bruger kun
de små WebP-filer i `billeder/spilkassen/`. De store PNG-originaler ligger der også, men kun som kilde.
Låsen ligger i `spil/laas.js`, så den kommer allerede med via `../spil`.

## Sådan prøver du det

Byg serveren og åbn forsiden fra den. Logoet og billederne skal vises. 🔒 Voksenspil skal bede om
koden, og Sigtekorn skal kunne åbnes fra voksenrummet uden at spørge om koden igen. Brug aldrig familiens rigtige
datamappe (`%APPDATA%/BroekraftServer`) til test.

Rør ikke `index.html`, `style.css` eller `sw.js` (de er Claudes). Kun `server/`.

## Status fra Codex, 3. oktober 2026

Rettelsen er klar på `codex/spilkassen-server`, commit `7f29672`, og ligger til gennemgang i
[PR #4](https://github.com/FreddyBJ95/boernespil/pull/4). Arbejdsmappe:
`C:/Users/Frede/.codex/worktrees/pi-afproevning/boernespil/`.

- Pakken medtager hele `billeder/` og de tre nye ikonfiler.
- Serveren udleverer billederne og genkender WebP, GLB og BIN. De sidste to kræves af Sigtekorns
  modeller og bagte lys. Afskærmningen af private filer er bevaret.
- Alle 117 servertests består. Windows-programmet er bygget og pakketesten består, inklusive GET/HEAD
  for 45 billeder, ikoner og Sigtekorn-filer samt afvisning af private stier.
- Linux ARM64 (Pi), Mac Intel og Mac Apple Silicon er også bygget. Disse programmer er ikke kørt lokalt
  på deres målplatforme. [GitHub Actions](https://github.com/FreddyBJ95/boernespil/actions/runs/37155243557)
  har desuden bygget alle fem platforme og bestået installation og HTTPS på både Linux x64 og ARM64.
- Chrome viser logoet og billederne fra den byggede server. En ny fane viser voksenlåsen; i den allerede
  oplåste spilsession åbner voksenrummet og Sigtekorn uden ny kode. En kørende kamp er set med modeller,
  teksturer og lys, og genladning via R er prøvet. Automatisk Start/Fortsæt kunne ikke fange musen;
  selve musefangsten skal derfor prøves med et manuelt klik i Chrome.

Testen bruger en ny midlertidig datamappe, aldrig familiens gemte verdener. Skærmbillede af forsiden:
`C:/Users/Frede/.codex/worktrees/pi-afproevning/boernespil/server/dist/spilkassen-forside.jpg`.

**Pi'en er endnu ikke opdateret, og der er ikke lavet en ny udgivelse.** Rettelsen afventer ejerens fletning.
