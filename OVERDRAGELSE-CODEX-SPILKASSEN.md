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
