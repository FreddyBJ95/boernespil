# Overdragelse til Codex: man skal kunne se hinandens raketter og bomber (opgave E)

Skrevet af Claude den 1. oktober 2026. Arbejd på en gren (fx `codex/effekter` fra `main`, eller videre
på `codex/uendelig`, hvis den ikke er flettet endnu). Push aldrig direkte til `main`.

## Hvad ejeren oplever
> "Man kan ikke se hinandens raketter eller bomber på serveren"

I dag deler serveren:
- blokkene
- TNT
- et almindeligt brag på 3,3 blokke
- fyrværkeriet

Alt det, der flyver eller tæller ned, ses kun på den tablet, der fyrede det af:
- bazooka-raketter
- kampvognens kanonkugler
- atomkasterens bomber
- missilerne fra NUKE-banen
- svampeskyerne
- tændte atombomber og TNT, der blinker og hopper
- dronerne

Atombomber og missiler giver også kun et lille krater, når man spiller sammen. Serveren laver altid det
samme lille brag.

## Det er Claudes del, og det ligger allerede på main
`spil.js`, `skyd.js` og `atom.js` sender og viser nu effekterne. De kalder `net.effekt?.(slags, data)`,
som ikke findes endnu, så der sker ingenting, før din del er på plads. De lytter på hændelsen `effekt`.
`net.js` laver allerede alle serverbeskeder til hændelser.

Spillet sender højst otte effekter i sekundet. Når en effekt kommer fra en anden spiller, vises den kun.
Den ændrer ingen blokke, giver ingen point og laver ikke sit eget brag. Braget og blokkene kommer fra
serveren som nu.

Det er afprøvet med en lokal flettet kopi af `main` og `codex/uendelig`, hvor `net.effekt` sendte direkte
tilbage til tabletten selv.

## 1. Ny besked: `effekt`
Klient → server: `{ t: "effekt", slags, ...felter }`. Højst 1024 bytes.

Serveren gør tre ting:
- tjekker felterne
- bygger et nyt objekt med kun de tilladte felter
- tilføjer `fra` (afsenderens id) og sender det til **de andre** 0.2.0-spillere i samme rum

Afsenderen får det ikke tilbage. Det skal virke i både de endelige og den uendelige verden.

| slags | felter | krav |
|---|---|---|
| `skud` | `type, x, y, z, vx, vy, vz` | `type` er `gevær`, `bazooka`, `maling`, `kanon` eller `atom`. Starten er højst 8 blokke fra afsenderens position, og `vx/vy/vz` er en retning med længde højst 1,5 |
| `missil` | `x, z, bund, top, mx, mz, forsinkelse` | `x/z/bund/top` er heltal inde i verdenen, og 0 ≤ bund ≤ top < højde, top − bund ≤ 24. Missilet står højst 96 blokke fra afsenderen, og målet `mx/mz` ligger inde i verdenen. `forsinkelse` er 0–5 |
| `svampesky` | `x, y, z, str` | `str` er `mini`, `atom` eller `kæmpe`, og stedet er højst 128 blokke fra afsenderen |
| `lunte` | `x, y, z, id, lunte` | Heltal højst 12 blokke fra afsenderen. `id` er en blok med `tnt` eller `atom`, og `lunte` er 0,2–6 |
| `droner` | `x, y, z` | Højst 12 blokke fra afsenderen |

- Alle tal skal være endelige. Ukendte `slags` og ugyldige effekter ignoreres stille.
- Hver spiller må sende højst 8 i sekundet, og hvert rum højst 40 i sekundet. Det overskydende smides væk.
- I `net.js`:

  ```js
  effekt(slags, data) { if (this.klar && this.version === "0.2.0") this.send({ t: "effekt", slags, ...data }); }
  ```

- Skriv effekten i `server/protokol.md` under "Fælles brag og fyrværkeri".

## 2. Større brag til atombomber og missiler
`net.brag(x, y, z, slags)` kaldes nu med et fjerde argument, når det er en atomsprængning. Det er
`"mini"` for atomkasteren, og `"atom"` eller `"kæmpe"` for bomber og missiler. `net.js` skal sende det med.

- Radius:
  - `mini` 5
  - `atom` 9
  - `kæmpe` 13 (samme som `STØRRELSE.R` i `atom.js`)
  - uden `slags` som nu, 3,3
- `atom` og `kæmpe` laver også krateret på serveren, så alle ser det samme. Det er det samme mønster
  som `atomKrater` i `spil.js`, inden for 0,95 × R på de øverste blokke:
  - nær midten (afstand under 0,35 × R) bliver 30 % til `Atomslim`
  - ellers bliver 55 % til `Aske`
  - 3 % får `Ild` ovenpå
  - `uknuselig` og væsker springes over
- Højst ét `atom`- eller `kæmpe`-brag hvert andet sekund pr. spiller, og højst to ad gangen pr. rum.
- `bum` må gerne få `slags` med, så tabletterne kan gøre glimtet større. Claude bruger det, når det er der.

## Tests (mindst)
- `effekt` når frem til de andre i samme rum, men ikke til afsenderen og ikke til et andet rum.
- Ugyldige felter, for langt væk og for mange pr. sekund bliver ignoreret.
- Ekstra felter bliver ikke sendt videre.
- `brag` med `slags: "atom"` fjerner blokke i radius 9, og uden `slags` stadig 3,3.
- Gamle klienter, der ikke sender `slags`, virker som før.

Det er en god idé at få det med i server-v0.5.0, før den tagges, for den er ikke udgivet endnu.
