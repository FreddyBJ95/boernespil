# Broekraft Server til familien

Med serveren kan 1–8 børn spille i samme verden på familiens wifi. Computeren gemmer verdenerne.
Der er kun dyrefigurer og seks faste emoji; ingen personnavne eller fritekst-chat.

## Hent og start

1. Hent en zip-fil fra https://github.com/FreddyBJ95/boernespil/releases.
   Vælg Windows, Mac-Intel eller Mac-AppleSilicon (Mac med M1/M2/M3/M4 eller nyere Apple-chip).
2. Pak **hele zip-filen ud**, og start BroekraftServer. Du skal ikke installere Deno.
3. Kontrolpanelet åbner i din browser. Lad programmets vindue stå åbent, mens børnene spiller.

Programmet er ikke signeret. På Windows kan SmartScreen vise en advarsel: vælg
**Flere oplysninger → Kør alligevel**, når du har hentet programmet fra projektets egen release.
På Mac: højreklik på programmet og vælg **Åbn**. Hvis macOS stadig blokerer, kan du bruge
**Systemindstillinger → Anonymitet & sikkerhed → Åbn alligevel**. Alternativt kan en voksen
skrive `xattr -d com.apple.quarantine ` i Terminal, trække programfilen ind og trykke Retur.

Hvis firewall spørger, vælg **Tillad** på **private netværk**. Routeren skal ikke ændres;
opret ikke port-forwarding. Serveren lytter kun på computerens private IPv4-adresser og lokaladressen.

## Opret en verden

Vælg navn, type, størrelse, 1–8 spillere og om ild må sprede sig. Et tomt frø giver en ny tilfældig verden.
En stor verden kan tage lidt tid; følg fremgangen i panelet. Nye verdener starter automatisk.
Efter en genstart trykker du **Start** ved de verdener, børnene vil bruge.

## Forbind tablets

Tablets og computer skal bruge **samme wifi**, og computeren skal være tændt og vågen.
Scan QR-koden i panelet, eller skriv adressen under den i Safari. Vælg en startet verden.
På Børnespil-forsiden kan du også vælge **Spil sammen → Scan QR-kode**. Tillad kameraet,
og peg på koden på computeren. Når adressen vises, tryk **Åbn familiens server**.
Scanneren virker fra den sikre Børnespil-hjemmeside; på en lokal http-side bruges tablettens
app Kamera eller **Skriv adressen i stedet**. Sidst brugte serveradresse huskes på tabletten.
I Safari kan du bruge **Del → Føj til hjemmeskærm**. Fra version 0.2.0 bruger spillets QR-kode HTTPS.
Hvis der vises flere adresser, vælg den på familiens wifi. Et gæstenetværk kan blokere forbindelsen.
Hvis IP-adressen ændrer sig, genstart serveren og scan den nye QR-kode.

Spillets three.js hentes fortsat fra et CDN i browseren; tabletterne skal derfor have internetadgang
ved første indlæsning. Selve serverprogrammet indeholder sin kopi af biblioteket.

**Sådan spiller børnene:** Tryk på "Spil sammen" i Børnespil-appen, og scan QR-koden fra kontrolpanelet.
Vælg en verden og et dyr. Vand, lava, ild og TNT styres af serveren, så alle ser det samme.

## Gør enhederne klar til mikrofon (0.2.0)

En voksen gør dette én gang på hver enhed. Scan først koden under **Gør tabletten klar til mikrofon**.
Den åbner `http://computerens-adresse:8080/certifikat`, som virker uden installeret certifikat.
Hvis HTTP-porten var optaget, viser panelet den valgte port i stedet.

1. **iPad/iPhone:** Åbn siden i Safari, og hent profilen. Gå til **Indstillinger → Profil hentet → Installer**.
2. Gå til **Indstillinger → Generelt → Om → Certifikattillid**, og slå fuld tillid til **Broekraft Server hjemme** til.
3. Scan spillets QR-kode, der åbner `https://computerens-adresse:8443`. Hvis Safari stadig advarer om certifikatet,
   kontroller installationen og at du bruger den aktuelle adresse fra panelet.

