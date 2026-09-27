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
