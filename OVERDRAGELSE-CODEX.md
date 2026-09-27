# Overdragelse til Codex: Broekraft Server + vand/lava/ild

Skrevet af Claude, 27. september 2026. Læs også `AGENTS.md` (arbejdsdeling og kodestil).

**Kort fortalt:** Broekraft er et 3D-byggespil i Minecraft-stil til børn på 3–6 år
(`spil/broekraft/`). Nu skal børn i samme hjem kunne spille sammen. Du laver **serverprogrammet**
og **spillogikken** for vand, lava og ild. Claude laver bagefter alt det visuelle og kobler dine
moduler ind i spillet.

**Arbejd på grenen `codex/server`.** Push ikke til `main`, for den går direkte ud på børnenes tablets.

---

## 1. Sådan er Broekraft bygget i dag

| Fil | Indhold | Ejer |
|---|---|---|
| `spil/broekraft/three.js` | Genbruger three.js 0.160.0 fra jsDelivr (`export * from "https://cdn.jsdelivr.net/…"`) | – |
| `blokke.js` | `BLOKKE` (liste, id = plads i listen, 0 = luft), `ID` (navn → id), `lavAtlas()` (teksturer, kun i browser) | Claude, dog må du tilføje blokke nederst (se §4) |
| `verden.js` | `BX=64, BY=32, BZ=64`, `rng(frø)`, `lavStøj(frø)` (ikke eksporteret endnu), klassen `Verden` (data i `Uint8Array`, `generer(opskrift)`, mesh, stråle, kollision) | Claude |
| `verdener.js` | `VERDENER`: 4 verdener (`græsø`, `zombie`, `svampe`, `maane`) med farver, dyr og en `generer(a)`-opskrift. Ren JS uden DOM | Delt |
| `dyr.js`, `lyd.js`, `spil.js`, `index.html` | Dyr, lyde, spilleren, styring, UI | Claude |

- **Indeks i verdensdata:** `i = x + z*BX + y*BX*BZ`.
- **Gemte verdener** (i `localStorage`) er `{ frø, ændringer: { indeks: id } }`. Terrænet laves altid
  forfra ud fra frøet, og så lægges ændringerne ovenpå. **Græsøen skal derfor genereres helt
  identisk som i dag**, ellers bliver børnenes gemte verdener ødelagt.
- `import` af `blokke.js`, `verden.js` og `verdener.js` rører ikke DOM'en, så de kan importeres i Deno.
  `three.js` hentes fra CDN'et, og `deno compile` pakker den med ind i programmet.
- **Blok-id'er i dag:** 1–26 er de almindelige blokke (26 = Bundsten, uknuselig), 27–41 hører til
  de tre nye verdener, og **42 = TNT**. Næste ledige id er **43**.

---

## 2. Opgave A (vigtigst): Broekraft Server

Et program man henter fra GitHub, som kører på forældrenes PC eller Mac. Tablets på samme wifi
forbinder til det.

### Krav fra ejeren
- Man skal kunne **hente programmet fra GitHub** til både **Windows og Mac**, og alle skal kunne gøre det.
- Man skal kunne **oprette en verden på PC'en og vælge størrelse**.
- Man skal kunne **vælge antal spillere: 1–8**.
- Verdener gemmes på PC'en.

### Teknologi
- **Deno 2**, skrevet i JavaScript (ikke TypeScript), så modulerne kan deles med spillet.
  - `Deno.serve` bruges til både HTTP og WebSocket.
  - `deno compile --target …` laver én programfil pr. platform. Mål: `x86_64-pc-windows-msvc`,
    `x86_64-apple-darwin` og `aarch64-apple-darwin`.
  - `--include` pakker spilfilerne ind i programmet.
- Undgå npm-pakker. En lille QR-kode-generator (MIT) må gerne lægges ind i `server/vendor/`.

### Filer (nye)
```
server/
  main.js            start: find ledig port (8080+), start HTTP/WS, åbn kontrolpanelet i browseren
  verdener.js        opret/indlæs/gem/slet verdener på disken
  generator.js       genererer en verden i valgfri størrelse med opskrifterne fra spil/broekraft/verdener.js
  rum.js             en kørende verden: spillere, klumper, ændringer, TNT
  protokol.md        beskrivelse af beskederne (se nedenfor)
  kontrol/           kontrolpanelet (index.html, kontrol.css, kontrol.js). Hold stil og logik adskilt,
                     for Claude giver det design senere
  test-klient.html   enkel testside: forbind, vælg verden, vis spillere, sæt/fjern blokke
  deno.json          tasks: "start", "test", "byg"
  LÆSMIG.md          vejledning til forældre på dansk (se "Vejledning")
spil/broekraft/net.js  klient-bibliotek som spillet skal bruge (se API nedenfor)
.github/workflows/broekraft-server.yml
```