**Windows:** Hent `.crt` fra samme side. Åbn filen → Installer certifikat → Aktuel bruger → Placér alle
certifikater i følgende lager → Rodnøglecentre, der er tillid til. Genstart browseren ved behov.
**Mac:** Åbn `.crt` i Nøglering, vælg certifikatet, og indstil SSL-tillid til Altid godkend.
**Android:** Hent `.crt`, og installer som CA-certifikat under Indstillinger → Sikkerhed → Kryptering og
legitimationsoplysninger (navne varierer). Browserens understøttelse af brugerinstallerede CA'er varierer.

Sammenlign SHA-256-aftrykket på tabletten med det i computerens kontrolpanel. Installer kun familiens
eget certifikat: en betroet rod kan godkende certifikater på enheden. iOS-profilen indeholder kun roden,
ingen fjernadministration. Den kan fjernes under Generelt → VPN og administration af enhed.
Rodens private nøgle bliver i datamappen `BroekraftServer/certifikater`; del aldrig den mappe.

Kontakten **🎤 Må tale sammen** er fra som standard. Den gemmes pr. verden og virker straks under spil.
Lyd sendes direkte mellem deltagere i samme verden med lokale WebRTC-forbindelser uden STUN/TURN.
Der optages eller gemmes ingen lyd. Et tryk varer højst 20 sekunder, hvorefter knappen skal slippes igen.
Selve taleknappen og stemmeeffekterne integreres særskilt i spillet af Claude.

Servercertifikatet gælder 365 dage. Ved opstart fornyes det, hvis IP-adresserne ændres eller der er mindre
end 30 dage tilbage. Roden beholdes, så enhederne ikke skal sættes op igen. Genstart serveren efter
adresseændringer. HTTP virker fortsat til certifikatopsætning og ældre spilklienter; mikrofon kræver HTTPS.

## Gemning og backup

Ændrede verdener gemmes hvert minut, ved Stop og ved afslutning med **Ctrl+C** i programmets vindue.
Undgå at slukke computeren eller tvangslukke programmet, mens børnene bygger.
Kontrolpanelet kan kun åbnes på selve servercomputeren.

Klik **Backup** ved en verden. Panelet viser mappen med kopien; kopier gerne mappen til en USB-disk.
Backup indeholder `meta.json` og `data.bin.gz`. For at gendanne: stop serveren, kopier begge filer
til verdens mappe (navnet er id'et fra `meta.json`), og start serveren igen. Gem en kopi af den
eksisterende mappe først. Slet kræver to bekræftelser; tidligere backups bevares.

Data findes her:

- Windows: `%APPDATA%\BroekraftServer\verdener`
- Mac: `~/Library/Application Support/BroekraftServer/verdener`

Tændt TNT afsluttes, når en verden stoppes, så dets ændringer også gemmes.

## Til udviklere

Installer Deno 2.9.7 eller nyere. Fra `server/`: `deno task start`, `deno task test`, `deno task byg`.
Byg laver programmer til Windows og begge Mac-typer i `server/dist/`.
Et tag som `server-v0.2.0` bygger zip-filer og udgiver dem på GitHub Releases.
Opret først tagget, når ejeren har godkendt den samlede spilversion.

Certifikater laves med **node-forge 1.4.0**, som ligger i `server/vendor/node-forge` (BSD-3-Clause).
RSA-nøgler skabes med WebCrypto. Certifikatbiblioteket indlæses som CommonJS og medtages i de kompilerede
programmer; serveren behøver ingen netadgang for at oprette eller forny certifikater.

Manuel Chromium-test uden mikrofontilladelse: `deno run --allow-read --allow-write --allow-net --allow-env
tests/browser-server.js`, åbn `http://127.0.0.1:8097/lydtest`, og tryk Start testen. Den bruger en kunstig
tone, to rigtige WebSocket-klienter og WebRTC, og kontrollerer modtaget lydenergi uden at afspille lyden.
Afslut med Ctrl+C. Testen erstatter ikke en afsluttende prøve mellem fysisk iPad og computer.
