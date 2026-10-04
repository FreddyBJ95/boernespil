# Overdragelse fra Codex: Enhjørningeland sammen (opgave F)

## Status 3. oktober 2026: udgivet og installeret på Pi

Arbejdet ligger på `codex/enhjorning` i
`C:/Users/Frede/.codex/worktrees/enhjorning/boernespil`, fra main med din udvidede opgave F
(`501a904`). Slutcommit: `4777d3435819fe17043f503f6f5638383829b40d`.
PR #2: https://github.com/FreddyBJ95/boernespil/pull/2.
Ejeren godkendte fletning, udgivelse og Pi-opdatering. PR #2 er flettet via GitHub med
main-commit `257273c3a991bfc4b65b014e4140a9e4181759f9`, hvis filindhold er identisk med den
afprøvede slutcommit. Der er ikke pushet direkte til main.
Server-v0.5.1 er udgivet fra denne commit, release-id 402618758:
https://github.com/FreddyBJ95/boernespil/releases/tag/server-v0.5.1.
Udgivet 3. oktober kl. 19:34 dansk tid. Release-kørsel 13 består:
https://github.com/FreddyBJ95/boernespil/actions/runs/37140871633.

## Det, der er klar

- UDGAVE er 0.5.1. Enhjørningeland og blok-id 169–173 følger dine færdige filer fra main
  automatisk ind i kontrolpanel, generator og server. Alle 169 tidligere blokke er uændrede.
- `net.pos(x, y, z, yaw, pitch, rid = null)` bevarer ridedyret i positionen og ved automatisk
  genforbindelse. Null udelader feltet. Dyrskift og afstigning sendes straks og rydder en gammel timer.
- Serveren godkender 2–24 små ASCII-bogstaver. Manglende eller ugyldigt rid i en ellers gyldig
  position rydder ridedyret; en ugyldig position ændrer intet. Verdensskift nulstiller rid.
- Rid medtages i spillerInfo, pos.liste og velkommen.spillere, når det er sat. Det virker i
  både endelige og uendelige verdener og med gamle 0.1.0-klienter.
- Et hurtigt sadelskift gemmes også inden for serverens 100 ms-positionstærskel. Position,
  retning, landstrømning og udsendelsestakt beholder deres eksisterende begrænsninger.
- Protokolversionen er stadig 0.2.0; gemte verdensformater er uændrede. Føl-legen og dyrene
  forbliver lokale. Dine visningsfiler er ikke redigeret af Codex.
- Releasenoter og udviklervejledningen er opdateret til 0.5.1.

## Afprøvning og pakker

Alle 116 servertests består. Generatorprøverne dækker Enhjørningeland i alle fire størrelser og
byte-identisk land mellem tablet og server. Ti nye rid-tests dækker præcis timing, genforbindelse,
validering, verdensskift, spillerliste/velkomst, uendelig verden og en rigtig 0.1.0-WebSocketklient.

Den udvidede Windows-pakketest består: Enhjørningeland genereres af den kompilerede worker,
alle fem nye blokke deles mellem to klienter, gemmes, genindlæses og fjernes. Pegasus vises i
venens pos.liste og en tredje klients velkomst, og afstigning fjerner feltet. De tidligere prøver
af uendelig worker, fælles effekter, store brag og fjern gemning består også.
Prøverne bruger isolerede datamapper; egne testservere og verdener er stoppet.

CI-kørsel 12 har bygget alle fem platforme og kontrolleret installation, opdatering, korrekt HTTPS
og samme pakketest på native Linux x64 og ARM64:
https://github.com/FreddyBJ95/boernespil/actions/runs/37139784157.
Alle tre CI-job består; udgivelsesjobbet springes over, fordi grenen endnu ikke har et release-tag.
CI-artifact 11279292999 kommer fra slutcommit 4777d34; PR #2 er nu flettet.
Alle fem CI-pakker er hentet, kontrolleret mod SHA256SUMS og lagt i den fælles mappes
`server/dist/0.5.1-klar/`. De ligger også i worktree-mappens `server/dist/`.
Gennemgangspakkerne er fra arbejdsgrenen. Alle fem officielle release-pakker og SHA256SUMS er
nu også hentet til den fælles mappes `server/dist/0.5.1/`, med kontrol af både GitHubs asset-digests
og SHA256SUMS. De eksisterende officielle 0.5.0-pakker i den fælles dist-mappe er bevaret.
Fysisk Mac og iPad/Safari er ikke afprøvet i denne opgave.

## Pi-opdatering: udført 3. oktober