### Kontrolpanelet (`http://localhost:<port>/kontrol`)
Må kun kunne åbnes fra selve maskinen. Afvis alle forespørgsler, hvor fjern-adressen ikke er
`127.0.0.1` eller `::1`. Panelet skal kunne:
- **Oprette en verden** med disse felter:
  - navn
  - type: en af `VERDENER`
  - størrelse: **Lille 128×128, Mellem 256×256, Stor 512×512 eller Kæmpe 1024×1024**. Højden er
    altid **64**
  - **maks. spillere 1–8** (standard 4)
  - "ild breder sig" til/fra (standard til)
  - frø (valgfrit)
- Vise verdenerne med antal spillere nu/maks, samt knapper til start/stop, backup (zip eller kopi)
  og slet (bekræft to gange).
- Vise **adressen og en QR-kode** til tabletterne: `http://<LAN-IP>:<port>/`. Brug
  `Deno.networkInterfaces()` og vis alle private IPv4-adresser.
- Vise, hvem der er logget på (dyrefigur og verden).
- Skrive, hvis der findes en nyere version på GitHub Releases (valgfrit).

### Lagring
- Data ligger i `%APPDATA%\BroekraftServer\verdener\<id>\` på Windows og
  `~/Library/Application Support/BroekraftServer/verdener/<id>/` på Mac.
- `meta.json` indeholder `{ id, navn, type, bredde, dybde, højde: 64, frø, maksSpillere, ildBreder, oprettet, version }`.
- `data.bin.gz` er hele blokdataen (`Uint8Array`, samme indeks-formel med verdenens egne mål) pakket
  med gzip via `CompressionStream`.
- Gem hvert 60. sekund, når noget er ændret, og når programmet lukkes (fang Ctrl+C/SIGINT).

### Generator
- Byg samme værktøjssæt som `Verden.generer()` i `spil/broekraft/verden.js`, altså `R`, `støj`, `ID`,
  `BX`, `BY`, `BZ`, `top`, `sæt`, `hent`, `nærStart`, `terræn` og `pynt`, bare med verdenens egne mål.
  Kald derefter `VERDENER[x].generer(a)`.
- **Tilladte små ændringer i Claudes filer:**
  1. `verden.js`: tilføj `export` foran `function lavStøj`.
  2. `verden.js`: tilføj i `generer()`-værktøjssættet
     `antal: n => Math.round(n * (BX * BZ) / 4096)`.
  3. `verdener.js`: pak de faste antal ind i `a.antal(…)`. Det gælder antal træer, kirkegårde,
     svampe, kratere og `pynt(n, …)`, så store verdener får lige så tæt skov. Ved 64×64 giver
     `antal(n) === n`, så generationen er uændret.
- Den flade plads omkring startstedet og raketten på månen bruger `BX/2` og `BZ/2`. Det passer også
  i store verdener.
- **Test (skal bestå):** Græsøen med frø `12345` ved 64×32×64 fra din generator skal være **byte for
  byte ens** med `new Verden(12345, null, null, null)` + `generer(VERDENER[0].generer)`. Det virker,
  fordi konstruktøren ikke rører atlas/scene. Lav samme test for de tre andre verdener.
- Store verdener: vis fremgang i kontrolpanelet, mens der genereres. 1024² × 64 er 64 MB og
  fint på en PC.

### Netværk og protokol (skriv den ned i `server/protokol.md`)
- WebSocket på `/ws`. Tekstbeskeder er JSON med feltet `t`. **Klumper sendes binært.**
- En klump er en søjle på 16×16×højde. Lokalt indeks er `x + z*16 + y*256`. Binært format:
  `[1 byte type=1][int32 cx][int32 cz][uint16 højde][data komprimeret som RLE]`. Brug par af
  `(antal:uint8, id:uint8)`; det giver meget luft, så det komprimerer godt.
- **Klient → server**
  - `hej {figur, version}`, hvor figur er en af: `gris, ko, faar, hone, fro, and, snegl, zombie`
  - `verdener {}`
  - `vælg {verden}`
  - `pos {x,y,z,yaw,pitch}` højst 10 pr. sekund
  - `sæt {x,y,z,id}` (id 0 = fjern)
  - `tænd {x,y,z}` (TNT)
  - `emoji {e}`, kun fra en fast liste: `❤️ 😂 👍 🎉 😮 👋`
- **Server → klient**
  - `velkommen {dig, verden:{id,navn,type,bredde,dybde,højde,frø,ildBreder}, spillere:[…]}`
  - `fuld {}`
  - `verdener {liste:[{id,navn,type,bredde,dybde,spillere,maks}]}`
  - `ind {id,figur}` og `ud {id}`
  - `pos {liste:[{id,x,y,z,yaw,pitch}]}` samlet op til 10 gange i sekundet
  - `blok {x,y,z,id}`
  - `bum {x,y,z}` (eksplosion, til effekter)
  - `emoji {id,e}`
  - `fejl {besked}`
- **Klumpstrøm:** Serveren sender de klumper, der ligger inden for en radius af spillerens position
  (standard 6 klumper, sat af klienten med `udsyn {r}`, højst 8). Den husker, hvilke klumper hver
  klient har, og sender kun `blok`-ændringer til klienter, der har den klump. Klienten får besked
  (`glem {cx,cz}`) om klumper, der kommer ud af rækkevidde.
- **Serveren bestemmer:**
  - Tjek koordinater og id. Det skal være en kendt blok, og Bundsten må ikke sættes eller fjernes.
  - Tjek at man ikke sætter en blok inde i en spiller.
  - Højst 20 `sæt` pr. sekund pr. spiller.
  - Ukendte beskeder ignoreres, og beskeder over 4 KB afvises.
- **TNT:** Serveren kører lunten, som varer 2,2 sekunder, og eksplosionen med radius 3,3. Se
  `eksploder()` i `spil.js` for reglerne, herunder kædereaktion med kort lunte. Serveren sender
  `blok`-ændringerne og `bum`.
- **Dyr:** Ikke i denne omgang. Hver tablet har sine egne dyr indtil videre.
- **Maks. spillere håndhæves pr. verden.** Nummer maks+1 får `fuld`.

### Serveren skal også levere selve spillet
Tablets åbner `http://<PC>:<port>/`. Serveren sender:
- sitets filer fra repoet (pakket ind med `--include`)
- en simpel startside `/sammen/` med verdensliste og "Spil"-knap. Den må være helt enkel, for
  Claude designer den
