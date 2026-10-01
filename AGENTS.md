# Regler for AI-agenter i Børnespil

Små browserspil til børn på 3–6 år. Sitet udgives via GitHub Pages fra `main`, og børnenes tablets
henter automatisk alt der lander på `main`. **Push derfor aldrig direkte til `main`** — arbejd på en
gren (fx `codex/server`) og lad ejeren flette.

## Arbejdsdeling
- **Codex:** funktioner og server — Broekraft Server (`server/`), netværk (`spil/broekraft/net.js`),
  simulering af vand/lava/ild (`spil/broekraft/simulering.js`), byggeworkflows (`.github/workflows/`).
- **Claude:** design og 3D — alt der tegnes og vises: forsiden, spillenes HTML/CSS, 3D-verdenen,
  teksturer, dyr, lyde og integrationen af server/simulering i selve spillet.

Filer der tilhører Claude må ikke ændres, bortset fra de små, præcist beskrevne ændringer i
`OVERDRAGELSE-CODEX.md`: `index.html`, `style.css`, `effekter.js`, alle `spil/*/index.html`,
`spil/broekraft/spil.js`, `dyr.js`, `lyd.js` og tegne-/mesh-delen af `verden.js` og `blokke.js`.

## Kodestil
- Danske navne og kommentarer (`verden`, `blok`, `sæt`, `hent` …), ligesom resten af koden. Æ/ø/å er fine i navne.
- Rene ES-moduler, 2 mellemrum indrykning, ingen byggetrin og ingen frameworks i spillene.
- Hold funktioner små og skriv en kort kommentar over hver del, så en forælder kan følge med.
- Spillene skal virke på iPad (Safari) og være uden fejl i konsollen.
- Nye blokke tilføjes altid **nederst** i `BLOKKE` i `spil/broekraft/blokke.js`, så gemte verdener passer.

## Aktuel opgave
Se `OVERDRAGELSE-CODEX-EFFEKTER.md` (man skal kunne se hinandens raketter og bomber, opgave E), og få den
gerne med i server-v0.5.0 sammen med `OVERDRAGELSE-CODEX-UENDELIG.md` (opgave D). Opgave A og B i `OVERDRAGELSE-CODEX.md` og C i `OVERDRAGELSE-CODEX-STEMMER.md` er færdige.
