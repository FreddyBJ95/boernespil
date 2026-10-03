# Broekraft Server til familien

Med serveren kan 1–8 børn spille i samme verden på familiens wifi. Computeren gemmer verdenerne.
Der er kun dyrefigurer og seks faste emoji; ingen personnavne eller fritekst-chat.

## Hent og start

1. Hent en pakke fra https://github.com/FreddyBJ95/boernespil/releases.
   Vælg Windows, Mac-Intel eller Mac-AppleSilicon (Mac med M1/M2/M3/M4 eller nyere Apple-chip).
   På Linux vælges Linux-x64 eller Linux-ARM64; følg afsnittet **Installer på Linux** nedenfor.
2. Pak **hele zip-filen ud**, og start BroekraftServer. Du skal ikke installere Deno.
3. Kontrolpanelet åbner i din browser. Lad programmets vindue stå åbent, mens børnene spiller.

Programmet er ikke signeret. På Windows kan SmartScreen vise en advarsel: vælg
**Flere oplysninger → Kør alligevel**, når du har hentet programmet fra projektets egen release.
På Mac: højreklik på programmet og vælg **Åbn**. Hvis macOS stadig blokerer, kan du bruge
**Systemindstillinger → Anonymitet & sikkerhed → Åbn alligevel**. Alternativt kan en voksen
skrive `xattr -d com.apple.quarantine ` i Terminal, trække programfilen ind og trykke Retur.

Hvis firewall spørger, vælg **Tillad** på **private netværk**. Routeren skal ikke ændres;
opret ikke port-forwarding. Serveren lytter kun på computerens private IPv4-adresser og lokaladressen.

**Tabletten står bare og venter?** Kontrollér wifi og firewall med afsnittet **Tabletten kan ikke komme ind?**
i kontrolpanelet. På Windows læser serveren netværksprofilen for de adresser, den lytter på, cirka hvert
minut. Ved **Offentligt netværk** åbnes vejledningen automatisk. Et ukendt tjek betyder, at profilen ikke
kunne læses; det stopper ikke serveren. Der ændres ingen indstillinger automatisk, og profiltjekket
beviser ikke, at firewallen tillader adgang. Panelet viser også, om en anden enhed har nået serveren.

1. Gør hjemmets wifi privat: **Indstillinger → Netværk og internet → Wi-Fi →** klik på netværket →
   vælg **Privat**. Brug kun Privat på et netværk, du stoler på. En offentlig profil kan blokere indgående forbindelser.
2. Tillad programmet: tryk Start og skriv *firewall*. Åbn **Tillad en app gennem Windows Defender Firewall**
   → **Rediger indstillinger** → **Tillad en anden app… → Gennemse**. Vælg `BroekraftServer.exe` →
   **Tilføj**, og sæt flueben ved **Privat**.
3. Luk og start BroekraftServer igen.

## Installer på Linux

Vælg **BroekraftServer-Linux-x64.tar.gz** til en almindelig 64-bit Intel/AMD-computer.
Vælg **BroekraftServer-Linux-ARM64.tar.gz** til ARM64, fx Raspberry Pi med et 64-bit styresystem.
`uname -m` viser `x86_64` eller `aarch64`, og `getconf LONG_BIT` skal vise `64`.
På Raspberry Pi vælges **Raspberry Pi OS (64-bit)**; en 64-bit processor eller kerne er ikke nok,
hvis selve styresystemet er 32-bit. Pakkerne er til Linux med glibc, fx Ubuntu/Debian;
`getconf GNU_LIBC_VERSION` viser den installerede glibc. 32-bit Linux og Alpine/musl understøttes
ikke af disse pakker. Installationen kontrollerer dette, før programmet erstattes. Deno skal ikke installeres.

Åbn en terminal i mappen med den hentede pakke:

```sh
mkdir -p BroekraftServer-Linux
tar -xzf BroekraftServer-Linux-x64.tar.gz -C BroekraftServer-Linux
cd BroekraftServer-Linux
sh installer.sh
"$HOME/.local/bin/broekraft-server"
```

På ARM64 udskiftes filnavnet med `BroekraftServer-Linux-ARM64.tar.gz`. Kør installationen som din
almindelige bruger, **uden sudo**. Programmet installeres i `~/.local/bin/broekraft-server`.
Kontrolpanelet åbnes med `xdg-open`, hvis en skrivebordsbrowser er tilgængelig; ellers åbn adressen,
programmet viser, normalt `http://127.0.0.1:8080/kontrol`. Stop med **Ctrl+C**.

**Raspberry Pi uden skærm:** Forbind først med `ssh bruger@serverens-lokale-ip`, hent og pak
ARM64-pakken ud på Pi'en, og kør `sh installer.sh` som den samme almindelige bruger hver gang.
Start derefter `~/.local/bin/broekraft-server --ingen-browser`, og lad denne SSH-forbindelse stå åben.
Kontrolpanelet er kun tilgængeligt lokalt på Pi'en, så åbn en anden terminal på din egen computer:

