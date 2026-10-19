# Nedrivningsfirmaet

Et 3D-spil blandt Spilkassens 3D-spil (uden PIN-kode): sæt sprængstof på rigtige bygninger, og få dem til at styrte
sammen. Tolv opgaver (skur, murstenshus, fabriksskorsten, vandtårn, lagerhal med tønder, betonblok,
gaslager om natten, et højhus mellem to naboer, et stenbrud, en lavine, en gammel bro over en flod og en
fyrværkerifabrik) og et frit område. Sprængstof: dynamit, C4, skæreladning, termit, bjergladning, TNT,
benzintønder, gasflasker, fyrværkeri og lunter, man trækker med fingeren.

## Filerne

| Fil | Hvad den gør |
| --- | --- |
| `spil.js` | Faserne (menu → opgave → placering → tænding → resultat), tryk, værktøjskassen og løkken |
| `dele.js` | Bygningernes stykker: statik (hvad står på hvad), klumper der falder samlet, hængsler i tårne, knusning til brokker |
| `bygninger.js` | Betonblok/højhus, skorsten, vandtårn, lagerhal, murstenshus og træskur — bygget af rigtige dele |
| `sprængstof.js` | Ladninger (dynamit, C4, skæreladning), TNT, benzintønder, gasflasker (raketter) og gastanke — og kædereaktionen |
| `effekter.js` | Ildkugler, røg og støv (et pust med støj, der sorteres bagfra), gnister, grus, glasskår, brændemærker og lys |
| `efterbehandling.js` | Lyset stråler ("bloom") og filmfarver (ACES) |
| `lyd.js` | De rigtige optagelser: afstand, forsinkelse (343 m/s), ekko og en kompressor |
| `materialer.js` | Fotoene af beton, mursten, træ og stål lagt på delene i deres egne meter |
| `fysik.js` | Rapier (fysikmotoren) |
| `baner.js` | Opgaverne og hvordan de bedømmes |
| `terraen.js` | Bjerget (lavinen), stenbruddets klippevæg og kløften med floden — samme trekanter til tegning og fysik |
| `lunte.js` | Lunterne: tegnes med fingeren, gnisten løber langs dem og tænder det, den når |
| `enhed.js` | Den lette udgave til tablets og telefoner (`?mobil` / `?pc` til afprøvning) |
| `verden.js`, `styring.js`, `ruder.js` | Pladsen og byen, kameraet, vinduerne |

`?debug` i adressen giver `window.nd` (fx `nd.bane("skorsten")`, `nd.tænd()`, `nd.spol(2)`).

## Kilder og licenser

- **Fysik:** [Rapier](https://rapier.rs) (`@dimforge/rapier3d-compat` 0.21.0), Apache-2.0 — `rapier/rapier.js` er pakkens `dist/rapier.mjs` uændret.
- **Fotos af beton, puds, planker, blik, metal, grus og klippe:** Poly Haven (CC0), deles med Sigtekorn (`../sigtekorn/teksturer/`).
- **Mursten:** lavet med `blender/lav_mursten.py`. **Modellerne:** `blender/lav_modeller.py` (Blender 5.2, bruger `../sigtekorn/blender/faelles.py`).
- **Lyde:** optagelser fra [Freesound](https://freesound.org), alle CC0 (fri brug). Hentes med `blender/hent_lyde.py` og klippes med `blender/klip_lyde.py`.

| Lyd | Freesound |
| --- | --- |
| tnt | [Explosion with debris — authentic, 4 kg TNT](https://freesound.org/s/165808/) · sidohzen |
| bjerg | [Dynamite explosion in the mountain](https://freesound.org/s/251401/) · felix.blume |
| mine | [Big dynamite explosion in an open mine (Chile)](https://freesound.org/s/475780/) · felix.blume |
| minesprengning | [blast Mining](https://freesound.org/s/127943/) · WaveAdventurer |
| dynamit | [Dynamite 4](https://freesound.org/s/160798/) · Evan Cruder |
| knald | [Grenade Open Field High Quality 2](https://freesound.org/s/752629/) · modusmogulus |
| fjern | [distant explosion](https://freesound.org/s/324277/) · Kostrava |
| stor | [Big Explosion](https://freesound.org/s/741173/) · qubodup |
| kontrolleret | [Dry Controlled Explosion](https://freesound.org/s/698400/) · ninoing |
| styrt_kort | [building collapse / demolition](https://freesound.org/s/712918/) · greyfeather |
| styrt | [Building Collapse](https://freesound.org/s/845932/) · craigsmith |
| traehus | [Crashing Collapse of Wood Building](https://freesound.org/s/487142/) · craigsmith |
| nedrivning | [bldg demolition](https://freesound.org/s/35888/) · cognito perceptu |
| brokker_stor | [Big falling debris (crash)](https://freesound.org/s/703247/) · xkeril |
| brokker | [Fall debris (crash)](https://freesound.org/s/703248/) · xkeril |
| stenskred | [rockfall2a](https://freesound.org/s/389303/) · AlanCat |
| beton | [Concrete Breaks Several Denoised](https://freesound.org/s/843339/) · loganzsound |
| slag | [Concrete Hit 2](https://freesound.org/s/321478/) · dslrguide |
| glas_fald | [Glass Shattering and Falling](https://freesound.org/s/336425/) · 221Beimesche |
| glas | [Glass Break](https://freesound.org/s/221528/) · unfa |
| glas2 | [Glass panel shattering](https://freesound.org/s/758207/) · LukaCafuka |
| metal_fald | [Scrap metal dropping / crashing](https://freesound.org/s/587443/) · SamsterBirdies |
| metal | [metal crash 2](https://freesound.org/s/471192/) · AuDRoger |
| trae_knaek | [wood breaking](https://freesound.org/s/109359/) · SoundCollectah |
| ild | [Crackling Fire](https://freesound.org/s/414767/) · samarobryn |
| gas | [FOL-gas-leak-01](https://freesound.org/s/615668/) · henrikcederblad |
| horn | [Industrial Air Horn](https://freesound.org/s/131930/) · mcpable |
| plask | [Big Water Splash](https://freesound.org/s/442773/) · qubodup |
| raket | [firework_rocket_ignition](https://freesound.org/s/587173/) · derplayer |
| floejt | [Firework Whistlers](https://freesound.org/s/588199/) · el_boss |
| fyrvaerkeri | [Fireworks #1](https://freesound.org/s/569846/) · danlucaz |
| lavine | [Avalanche, snowstorm, huge, low frequency](https://freesound.org/s/702903/) · FALL-E |
| sneskred | [avl05](https://freesound.org/s/162674/) · blaukreuz |
| jordskred | [S24-18 Landslide](https://freesound.org/s/675736/) · craigsmith |
| gnist | [1.5_sparkler](https://freesound.org/s/461085/) · 15GKovacovaJulie |
