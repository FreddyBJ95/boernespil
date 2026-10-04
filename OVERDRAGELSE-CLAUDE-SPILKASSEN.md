# Overdragelse til Claude: Spilkassen-logo og maskoter

3. oktober 2026. Ejeren har valgt navnet **Spilkassen** (Claudes forslag), logo nr. 3 og derefter godkendt den mere livagtige version. Ejeren bad derefter Codex lave billeder til appen.

## Færdige billeder

Logo og billeder er nu kopieret til den fælles projektmappe, så Claude kan bruge dem direkte. Kopierne er kontrolleret mod originalerne. Hele billedmappen ligger her:

`C:/Users/Frede/Documents/GitHub/boernespil/billeder/spilkassen/`

| Fil under billedmappen | Foreslået brug |
| --- | --- |
| `logo.png` | Det godkendte logo med navnet Spilkassen |
| `maskoter/kasseven-vinker.png` | Velkomst, forside og spilvalg |
| `maskoter/kasseven-fejrer.png` | Fejring af en gennemført opgave |
| `maskoter/kasseven-taenker.png` | Hjælp, tips og korte instruktioner |
| `maskoter/kasseven-sover.png` | Rolige pauser eller ventetid |
| `maskoter/stjerneven.png` | Ekstra forslag; ejeren syntes, at stjernen var malplaceret |

Alle billeder er PNG i 1254 × 1254 med gennemsigtig baggrund. Maskoterne er uden tekst. Den blå hovedfigur har samme turkise front, blå sider, orange top og bløde 3D-stil som det godkendte logo, samt små hænder og fødder til udtrykkene. Brug de fire blå kassefigurer som grundlag for appen. Stjernen er bevaret som forslag, men bør ikke sættes ind uden et nyt valg fra ejeren.

Billederne er visuelt kontrolleret, og gennemsigtigheden er kontrolleret i filerne. Originaler ligger fortsat i Codex' generated_images-mappe. Prompts er gemt i:

`C:/Users/Frede/Documents/GitHub/boernespil/output/imagegen/spilkassen-maskotpakke-prompts.json`

Den oprindelige arkivpakke med logo, maskoter, prompts og den tidligere overdragelse ligger stadig i Codex' arbejdsmappe:

`C:/Users/Frede/.codex/worktrees/enhjorning/boernespil/output/imagegen/spilkassen-maskotpakke-20261003.zip`

## Integration

Brug billedfilerne under `billeder/spilkassen/` i den fælles mappe i designet. Bevar billedforholdet og lad billederne få plads; der er luft omkring figurerne. De fire blå maskotbilleder er klar som selvstændige illustrationer.

HTML, CSS, manifest, installeret appikon og service worker er endnu ikke ændret med den nye identitet. Maskotønsket omfattede selve billederne. Appikonet bør senere få en separat version af den blå kasse uden ordmærket.

Ved integration på den lokale familierserver skal Codex også sikre, at `server/byg.js` inkluderer `billeder/`, og at `server/main.js` serverer mappen. Det er endnu ikke med i serverpakken. Claude håndterer placering og cache af de nye illustrationer.

Der er ikke foretaget push eller udgivelse som del af billedopgaven.