```sh
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:18080:127.0.0.1:8080 bruger@serverens-lokale-ip
```

Udskift bruger og IP med dine egne værdier. Åbn derefter `http://127.0.0.1:18080/kontrol` på din
computer. Hvis serveren viser en anden HTTP-port end 8080, brug den som tunnelens sidste port.
Lad både serverens SSH-forbindelse og tunnelen stå åbne, mens børnene spiller. Stop serveren med
**Ctrl+C**, før du lukker dens SSH-forbindelse; hvis forbindelsen afbrydes, kan serveren også stoppe.
Hvis `tmux` allerede er installeret, kan serveren i stedet køre i en session oprettet med
`tmux new -s broekraft`; `Ctrl+B`, derefter `D`, kobler fra uden at stoppe serveren, og
`tmux attach -t broekraft` åbner sessionen igen. Installationen opretter ikke en systemtjeneste.
På en Linux-firewall skal indgående TCP til HTTP-porten (normalt 8080) og 8443 være tilladt fra
hjemmenettet. Walkie-talkie bruger desuden direkte lokale forbindelser mellem tabletterne.

**Opdatering:** Stop serveren, pak den nye pakke ud og kør `sh installer.sh` igen som samme bruger.
Verdener og certifikater bevares i `~/.local/share/BroekraftServer/`. For at fjerne programmet slettes
kun `~/.local/bin/broekraft-server`; datamappen bevares som backup.

## Opret en verden

Vælg navn, type, størrelse, 1–8 spillere og om ild må sprede sig. Et tomt frø giver en ny tilfældig verden.
En stor verden kan tage lidt tid; følg fremgangen i panelet. Nye verdener starter automatisk.
Den uendelige verden har fast størrelse og vises som **uden kanter**. Den indlæser landet omkring
spillerne undervejs og gemmer kun ændringerne. Skjulte verdener som Guldslottet kan ikke vælges her.
Verdenerne gemmes på computeren, og de verdener, der kørte, starter selv igen, når programmet startes.
Trykker du **Stop** ved en verden, bliver den stoppet, indtil du trykker **Start** igen.

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
Backup indeholder hele verdens mappe. Almindelige verdener bruger `meta.json` og `data.bin.gz`;
Den uendelige verden bruger `meta.json` og sine gemte ændringer. For at gendanne: stop serveren,
kopier hele backupmappen til verdens mappe (navnet er id'et fra `meta.json`), og start serveren igen. Gem en kopi af den
eksisterende mappe først. Slet kræver to bekræftelser; tidligere backups bevares.

Data findes her:

- Windows: `%APPDATA%\BroekraftServer\verdener`
- Mac: `~/Library/Application Support/BroekraftServer/verdener`
- Linux: `~/.local/share/BroekraftServer/verdener`

Tændt TNT afsluttes, når en verden stoppes, så dets ændringer også gemmes.

## Til udviklere

Installer Deno 2.9.7 eller nyere. Fra `server/`: `deno task start`, `deno task test`, `deno task byg`.
Byg laver programmer til Windows, begge Mac-typer og Linux x64/ARM64 i `server/dist/`.
Kun Linux: `deno task byg Linux-x64 Linux-ARM64`. Linux-pakker får `installer.sh` og arkitekturkontrol.
Release-workflowet laver zip-filer til Windows/Mac og `.tar.gz` til Linux. Installation, opdatering og
HTTPS afprøves på både x64 og ARM64 Ubuntu, før pakkerne kan udgives. Begge baggrundsberegninger,
`generator-worker.js` og `uendelig-worker.js`, medtages i de kompilerede programmer.
Et tag som `server-v0.5.1` bygger pakkerne og udgiver dem på GitHub Releases.
Server 0.5.1 medtager Enhjørningeland, de fem nye blokke og visning af andre spilleres ridedyr.
Den uendelige verden og fælles effekter fra 0.5.0 er også med. Ejeren fletter grenen og godkender
den samlede spilversion, før release-tagget oprettes; der pushes aldrig direkte til `main`.

Certifikater laves med **node-forge 1.4.0**, som ligger i `server/vendor/node-forge` (BSD-3-Clause).
RSA-nøgler skabes med WebCrypto. Certifikatbiblioteket indlæses som CommonJS og medtages i de kompilerede
programmer; serveren behøver ingen netadgang for at oprette eller forny certifikater.

Manuel Chromium-test uden mikrofontilladelse: `deno run --allow-read --allow-write --allow-net --allow-env
tests/browser-server.js`, åbn `http://127.0.0.1:8097/lydtest`, og tryk Start testen. Den bruger en kunstig
tone, to rigtige WebSocket-klienter og WebRTC, og kontrollerer modtaget lydenergi uden at afspille lyden.
Afslut med Ctrl+C. Testen erstatter ikke en afsluttende prøve mellem fysisk iPad og computer.
