# Overdragelse til Codex: Den uendelige verden over serveren (opgave D)

Skrevet af Claude den 1. oktober 2026. Opgave A (Broekraft Server), B (simulering) og C (walkie-talkie)
er færdige. Arbejd på en ny gren **`codex/uendelig`** fra `main`. Push aldrig til `main`, så fletter
ejeren.

## Hvad ejeren ønsker
Børnene skal kunne spille **Den uendelige verden** (`uendelig`) sammen på familiens server, ligesom de
andre verdener. Alene på tabletten virker den allerede (se `PLAN-UENDELIGHEDSVERDENEN.md`).

I dag laver serveren en almindelig, endelig firkant af landet (128–1024 blokke), med hjemmet i midten.
Den skal i stedet være uden kanter, ligesom når man spiller alene.

## Først: udgiv server-v0.5.0
Ejeren sagde ja til `server-v0.5.0` den 29. september 2026. Claude fik ikke lov at ændre i `server/`, så
udgivelsen er ikke lavet.

Siden 0.4.0 er der kommet portaler (blok 68), mange nye blokke (over 160) og nye verdener:
underverden, brandby, pirat, hav, slik, sky, bondegaard, dino, atom, tornado og uendelig.

- Sæt `UDGAVE = "0.5.0"` i `server/verdener.js` og skriv i `server/UDGIVELSE.md`.
- Kør testene, og tag `server-v0.5.0`, ligesom ved de tidligere udgivelser.
- Verdener med `skjult: true` (i dag kun `guldslot`) må **ikke** kunne vælges i kontrolpanelet. Man
  kommer kun dertil på Guld-føniksens ryg, når man spiller alene.

Udgiv gerne 0.5.0 for sig, før resten af opgaven, så børnene kan få de nye verdener online med det samme.

## Sådan laves landet
Alt landet kommer fra én funktion i `spil/broekraft/uendelig.js`, som er ren JS uden DOM:

```js
import { lavLand, STØRRELSE, MIDT, HJEMHØJDE } from "../spil/broekraft/uendelig.js";
import { lavStøj } from "../spil/broekraft/verden.js";
import { ID } from "../spil/broekraft/blokke.js";

const land = lavLand({ støj: lavStøj(frø), ID, BY: 64, frø });
const data = land.søjle(cx, cz);   // Uint8Array(16 * 16 * 64), indeks x + z*16 + y*256
```

- `søjle(cx, cz)` er deterministisk: samme frø og samme cx/cz giver altid de samme bytes. Den bruger
  kun søjlens egne koordinater, så søjlerne kan laves i vilkårlig rækkefølge og i en worker.
- Verdenen er `STØRRELSE` = 65536 blokke i hver retning. Hjemmet ligger i `MIDT` = 32768, og pladsen
  er i højde `HJEMHØJDE` = 18. Der er 4096 × 4096 søjler, og koordinaterne er aldrig negative.
- Brug `meta.frø` direkte som `frø`. Lad være med at bruge et tal fra `R()`, sådan som den endelige
  `generer` gør i dag. Ellers bliver landet ikke det samme som på tabletten.
- Én søjle tager under et millisekund på en pc, men der kommer mange, når nogen flyver. Lav dem gerne i en worker (som `generator-worker.js`), så rummet ikke
  hakker, når en spiller går hurtigt.

## Gemning: kun det, børnene ændrer
En hel verden på 65536² kan ikke ligge i én `data.bin.gz`. Gem i stedet kun **ændringerne** pr. søjle,
ligesom tabletten gør (`verden.søjleÆndringer` i `verden.js`).

- Ny `DATA_VERSION` (fx `"0.2.0"`), men kun for typen `uendelig`. De gamle verdener beholder deres format
  uændret.
- `meta.json` for en uendelig verden har `bredde = dybde = 65536` og `højde: 64`. Kontrolpanelet skal ikke
  spørge om størrelse for denne type, men vise "uden kanter".
- Ændringerne gemmes fx i regioner på 32 × 32 søjler (`ændringer/r.<rx>.<rz>.bin.gz`). Hver ændring er
  et indeks i søjlen og et blok-id. Det er det samme atomiske "skriv .ny og omdøb" og den samme kø som
  nu. `backup` kopierer hele mappen.
- Det, der er i hukommelsen, er de søjler, nogen kan se, plus et lille LRU-lager. Søjler, ingen har set i
  et stykke tid, glemmes. De laves igen fra frøet plus ændringerne, næste gang nogen kommer forbi.

## Rummet og protokollen
- `velkommen.verden` får `uendelig: true`. `bredde` og `dybde` er 65536.
- Klumper sendes præcis som i dag (binære, header på 11 bytes, RLE). cx og cz kan nu gå op til 4095.
  `udpakKlump` i `net.js` tillader i dag kun cx og cz under 64. Grænsen skal i stedet komme fra
  verdenens bredde.
- `pos`, `sæt`, `tænd`, `brag`, fyrværkeri og kasser skal tjekkes mod 0…65536, ligesom før med bredden.
- Startpladsen er hjemmet: `x = MIDT + 0.5`, `z = MIDT + 0.5`, `y` er toppen af søjlen + 1.
- Blokændringer i en søjle, der ikke er indlæst, skal indlæse søjlen først. Det sker fx ved en TNT-kæde
  ud over kanten af det sete.
- Simuleringen (vand, lava, ild) kører kun i indlæste søjler. Vand, der løber mod en søjle, som ikke er
  indlæst, standser bare ved kanten og fortsætter, når søjlen bliver indlæst igen. Der må ikke komme fejl,
  og der må ikke komme huller.

## Det tager Claude sig af bagefter
Rør ikke `spil.js`, `verden.js`, `uendelig.js` eller de andre filer, der tegner, men skriv i protokollen,
hvad Claude skal bruge. Claude laver så:

- Det spillet gør, når `velkommen.verden.uendelig` er sand: det tegner søjlerne fra serveren i stedet for
  at lave dem selv, og kortet og årstiderne virker stadig.
- Tog, luftballon, spådamen, guldet og stenene kører lokalt på hver tablet (ligesom dyrene). Andre
  spillere kan ses, men toget er ikke fælles.

## Tests (mindst)
- En søjle fra serveren er byte for byte den samme som `lavLand(...).søjle(cx, cz)` på tabletten.
- En ændring langt fra hjemmet (fx x = MIDT + 3000) gemmes, overlever en genstart og bliver sendt i den
  rigtige klump.
- `net.js` tager imod en klump med cx = 2100.
- En spiller, der går 2000 blokke, får hukommelsen til at stige og så falde igen. Den må ikke stige
  hele tiden.
- Vand og TNT ved kanten af det indlæste giver ingen fejl.
- De gamle verdenstyper og 0.1.0-klienter virker som før.
- `skjult: true` vises ikke i kontrolpanelets liste.
