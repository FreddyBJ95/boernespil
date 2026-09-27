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
I Safari kan du bruge **Del → Føj til hjemmeskærm**. På LAN bruges almindelig http.
Hvis der vises flere adresser, vælg den på familiens wifi. Et gæstenetværk kan blokere forbindelsen.
Hvis IP-adressen ændrer sig, genstart serveren og scan den nye QR-kode.

Spillets three.js hentes fortsat fra et CDN i browseren; tabletterne skal derfor have internetadgang
ved første indlæsning. Selve serverprogrammet indeholder sin kopi af biblioteket.

**Udviklingsstatus:** Online-visningen kobles til af Claude. Indtil den er færdig, bruges linket
**Åbn testklient** i kontrolpanelet til at afprøve fællesspil. Undlad at udgive denne version til
børnene, før online-visningen er integreret og prøvet på iPad.

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
Et tag som `server-v0.1.0` bygger zip-filer og udgiver dem på GitHub Releases.
Opret først tagget, når ejeren har godkendt den samlede spilversion.
