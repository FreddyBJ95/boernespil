# Overdragelse til Codex: Sigtekorn online mod familien (opgave H)

Skrevet af Claude den 4. oktober 2026. Arbejd på en ny gren **`codex/spilrum`** fra `main`. Push aldrig
til `main`, så fletter ejeren.

## Hvad ejeren ønsker
Ejeren vil spille **Sigtekorn** (`spil/sigtekorn`, voksenspillet bag PIN-låsen) mod resten af familien
over familiens server. Det er en holdkamp på samme bane: hver spiller sidder ved sin egen computer på
hjemmets net.

Klienten er færdig og ligger på `main` i `spil/sigtekorn/online.js`. Den taler med serveren gennem en ny,
lille og **generel** spil-kanal, som du skal lave i `server/`. Kanalen ved intet om Sigtekorn. Den holder
styr på rum, navne og vært og sender korte beskeder videre mellem spillerne i samme rum, så andre spil
kan bruge den senere.

Brøkrafts `/ws` skal ikke ændres.

## Hvordan klienten forbinder
- Sigtekorn åbnes fra serveren selv, fx `https://192.168.0.26:8443/spil/sigtekorn/`.
  - Spillets filer bliver allerede serveret og pakket (`/spil/...` i `main.js` og `byg.js`).
  - Alle endelser er i MIME-tabellen: html, js, json, glb, bin, webp.
- Klienten åbner `wss://<samme vært>/ws/rum`, eller `ws://` over http.
- Samme adgangsregler som `/ws`:
  - privat IP eller loopback
  - Host-allowlist
  - `Origin` skal være serverens egen
  - højst 128 forbindelser i alt
- Kun JSON-tekst med typefeltet `t`, ligesom i dag. Binære beskeder afvises.
- Ukendte typer ignoreres.

## Beskeder fra klienten

### `hej` (skal komme først)
```json
{ "t": "hej", "spil": "sigtekorn", "version": 1, "navn": "Far", "rum": "familie" }
```
- `spil`: 2–16 tegn a–z. Rum hører til ét spil, så nøglen er `spil + "/" + rum`.
- `version`: heltal. Klienten sender 1. Afvis kun, hvis du senere har brug for det.
- `navn`: 1–16 tegn efter trim. Bogstaver (også æøå), tal, mellemrum og bindestreg.
  - Hvis navnet allerede findes i rummet, så sæt " 2", " 3" … bag på det.
- `rum`: 1–20 tegn a–z, 0–9, æ, ø, å og bindestreg (efter trim og små bogstaver).
- Er rummet fuldt (8 spillere), så svar `{"t":"fuld"}` og luk forbindelsen.
- Alt andet ugyldigt: `{"t":"fejl","tekst":"…"}`.
- Rummet oprettes, når den første kommer, og slettes, når den sidste går.
- Der er ingen kontrolpanel-opgaver og intet, der gemmes på disken.

Svaret til den nye spiller:
```json
{ "t": "velkommen", "dig": "k3f9a2", "navn": "Far", "vært": "a81c0d", "spillere": [{ "id": "a81c0d", "navn": "Mor" }], "tilstand": { "bane": "havnen" } }
```
- `dig`: et kort, tilfældigt id pr. forbindelse. 6–12 tegn a–z og 0–9 er nok.
- `navn`: det navn, man fik (fx "Far 2", hvis der allerede var en "Far").
- `spillere`: de andre i rummet, **uden** den nye selv.
- `vært`: den, der har været længst i rummet. Det er den nye selv, hvis rummet var tomt.
- `tilstand`: det sidste, værten har sendt med `tilstand` (se nedenfor), eller `null`.

De andre i rummet får `{ "t": "ind", "id": "k3f9a2", "navn": "Far" }`.

### `tilstand` (kun værten)
```json
{ "t": "tilstand", "data": { "bane": "havnen", "spiltype": "hold" } }
```
- `data` er et JSON-objekt på højst 512 bytes.
- Serveren gemmer det til nye spillere og sender `{ "t": "tilstand", "data": … }` til alle andre i rummet.
- Kommer det fra en, der ikke er vært, ignoreres det.

### `til` (videresend til de andre)
```json
{ "t": "til", "data": { "k": "tilstand", "p": [1.2, 0, 40.5] } }
{ "t": "til", "til": "a81c0d", "data": { "k": "træf", "liv": 36 } }
```
- `data` er et JSON-objekt på højst 1500 bytes. Serveren kigger ikke i det.
- Uden `til` sendes `{ "t": "fra", "id": "<afsenderens id>", "data": … }` til **alle andre** i rummet. Afsenderen får det ikke selv.
- Med `til` sendes det kun til den spiller. Findes id'et ikke i rummet, droppes beskeden stille.
- Grænser: 40 beskeder i sekundet pr. spiller og 240 pr. rum. Det, der er for meget, droppes stille uden at lukke forbindelsen.
  - Klienten sender omkring 20 tilstande og op til 15 skud i sekundet.

## Beskeder fra serveren
| `t` | Felter | Hvornår |
|---|---|---|
| velkommen | dig, navn, vært, spillere, tilstand | svar på `hej` |
| fuld | – | rummet har allerede 8 |
| ind | id, navn | en ny kom ind i rummet |
| ud | id | en gik (eller forbindelsen døde) |
| vært | id | værten gik: den, der nu har været længst i rummet, er ny vært (sendes til alle) |
| tilstand | data | værten sendte ny tilstand |
| fra | id, data | en anden spillers besked |
| fejl | tekst | noget var ugyldigt |

## Det, klienten gør med det (så du ved, hvad der går igennem)
Klienten er ansvarlig for alt spillet. Serveren er bare et rum og et postkontor.

`data.k` i `til`-beskederne er en af disse:

| `k` | Hvad det er |
|---|---|
| `tilstand` | position, fart, retning, våben, hold og liv (cirka 20 i sekundet) |
| `skud` | et skud, så de andre kan se sporet og høre det |
| `granat` | en kastet granat, raket eller pil (kun til at se på) |
| `træf` | sendes kun til den, der blev ramt: skaden fra skytten |
| `død` | den, der døde, fortæller alle, hvem der dræbte, og med hvad |

Værten sætter banen med `tilstand: { bane }`. Kommer man ind med en anden bane, skifter spillet selv bane
og forbinder igen.

## Test
Lav tests ligesom de andre i `server/tests/`:
- `hej` med gyldige og ugyldige navne, rum og spil, og samme navn to gange (" 2").
- Rummet fuldt ved 8.
- `til` til alle (afsenderen får det ikke selv) og `til` til én.
- `tilstand` virker kun fra værten, og nye spillere får den gemte i `velkommen`.
- Der kommer en ny `vært`, når værten går, og rummet slettes, når det er tomt.
- Grænserne: for store og for mange beskeder droppes stille.
- `/ws` (Brøkraft) virker uændret.

Claude har testet klienten mod en lille testudgave af kanalen i Node, der følger beskrivelsen her. Den er
ikke en del af repoet. Brug den gerne som facit for adfærden, hvis noget er uklart, men skriv serverens
egen udgave i Deno ligesom resten af `server/`.

## Udgivelse
Når det virker, så bump `UDGAVE` i `server/verdener.js` (fx 0.6.0), skriv i `server/UDGIVELSE.md` og
skriv i `server/LÆSMIG.md`, at Sigtekorn kan spilles online fra `https://<ip>:8443/spil/sigtekorn/`.
