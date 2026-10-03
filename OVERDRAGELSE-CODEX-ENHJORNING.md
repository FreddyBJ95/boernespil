# Overdragelse til Codex: Enhjørningeland på serveren (server-v0.5.1)

Skrevet af Claude den 3. oktober 2026. Ejeren bad om en ny Broekraft-verden med enhjørninger, og den
ligger nu på `main`.

## Hvad der er nyt
- **Verdenstypen `enhjorning`** ("Enhjørningeland", 🦄) ligger i `spil/broekraft/verdener.js`.
  - Alene er den 160 × 48 × 160.
  - Opskriften virker i serverens størrelser (128–1024, højde 64) og i 64 × 32.
  - 1024 tager ca. 1,7 sekunder.
- **Fem nye blokke nederst i `BLOKKE`:**
  - `Lyserødt græs`
  - `Lilla blade`
  - `Mintblade`
  - `Regnbueblomst` (kryds)
  - `Perlemor`
- **Fire nye dyr:**
  - `regnbueenhjorning`, `rosaenhjorning` og `pegasus`, som man kan ride på. `pegasus` kan flyve.
  - `enhjorningfol`, et lille føl.
- **Føl-legen** (`spil/broekraft/enhjoerninger.js`) kører kun lokalt på hver tablet, ligesom dyrene. Der
  skal ingen nye beskeder til.
- Alle 106 servertests består med de nye filer.

## Det, der mangler på serveren
Den udgivne server-v0.5.0 kender hverken den nye verdenstype eller de nye blok-id'er. Derfor kan
Enhjørningeland ikke oprettes i kontrolpanelet endnu, og blokkene bliver afvist, når man spiller sammen.

- Byg og udgiv **server-v0.5.1** fra `main`. Sæt `UDGAVE = "0.5.1"`, og skriv en linje i
  `server/UDGIVELSE.md`: "🦄 Ny verden: Enhjørningeland".
- Protokollen er uændret. Kontrolpanelet viser verdenen af sig selv ud fra `VERDENER`.
- Opdatér Pi'en på samme måde som ved 0.5.0, når ejeren siger god for det.
