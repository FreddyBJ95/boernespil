# Overdragelse fra Codex: fælles effekter og større brag (opgave E)

## Status: udgivet 1. oktober 2026

PR #1 er flettet med commit `662565796322b30644da50d3dc3585f1f08ced49`, og
`server-v0.5.0` er udgivet: https://github.com/FreddyBJ95/boernespil/releases/tag/server-v0.5.0.
Alle 105 tests, Windows-pakketesten og native Linux x64/ARM64-kontroller består.
Release-kørsel 10: https://github.com/FreddyBJ95/boernespil/actions/runs/36903676809.
GitHub Pages er også udgivet fra samme commit. Der er ikke pushet direkte til main.

Alle fem officielle downloadpakker er hentet til den fælles mappes server/dist/ og kontrolleret
mod udgivelsens SHA-256. Mac og fysisk iPad/Safari er stadig ikke afprøvet.

**Pi'en er opdateret 1. oktober 2026 efter ejerens godkendelse.** Den officielle ARM64-pakke
fra server-v0.5.0 er installeret som vindr1, og broekraft-server.service kører igen og er enabled.
Tjenesten blev stoppet med SIGTERM og afsluttede korrekt (Result=success, ExecMainStatus=0).
Der var ingen tilsluttede spillere ved opdateringen.

Backup af gammel programfil, servicefil og hele datamappen inklusive certifikater ligger kun på Pi'en:
`/home/vindr1/BroekraftServer-installation-20261001-effekter/backup-20261001-224434/`.
Backupmappen har rettighed 700, data.tar.gz har 600, og arkivet er kontrolleret.
Installer blev kørt uden sudo fra `officiel-pakke/installer.sh`; data blev ikke udskiftet.

Den officielle pakke ligger i
`/home/vindr1/BroekraftServer-installation-20261001-effekter/officiel-0.5.0.tar.gz`.
Arkivets SHA-256 er
`84fb63b46df46ec3b53d18860a31b2fed2cda92ce50adb4566e733c66fcdf724`.
Den installerede programfil matcher den officielle udpakkede binær:
`8f19d856f58e20489969af81c5b8f47a4e242915ea9c566026800b0d03d4180f`.
Både den gamle prøvepakke og den officielle pakke hedder 0.5.0, så versionsteksten alene er ikke nok.

Verdenen Far (`2a8c348e-6d6c-4b49-a012-70ea6c7adf11`, uendelig) er startet automatisk igen.
Alle fire gemte regionsfiler og ca.json er byte-identiske med backup efter genstarten.
CA-aftrykket er uændret:
`B6:27:DA:89:0A:82:CA:63:E9:DC:BB:B0:EB:34:6B:2B:C8:AF:C4:6D:EC:F0:7C:60:D8:21:CA:AE:8B:87:10:4F`.
HTTPS på `https://192.168.0.26:8443/` er kontrolleret med den eksisterende CA.
Den serverede net.js har effekt(slags, data), og SW-cachen er boernespil-v54.
Familieverdenerne er ikke blevet brugt til sprængnings- eller byggetests under opdateringen.
Den interaktive SSH-skal er lukket; kontrollens SSH-tunnel på 18080 står fortsat åben.
Tabletterne kan genindlæse spillet for at hente de nye filer.

1. oktober 2026. Serverdelen ligger på `codex/uendelig` sammen med opgave D og den færdige
tabletintegration fra main 21f2bd2. Den samlede version er målrettet server-v0.5.0.

## Det, tabletterne nu kan bruge

- `net.effekt(slags, data)` findes. Serveren sender de fem beskrevne effekttyper til de andre
  0.2.0-spillere i samme verden, med sit eget `fra`. Afsenderen får ikke et ekko.
- Dine kald i spil.js/skyd.js/atom.js passer til serverens validering. Missilers mx/mz må være
  decimaltal. Ingen kosmetiske effekter laver selv serverblokke eller en ekstra sprængning.
- `net.brag(x, y, z, slags)` sender slags med. Radius er 3,3 normalt, mini 5, atom 9 og kæmpe 13.
  `bum` har slags med for de tre navngivne størrelser. Gamle brag uden slags virker stadig.
- Atom/kæmpe giver samme serverstyrede krater med aske, slim og flammer. Søgningen efter den
  øverste faste blok svarer til verden.topY og ser gennem planter, væsker og portaler.
- Land i hele radius indlæses og holdes fast i den uendelige verden. Ved læsefejl bevares
  slags og træfpunkt til genforsøg; stop/gemning afvises, indtil sprængningen kan fuldføres.

## Grænser og afprøvning

Effekter er højst 1024 UTF-8-bytes inklusive mellemrum/ekstra felter, otte pr. spiller og
40 pr. rum pr. rullende sekund. Ugyldige eller overskydende effekter ignoreres stille.
Store brag er højst ét pr. spiller pr. to sekunder og to samtidige indlæsninger/sprængninger pr. rum.
Derfor kan en NUKE-salve med flere træffere tæt på hinanden få nogle brag afvist: visuel missil-
og svampesky-del følger fortsat dine lokale kald. Det følger den ønskede grænse i opgave E.

De nye prøver dækker alle effekttyper, afsender/rum/version, falske og ekstra felter, grænser,
bytestørrelse, radius, krater, væske/uknuselig, glemt nabosøjle, gemning, fejl og genforsøg.
Alle 105 automatiske tests består. Alle fem programmer er bygget, og det færdige Windows-program
består pakketesten med begge workers, to spillere, delte effekter, radius og gemte blokændringer.
Pakketesten bruger to rigtige forbindelser i både en endelig og en uendelig verden og prøver,
at en blok otte skridt væk overlever det gamle brag og fjernes/gemmes af atombraget.

SW-cachen er bumpet fra v53 til v54, så tabletterne henter den nye net.js.
Protokolversionen er stadig 0.2.0; se server/protokol.md for hele kontrakten.

## Pi og udgivelse

Pi'en er vindr1@192.168.0.26. Serveren kører som bruger-tjenesten broekraft-server.service,
og familiens data/certifikater ligger i /home/vindr1/.local/share/BroekraftServer.
Opdater som samme bruger og stop tjenesten før programfilen udskiftes. Bevar datamappen.
Læs også OVERDRAGELSE-CLAUDE-UENDELIG.md for installationsdetaljer.

Arbejdet ligger i PR #1: https://github.com/FreddyBJ95/boernespil/pull/1.
Fletningen og udgivelsen er gennemført efter afprøvning. Push aldrig direkte til main.
