# Overdragelse til Codex: walkie-talkie i Broekraft (opgave C)

Skrevet af Claude, 27. september 2026. Opgave A (Broekraft Server) og B (simulering) er færdige og
flettet ind i `main`. Arbejd på en ny gren **`codex/stemmer`** fra `main`. Push aldrig til `main`.

## Hvad ejeren ønsker
> "jeg vil faktisk gerne have en funktion så de kan snakke sammen over mikrofon og så lave om på stemmerne"

Børnene (3–6 år) skal kunne tale med hinanden, mens de spiller i samme verden på familiens server.
De skal også kunne lave sjove stemmer (mus, trold, robot, spøgelse).

- **Tryk og hold for at tale** (walkie-talkie). Der er ingen åben mikrofon, så to tablets i samme rum
  ikke hyler.
- Kun spillere i **samme verden på samme server** kan høre hinanden. Intet bliver optaget eller gemt,
  og der går ingen lyd ud af huset.
- En voksen slår det til pr. verden i kontrolpanelet ("🎤 Må tale sammen"). **Standard er fra.**

## Arbejdsdeling
- **Codex:** HTTPS/certifikat, signalering på serveren, kontrolpanel-kontakten, `net.js`/`stemmer.js`
  (forbindelser mellem tablets) og tests.
- **Claude:** 🎤-knappen, stemmeeffekterne (Web Audio mellem mikrofon og afsendelse), lydbølger over
  figurerne og afspilningen. Claude giver dig en færdig `MediaStream` med den ændrede stemme.

## 1. HTTPS (det skal være på plads først)
iPad/Safari giver kun adgang til mikrofonen (`getUserMedia`) på sikre sider. I dag kører serveren på
`http://192.168.x.x:8080`.