- spillet på `/spil/broekraft/?server=1&verden=<id>`. Claude tilføjer online-tilstanden i `spil.js`

Tjenestearbejderen (`sw.js`) registreres ikke på http via LAN-IP, og det er fint.

### Klient-API i `spil/broekraft/net.js` (Claude bruger dette)
```js
import { forbind } from "./net.js";
const f = await forbind(`ws://${location.host}/ws`, { figur: "gris" });
const liste = await f.verdener();               // [{id, navn, type, bredde, dybde, spillere, maks}]
const info = await f.vælg(id);                  // kaster Error("fuld") hvis verdenen er fuld
f.udsyn(6);
f.pos(x, y, z, yaw, pitch);                     // må kaldes hver frame; biblioteket sender max 10/s
f.sæt(x, y, z, id);  f.tænd(x, y, z);  f.emoji("🎉");
f.addEventListener("klump", e => e.detail);     // {cx, cz, højde, data: Uint8Array(16*16*højde)}
f.addEventListener("glem", …);                  // {cx, cz}
f.addEventListener("blok", …);                  // {x, y, z, id}
f.addEventListener("ind" | "ud" | "pos" | "bum" | "emoji" | "lukket", …);
```
Genforbind automatisk efter korte afbrydelser, fx når en tablet går i dvale, og send `hej`/`vælg`
igen.

### Byg og udgivelse
- `.github/workflows/broekraft-server.yml` starter på tags `server-v*`. Den kører `deno test`, og
  derefter `deno compile` for de 3 mål.
- Pak hvert program som zip sammen med `LÆSMIG.md`:
  - `BroekraftServer-Windows.zip`
  - `BroekraftServer-Mac-Intel.zip`
  - `BroekraftServer-Mac-AppleSilicon.zip`
- Læg zip-filerne på en GitHub Release.
- Mac: sæt eksekverbar-bit inden zip. Programmerne er ikke signeret.

### Vejledning (`server/LÆSMIG.md`, dansk, til forældre)
Vejledningen skal dække:
- hent og pak ud
- Windows SmartScreen ("Flere oplysninger → Kør alligevel")
- Mac Gatekeeper (højreklik → Åbn, eller `xattr -d com.apple.quarantine`)
- firewall ("Tillad" på private netværk)
- tablets skal være på samme wifi, og PC'en skal være tændt
- scan QR-koden og tilføj til hjemmeskærmen
- sådan tager man backup

### Tryghed (børn 3–6 år)
- Der må ikke være fritekst-chat, kun emoji fra den faste liste.
- Der må ikke være navne. Figuren vælges fra en fast liste.
- Serveren lytter kun på lokalnettet. Der skal ikke være port-forwarding eller UPnP.

### Færdig når
1. `deno task start` virker. I kontrolpanelet kan man oprette alle 4 typer i alle 4 størrelser med
   1–8 spillere, og man kan se QR-koden.
2. To faner med `test-klient.html` kan være i samme verden. De ser hinandens positioner, og en blok
   sat i den ene dukker op i den anden. Verdenen er der stadig efter genstart af serveren.
3. Spiller nummer maks+1 får `fuld`.
4. Generator-testene (byte for byte) og protokol-testene består med `deno test`.
5. `deno task byg` laver de 3 programmer lokalt, og workflowet laver en Release på et `server-v0.1.0`-tag.
6. Ingen ændringer i Claudes filer ud over de tre små ændringer nævnt ovenfor.

---

## 3. Opgave B: vand, lava og ild (`spil/broekraft/simulering.js`)

Ren JS uden DOM og three.js, så **præcis samme regler** kan køre på serveren (Opgave A) og i spillet,
når man spiller alene.

### API
```js
import { Simulering } from "./simulering.js";
const sim = new Simulering({
  hent: (x, y, z) => id, sæt: (x, y, z, id) => void, inde: (x, y, z) => bool, højde: 64,
  ildBreder: true,
  tændTNT: (x, y, z) => void,           // spillet/serveren står for lunten og braget
  lyd: (navn, x, y, z) => void,         // "tss", "knitre", "blub" … (valgfri)
});
sim.blokÆndret(x, y, z);                // kald når en blok sættes/fjernes, så naboerne vågner
sim.tick(dt);                           // kaldes hver frame (spillet) eller 20×/s (server)
```
Hold en kø af "aktive" felter, så kun det nødvendige regnes igennem. Hele verdenen må ikke scannes
hver gang.

### Regler (fra ejeren: "lava skal flyde, og ild skal kunne sætte ild til træer")
- **Vand**, kilde plus flydende niveau 1–7:
  - Løber ned først.
  - Spreder sig ellers til siden med ét niveau mere pr. blok, op til niveau 7.
  - Foretrækker retningen mod det nærmeste hul, som i Minecraft.
  - Fjernes kilden, trækker det flydende vand sig tilbage.
  - Cirka 5 opdateringer i sekundet.
- **Lava**, kilde plus niveau 1–3:
  - Samme regler, men kortere og langsommere, cirka 1,5 opdateringer i sekundet.
- **Lava og vand:**
  - Lava-kilde, der rører vand, bliver til **Obsidian**.
  - Flydende lava, der rører vand, bliver til **Sten**.
  - Vand, der løber ind på lava, bliver til **Sten**.
  - Lyd: "tss".
- **Ild:**
  - Ild i et luftfelt ved siden af noget brændbart brænder det brændbare væk efter 2–6 sekunder.
    Blokken bliver til luft eller ild.
  - Ilden går ud af sig selv efter ca. 3 sekunder uden brændbare naboer.
  - Hvis `ildBreder` er sat, spreder ilden sig med lille sandsynlighed pr. sekund til luftfelter
    ved siden af brændbare blokke i nærheden. Så brænder træer og skove!
  - Vand ved siden af slukker ilden.
  - Lava tænder brændbare blokke inden for 1–2 felter en gang imellem.
- **TNT** ved siden af ild eller lava: kald `tændTNT`.
- **Brændbart** efter navn:
  - Træstamme, Blade, Planker, al uld, Kage og Græskar
  - Død stamme, Spindelvæv, Svampestok og Lille svamp
  - Rød blomst og Gul blomst
- Ild og lava gør aldrig børnene noget. Det står Claude for i spillet.

### Nye blokke (tilføj **nederst** i `BLOKKE` i `blokke.js`)
Brug de tekster og tegnefunktioner, der allerede findes, som midlertidige teksturer. Claude laver de
rigtige (animeret vand, lava og flammer) og den rigtige 3D-visning. **Alle nye blokke skal have
`skjult: true`** indtil Claude er færdig, så de ikke dukker op halvfærdige i inventaret.

| id | navn | vigtige egenskaber |
|---|---|---|
| 43 | `Vand` | `væske: "vand", niveau: 0, gennemsigtig: true` |
| 44–50 | `Vand 1` … `Vand 7` | `væske: "vand", niveau: 1–7` |
| 51 | `Lava` | `væske: "lava", niveau: 0, lyser: true` |
| 52–54 | `Lava 1` … `Lava 3` | `væske: "lava", niveau: 1–3, lyser: true` |
| 55 | `Ild` | `ild: true, kryds: true, lyser: true` |
| 56 | `Obsidian` | – |

Dokumentér de nye egenskaber (`væske`, `niveau`, `ild`) i toppen af `blokke.js` i samme stil som de
andre.

### Færdig når
- Der er `deno test`-tests for:
  - vand der løber ned og ud
  - vand der trækker sig tilbage
  - lava og vand der giver obsidian og sten
  - en skov der brænder
  - ild der går ud
  - at "ildBreder: false" stopper spredningen
  - TNT der bliver tændt af lava
- Serveren (Opgave A) bruger `Simulering` i hver kørende verden og sender `blok`-ændringerne ud.

---

## 4. Det laver Claude bagefter (rør det ikke)
- Kategorier på forsiden (3D / 2D / Lær / Tegn & musik) og "Hent Broekraft Server"-siden.
- Online-tilstand i `spil.js`: figurer for de andre spillere, bygning af klumper fra `net.js`,
  udsyn-indstilling, emoji-knapper og design af `/sammen/` og kontrolpanelet.
- 3D-visning af vand og lava (lavere flader efter niveau, gennemsigtigt vand, animation),
  svømning, "Av, varmt!", flammer, lyde, 🔥 tænder-værktøjet og en vandspand.
- Skydeverdenen med typerne geværer, maling, snebolde og bue.

## 5. Spørgsmål
Skriv spørgsmål og beslutninger nederst i denne fil under "Noter fra Codex", så Claude kan se dem.

## Noter fra Codex

Opfølgning: Ejeren bad direkte om tablet-opsætningen med QR-scanning. Den er nu i `tilslut/`,
med link fra forsiden og lokal server. Det er en efterfølgende udvidelse af den oprindelige
arbejdsdeling. Se seneste afsnit øverst i OVERDRAGELSE-CLAUDE.md. Tests: 32 består.

27. september 2026: Server, netværksklient, simulering, kontrolpanel, testklient og release-workflow
er implementeret på `codex/server`. Læs **OVERDRAGELSE-CLAUDE.md**, før integration/design begynder.

- 28 automatiske tests består, inklusive alle 16 kombinationer af verdenstype/størrelse,
  byte-identisk gammel generation, ægte WebSockets, genforbindelse, lagring, adgangskontrol og simulering.
- Windows og begge Mac-mål er krydskompileret. Windows-programmet er kørt fra en anden mappe;
  kontrolpanel/QR, to browserfaner, blokændring, spillerpositioner og gemning er afprøvet.
- Ingen push, tags eller GitHub Release er lavet. Mac-programmer og iPad skal stadig afprøves på de enheder.
- Online-tilstand og grafik er fortsat Claudes opgave. Den simple /sammen-side linker til den aftalte
  `?server=1&verden=...`, men spil.js er bevidst ikke ændret. Vent med udgivelsen til integrationen er klar.
- Beslutning: `/` på serveren viser /sammen-indgangen. Den normale forside findes på `/index.html`.
- Beslutning: vand ovenfra på lava giver sten; berøring fra siden/nedenfra giver obsidian for en lava-kilde.
- Beslutning: ildBreder=false forhindrer ny ild fra både flammer og lava; allerede tændt ild kan brænde direkte naboer.
- Kontrolpanelet beskyttes med loopback, Host/origin-kontrol og lokalt handlingstoken. Serveren binder kun
  til loopback og private IPv4-netkort. Ingen routeropsætning foretages.
- På genforbindelse udsender net.js `velkommen` før klumperne: ryd gamle klumper/spillere dér.
- De eneste ændringer i eksisterende spilfiler er de tilladte generatorjusteringer og nye skjulte blokke 43–56.
