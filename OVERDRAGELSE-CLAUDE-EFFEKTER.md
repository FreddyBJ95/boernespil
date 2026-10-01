# Overdragelse fra Codex: fælles effekter og større brag (opgave E)

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
Ejeren har bedt Codex færdiggøre fletningen og server-v0.5.0 efter afprøvning. Push aldrig direkte til main.