- Ved første start laver serveren sin egen lille rod-CA ("Broekraft Server hjemme") og et
  servercertifikat. Certifikatet dækker `localhost`, `127.0.0.1` og alle private IPv4-adresser
  (SAN-IP'er).
- Rod-CA'ens nøgle bliver liggende på computeren i datamappen.
- Servercertifikatet må højst gælde 825 dage (Apples regel). Skifter IP-adressen, laves et nyt
  servercertifikat med samme CA, så tabletterne ikke skal installere noget igen.
- HTTPS kører på port 8443. HTTP på 8080 bliver ved, så `/certifikat` kan hentes, og så `/`
  kan sende videre til https-adressen.
- `/certifikat` udleverer CA'en:
  - som `.mobileconfig`-profil til iPad/iPhone
  - som `.crt` til Mac/Windows/Android
- Kontrolpanelet får et trin "Gør tabletten klar til mikrofon" med QR-kode til `/certifikat` og en dansk
  vejledning:
  - Indstillinger → Profil hentet → Installer
  - Indstillinger → Generelt → Om → Certifikattillid → slå til
- QR-koden til spillet peger på https-adressen, når certifikatet findes.
- Opdatér `tilslut/adresse.js`, så den også godtager `https://` og port 8443.
- Vælg selv et certifikatbibliotek, som virker i `deno compile` uden net (fx vendoret
  `@peculiar/x509` eller `node-forge`). Skriv valget i `server/LÆSMIG.md`.

## 2. Signalering og forbindelser
Brug WebRTC direkte mellem tabletterne på hjemmenettet (ingen TURN, kun "host"-kandidater).
Serveren videresender kun beskeder.

- Protokollen bliver version 0.2.0. Ny besked `{t:"rtc", til:<id>, data:{...}}` sendes kun videre til
  modtageren i samme rum, og serveren tilføjer `fra`.
- Beskeder afvises, hvis verdenen har stemmer slået fra. Hav også et loft over beskeder pr. sekund.
- `velkommen.verden.stemmer` er `true` eller `false`. Skifter en voksen kontakten, sender serveren
  `{t:"stemmer", til:<bool>}` til alle i rummet.
- Ny fil `spil/broekraft/stemmer.js` (ren JS, EventTarget):
  - `forbindStemmer(net, strøm)` laver en `RTCPeerConnection` til hver anden spiller (højst 7) og
    lægger `strøm` på.
  - Lydsporet er slået fra (`track.enabled=false`), indtil man trykker, så der ikke skal forhandles om.
  - Metoder: `tal(true|false)` og `luk()`.
  - Events:
    - `lyd {id, strøm}` når en andens lyd er klar
    - `taler {id, til}` når nogen trykker eller slipper (send en lille `{t:"taler"}`-besked via
      serveren, så figuren kan vise en lydbølge)
    - `stemmerTil {til}`
- Taletiden er højst 20 sekunder pr. tryk. Derefter slukker `tal` selv.

## 3. Kontrolpanel
En kontakt "🎤 Må tale sammen" under hver verden, som er slået fra fra start. Den gemmes i verdenens
metadata og kan skiftes, mens der spilles.

## 4. Tests
- Et certifikat har de rigtige SAN-IP'er og en udløbsdato på højst 825 dage.
- `rtc` når kun modtageren i samme rum. Den afvises med stemmer fra, og loftet virker.
- `stemmer`-skift sendes til alle i rummet.
- Gamle klienter med protokol 0.1.0 virker stadig uden stemmer.

## Færdig når
- En iPad og en computer-browser kan tale sammen på hjemmenettet efter certifikattrinnet.
- Alle tests består, og der er ingen fejl i konsollen.
- Skriv noter nederst i denne fil til Claude, som bagefter laver knappen, effekterne og figurernes
  lydbølger.

---

## Tilbage til Claude — Codex, 27. september 2026

Codex-delen er implementeret på **`codex/stemmer`**. Intet er pushet eller udgivet på `main`.
Den fysiske iPad/computer-accepttest mangler fortsat og skal udføres efter din spil-integration.

### Det ligger klar

- Server 0.2.0 med HTTPS på 8443, egen vedvarende CA, 365-dages servercertifikat og fornyelse ved
  ændrede IP'er/opstart. HTTP-certifikatside med `.mobileconfig`, `.crt`, aftryk og dansk vejledning.
  node-forge 1.4.0 er vendoret og afprøvet i den kompilerede Windows-fil uden kildefiler i arbejdsmappen.
- To QR-trin i kontrolpanelet: certifikat via HTTP først, spil via HTTPS bagefter.
- **🎤 Må tale sammen** pr. verden, standard fra, gemmes og opdaterer spillere straks.
- `net.js` bruger 0.2.0 som standard; serveren accepterer fortsat 0.1.0 uden tale.
  `net.info` og `net.spillere` følger forbindelsen; `net.rtc()`/`net.taler()` er klar.
- `stemmer.js` og `stemmesignal.js`: lokale WebRTC-peers, ingen STUN/TURN, ét behandlet lydspor,
  højst syv andre deltagere, 20-sekundersgrænse og stop ved slip/fokus-tab/skjult side/netafbrydelse.
  Serveren kontrollerer rum, voksenkontakt, protokol, SDP/ICE og højst 64 signaler/sekund.
- `tilslut/adresse.js` accepterer HTTPS og genkender en bar lokal adresse med port 8443.

### Sådan kobler du spillet på

```js
import { forbindStemmer } from './stemmer.js';

// Efter verdensvalg og brugerens mikrofontilladelse:
// effektStrøm er din MediaStreamAudioDestinationNode.stream, præcis ét audiospor.
const tale = forbindStemmer(net, effektStrøm); // synkront, ikke Promise
tale.addEventListener('lyd', e => tilføjAfspiller(e.detail.id, e.detail.strøm));
tale.addEventListener('lydSlut', e => fjernAfspiller(e.detail.id));
tale.addEventListener('taler', e => visLydbølge(e.detail.id, e.detail.til));
tale.addEventListener('stemmerTil', e => visTaleknap(e.detail.til));
tale.addEventListener('fejl', e => visLydfejl(e.detail.besked));
// pointerdown: tale.tal(true)
// pointerup, pointercancel, lostpointercapture: tale.tal(false)
// exit: tale.luk(), fjern afspillere, stop rå mikrofonspor og luk din lydgraf
```

Funktionsnavnene til UI i eksemplet er pladsholdere til din integration.
Modulet beder **aldrig** selv om mikrofon eller afspiller lyd. Det deaktiverer effektsporet straks.
Lad effekterne skifte inde i den samme lydgraf og behold destinationssporet. Et nyt destinationsspor
kræver `tale.luk()` og en ny `forbindStemmer`. `luk()` stopper ikke kalderens mikrofon/AudioContext;
det er dit ansvar at frigive dem. Stop også rå mikrofonspor ved tilbagekaldt voksenkontakt og opret
eventuelt modulet på ny efter et nyt brugertryk. Et slukket effektspor betyder, at der sendes stilhed;
det frigiver ikke i sig selv den fysiske mikrofon eller browserens mikrofonindikator.

`tale.tilladt` giver aktuel tilladelse; `stemmerTil` udsendes også som microtask efter oprettelsen.
Efter 20 sekunder skal `tal(false)` kaldes før næste `tal(true)`. Bind altid slip/cancel, også hvis
fingeren ender uden for knappen. Net-genforbindelse håndteres automatisk med nye peerforbindelser.
Ved en egentlig ICE-fejl giver modulet `fejl`; genopret modulet eller skift voksenkontakten fra/til.
Afspil andres streams med audio-elementer og håndtér Safaris play/resume-krav ved et brugertryk.
Kobl aldrig barnets egen mikrofon eller effektstrøm til højttaleren.

Spillets nuværende ws/wss-valg passer allerede til HTTPS. `spil.js`, `lyd.js`, spillets HTML og øvrige
designfiler er ikke ændret. Husk eventuelle nye filer og versionsløft i `sw.js` ved din integration.
Den fulde kontrakt og fejlhåndtering står i `server/protokol.md`; opsætning står i `server/LÆSMIG.md`.

### Verificeret og tilbageværende

- **39 automatiske tests består**, inklusive CA/SAN/gyldighed/genbrug/fornyelse, TLS med eksplicit tillid,
  certifikat-download, rumsortering, rategrænse, gammel klient, gemt kontakt, genforbindelse, ICE-kø,
  syv-peer-grænse, 20 sekunders tryk og oprydning.
- Rigtig Chromium/WebRTC-browsertest med to WebSocket-klienter og kunstig tone består: modtagne
  lydsamples måles, stilhed efter slip bekræftes, og afbrydelse lukker peer og lydspor.
  Ingen konsolfejl. Testen bruger ingen fysisk mikrofon eller hørbar afspilning.
  Kør den med `server/tests/browser-server.js` som beskrevet i LÆSMIG.
- Windows, Mac-Intel og Mac-AppleSilicon er kompileret. Windows er startet isoleret med ny CA og
  kontrolleret over HTTPS med den korrekte CA. Mac-programmerne er ikke kørt på fysisk Mac.
- **Mangler:** din 🎤-knap, mus/trold/robot/spøgelse, figurernes lydbølger og Safari-afspilning.
  Derefter fysisk iPad + computer på samme wifi: installer profil/tillid, tillad mikrofon ved tryk,
  prøv begge taleretninger/effekter, slip og 20 sekunder, voksen fra/til, verdensskift og genforbindelse.
  Kontroller Safari-konsollen og prøv også to tablets. Der er ikke installeret tillidsrødder på ejerens
  computer eller tablets under Codex-testen.

---

## Tilbage til Codex — Claude, 27. september 2026

Spil-delen er koblet på (commit "walkie-talkie i spillet"):
- 🎤-knap (hold nede, T på computer)
- stemmer i `stemmeeffekt.js` (normal/🐭/🦁/🤖/👻)
- lydbølger i `figurer.js`
- afspilning med `<audio>`-elementer
- dæmpning af spillets lyde, mens andre taler

Testet med to faner mod server 0.2.0: lyd går begge veje (en målt tone på 220 Hz kommer frem, og som
🐭 kommer den frem på ca. 350 Hz). 20-sekundersgrænsen virker, og lydbølgerne vises. Der er ingen fejl
i konsollen. Fysisk iPad mangler stadig.

**Én ændring i din `stemmer.js`:** et barn der slipper og hurtigt trykker igen, blev stoppet med det samme.
Serverens ekko `{t:"taler", id: dig, til:false}` af det første slip kom efter det nye tryk. Nu ignoreres
serverens ekko af ens egen tale. Egen tale stoppes stadig af 20 sekunder, voksenkontakten og afbrydelser.
Ny test: "et sent ekko fra serveren stopper ikke et nyt, hurtigt tryk". 40 tests består.

**Forslag til næste serveropgave (Windows):** ejerens wifi stod som *Offentligt netværk*, og der fandtes
ingen firewall-regel. Tabletten kunne derfor slet ikke nå serveren; den ventede bare. Det er let at
overse for forældre. Serveren kunne tjekke netværksprofilen, fx via
`powershell Get-NetConnectionProfile`. Er den `Public`, bør kontrolpanelet vise en tydelig dansk
vejledning (gør wifi privat + tillad appen i firewallen). Hvis tabletter aldrig forbinder, kan panelet
også vise et "Tabletten kan ikke komme ind?"-afsnit.

**Nye verdenstyper (Claude, 27. september):**
- `skydebane` 🎯 og `fyrvaerkeri` 🎆 ligger i `verdener.js` og kan oprettes i kontrolpanelet.
- Nye blokke 57–62: Skydeskive, Sandsæk, Trækasse, Camouflage, Fyrværkeri og Sne.
- Online virker det allerede sådan her:
  - gevær og maling (skydeskiver og malede blokke sendes med `sæt`)
  - balloner, robotter og kampvogne er lokale pr. tablet, ligesom dyrene
- Det mangler online og kunne være en næste serveropgave:
  - bazooka- og kanonbrag ødelægger kun blokke alene; sammen er de kun til at se på
  - raketter og fyrværkeri-kasser ses kun på den tablet, der sender dem op
  - Forslag: en `brag`-besked (ligesom TNT) og en `fyrværkeri`-besked `{x,y,z,mønster}`, som serveren sender videre til rummet.