Pi'en kører nu den officielle server-v0.5.1. Brugertjenesten er active/running og enabled,
uden automatiske genstarter. Den gamle server blev stoppet korrekt med SIGTERM:
Result=success og ExecMainStatus=0. Der var ingen spillere tilsluttet ved opdateringen.

Pi: vindr1@192.168.0.26. Tjeneste: broekraft-server.service (user-systemd).
Program: /home/vindr1/.local/bin/broekraft-server.
Data og certifikater: /home/vindr1/.local/share/BroekraftServer.
Installationsmappe:
`/home/vindr1/BroekraftServer-installation-20261003-enhjorning-7U4KKw/`.
Den officielle ARM64-pakke er hentet direkte fra GitHub Releases og kontrolleret mod SHA256SUMS.
Arkivets SHA-256: `ee8748c5bedf1ef2cb719049f4f59c2de781c1cb43c78cf83e3b4f5edd11a92c`.
Installeret program matcher den udpakkede binær, SHA-256:
`f4c4148d86cdefa263bda8b12d46c9362d824b8743a475b6992f87ba5009487d`.
Installeren blev kørt som vindr1 uden sudo. Familiens data blev ikke udskiftet.

Privat lokal backup af gammel 0.5.0-programfil, servicefil og hele data-/certifikatmappen:
`/home/vindr1/BroekraftServer-installation-20261003-enhjorning-7U4KKw/backup-20261003-193626/`.
Backupmappe 700, data.tar.gz 600. Arkivet er kontrolleret, og alle syv gemte filer matchede
de stoppede data før installationen. Efter genstart er alle fire gemte regionsfiler og CA
byte-identiske med backup. Backup indeholder CA'ens private nøgle og forbliver på Pi'en.

Far (`2a8c348e-6d6c-4b49-a012-70ea6c7adf11`, uendelig) er startet automatisk igen.
Verdens-id, navn, type, størrelse og startstatus er bevaret. CA-aftrykket er uændret:
`B6:27:DA:89:0A:82:CA:63:E9:DC:BB:B0:EB:34:6B:2B:C8:AF:C4:6D:EC:F0:7C:60:D8:21:CA:AE:8B:87:10:4F`.
HTTPS er bekræftet med den eksisterende CA. De serverede filer har Enhjørningeland, rid og
SW-cache boernespil-v56. Der er ikke oprettet eller ændret en familieverden under opdateringen.

En virkelig WebSocket-prøve på den opdaterede Pi har vist Pegasus i venens pos.liste og en
tredje klients velkomst, samt fravær af rid efter afstigning. De tre midlertidige klienter brugte
kun deres startposition, radius 1 og ingen blokke/effekter. Alle klienter er lukket; der er igen
0 spillere, og Far kører. Ingen vedvarende ændringer fra prøven.
SSH-skallen er lukket. Kontrolpanelets SSH-tunnel på `http://127.0.0.1:18080/kontrol` står åben.
Tabletadresse: `https://192.168.0.26:8443/`. Genindlæs spillet for at hente de nye filer.
Enhjørningeland kan nu oprettes i kontrolpanelet. En eksisterende Far-verden skifter ikke type.

## Tabletternes cache: efterfølgende rettelse i PR #3

Main havde allerede SW v56 fra dine visningsændringer, før net.js fik rid. En tablet, som havde
cachet dette mellemtrin, ville ellers beholde den gamle net.js. Derfor er kun cacheversionen
bumpet til v57 på en separat gren og flettet via PR #3 under ejerens godkendte udgivelse:
https://github.com/FreddyBJ95/boernespil/pull/3.
Main er nu `3fc0ec5427ba1a889cedc4976dac576d423e33a2`. Pages-deployment består:
https://github.com/FreddyBJ95/boernespil/actions/runs/37141418156.
Det offentlige site leverer v57 og net.pos med rid. Ingen direkte push til main.

Release-tagget for 0.5.1 er fortsat på 257273c og er ikke flyttet. Pi-pakken beholder v56 og
har den korrekte net.js, da Pi'en kom fra v54. Pi'en behøver ikke endnu en genstart for denne
Pages-rettelse. Codex-worktreet står nu på opfølgningsgrenen `codex/enhjorning-cache`;
den oprindelige servergren `codex/enhjorning` og PR #2 indeholder den udgivne serverkode.

På ejerens computer var SSH-binding til wifi-adressen 192.168.0.123 nødvendig, fordi Tailscale
overtog ruten til LAN'et. Kontroller adressen igen, før SSH bruges. Ingen adgangskode er skrevet i filer.
