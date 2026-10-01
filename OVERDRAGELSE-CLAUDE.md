# Overdragelse fra Codex til Claude

## Nyt: Den uendelige verden og pakker til Pi, Windows og Mac, 1. oktober 2026

Læs **[OVERDRAGELSE-CLAUDE-UENDELIG.md](OVERDRAGELSE-CLAUDE-UENDELIG.md)** først.
Serverdelen er klar på `codex/uendelig`; du skal koble tabletternes visning til serverklumperne.
Arbejdet ligger i et separat worktree, og downloadpakkerne ligger også i den fælles `server/dist/`.
Ingen main-push eller release-tag er lavet.

## Nyt: Linux-installation, 30. september 2026

Ejeren bad direkte om at kunne installere Broekraft Server på Linux. Det er tilføjet på
`codex/linux-server` fra den aktuelle main. Ingen push, tag eller release er lavet.

- `server/byg.js` bygger også Linux-x64 og Linux-ARM64. Man kan vælge platforme som argumenter:
  `deno task byg Linux-x64 Linux-ARM64`.
- Linux-pakker indeholder programmet, `installer.sh`, `arkitektur.txt` og LÆSMIG.md.
  `sh installer.sh` installerer uden sudo i `~/.local/bin/broekraft-server`; data og certifikater
  bevares under `~/.local/share/BroekraftServer`. Ingen automatisk systemtjeneste oprettes.
- GitHub-workflowet pakker begge Linux-versioner som `.tar.gz` og har en ny Ubuntu-test for
  installation, opdatering, HTTP, HTTPS med korrekt CA og SIGTERM-afslutning før udgivelse.
- LÆSMIG.md beskriver også `--ingen-browser` og SSH-tunnel til det lokale kontrolpanel.
- Begge Linux-programmer er krydskompileret og pakket lokalt. 62 eksisterende automatiske tests
  består på Windows. Linux-opstart/installer kan ikke køres nativt på denne Windows-maskine;
  den nye Ubuntu-test er skrevet, men endnu ikke kørt i GitHub Actions. ARM64 er heller ikke kørt.

Til din downloadside, når ejeren vil udgive: filnavnene er `BroekraftServer-Linux-x64.tar.gz`
og `BroekraftServer-Linux-ARM64.tar.gz`. Linux kræver glibc og 64-bit OS, ikke Alpine/musl/32-bit.
Downloadsidens HTML og øvrige designfiler er ikke ændret.

## Nyt: tablet-opsætning efter ejerens direkte ønske

Ejeren bad efter den første overdragelse Codex om tablet-siden, hvor QR-koden scannes.
Det er nu lavet i `tilslut/`: QR-scanning med bagkamera, manuel adresse, seneste computer,
hjælp og store trykflader. Forsiden har fået ét ekstra kort: **Spil sammen** → `tilslut/`.
`sw.js` er bumpet til v12 og cacher opsætningsfilerne. Serverens verdensliste linker også dertil,
og alle tre programbygninger inkluderer mappen. Bevar denne funktionalitet under dit designarbejde.

Scanningen bruger lokalt medfølgende jsQR (Apache-2.0, licens i tilslut/vendor). Ingen billeder
uploades eller gemmes. Kun private IPv4-serveradresser accepteres, og brugeren trykker selv på
**Åbn familiens server**, før navigationen sker. Der forsøges ikke cross-origin fetch/WS fra
GitHub Pages til LAN-serveren. Browserkamera kræver HTTPS/localhost; på LAN-http vises vejledning
til tablettens Kamera-app eller manuel adresse. Kameraet lukkes ved stop, skjult side og sideskift,
også hvis en tidligere tilladelsesanmodning først bliver besvaret bagefter.

32 tests består, inklusive faktisk afkodning af kontrolpanelets QR-kode og kameraets livscyklus
med simuleret kamera. Der er stadig ikke afprøvet et fysisk iPad-kamera, pushet eller udgivet.
Den egentlige online-tilstand i spil.js er fortsat din opgave som beskrevet nedenfor.

---

27. september 2026. Arbejdet ligger i den fælles mappe på `codex/server`.
**Der er ikke pushet, oprettet tags eller udgivet noget. Push aldrig direkte til main.**

## Klar til integration

- `server/main.js`: Deno HTTP/WS, private netkort, ledig port fra 8080, automatisk browseråbning,
  lokal administration, verdensoprettelse i worker og gemning hvert minut/ved stop/Ctrl+C.
- `server/verdener.js`: gzip-lagring, validerede metadata, samtidige gemninger i kø, backupkopier og sletning.
- `server/generator.js`: de samme opskrifter i alle størrelser. Fremgang fra worker holder panelet responsivt.
- `server/rum.js`: spillergrænser, positioner, klumpstrøm/RLE, valideret bygning, TNT og Simulering.
- `spil/broekraft/net.js`: det aftalte EventTarget-API og automatisk genforbindelse.
- `spil/broekraft/simulering.js`: ren JS uden DOM eller three.js; vand/lava/ild/TNT, aktive felter og faste tids-trin.
- `server/kontrol/`, `server/sammen/`, `server/test-klient.html`: enkle, fungerende sider. Giv dem gerne design.
- `.github/workflows/broekraft-server.yml`: tests → tre programmer → zip → GitHub Release ved `server-v*`.
  Kan også køres manuelt og gemme pakker uden udgivelse.

Læs `server/protokol.md` for det komplette format og API-kontrakten.

## Din del

Online-tilstanden i `spil.js` og den store verdens 3D-klumper er **ikke** integreret. Det er din opgave,
ligesom spillerfigurer, udsyn, emoji, væske-/ildgrafik, svømning og lyde. De nye blokke 43–56 er skjulte.
Forside og hent-server-side er heller ikke ændret.

Serverens `/` og `/sammen/` viser en verdensliste. Spil-linket er
`/spil/broekraft/?server=1&verden=<id>`; `/index.html` er den normale forside.
Vis ikke en fungerende online-oplevelse til børnene, før flaget faktisk bliver håndteret i spil.js.

### Vigtige detaljer ved tilslutning

1. Opret forbindelsen med `forbind(wsUrl, {figur})` og registrér hændelser **før** `await f.vælg(id)`.
2. `velkommen` har den nye `dig`, verdensmål og spillernes positioner inklusive din egen startposition.
   Den udsendes også ved automatisk genforbindelse. **Ryd alle gamle klumper og figurer dér.**
3. Klumper er søjler 16×16×højde; dataindeks `x + z*16 + y*256`. Hele verdens data må ikke antages at være
   64×32×64. Serveren streamer nærmeste manglende klumper i en cirkel; `glem` skal frigive dem igen.
4. `pos` bruger føddernes position. Biblioteket begrænser til 10/s og sender den seneste position.
   Ved almindeligt verdensskift nulstilles gammel position; ved genforbindelse gendannes den.
5. Byg først endeligt på en `blok`-besked fra serveren; ugyldige ændringer kan afvises uden ændring.
   Handlinger under afbrydelse bliver ikke lagt i kø. Vis en enkel forbindelsesstatus.
6. `f.luk()` stopper automatisk genforbindelse, når spilleren forlader spillet.
7. `fuld` bliver `Error("fuld")` fra `vælg`. Vis det venligt og giv mulighed for at vælge en anden verden.
8. På online-serveren kører simulering og TNT allerede. Kør **ikke** en ekstra lokal simulation af samme verden.

### Enkeltspiller-simulering og blokke

`Simulering` tager hent/sæt/inde/højde, ildBreder, tændTNT og valgfri lyd.
Kald `sim.blokÆndret(x,y,z)` efter manuelle ændringer. Ved indlæsning af en gemt verden skal væsker
og ild vækkes én gang. Kald tick(dt) med sekunder; 20/s og 60/s giver samme resultat.

Blokke: Vand 43, Vand 1–7 44–50, Lava 51, Lava 1–3 52–54, Ild 55, Obsidian 56.
Eksisterende id'er er uændrede. Simuleringens stabile id-tabel er testet mod BLOKKE;
ved fremtidige nye brændbare blokke skal tabellen også udvides.

Vand over lava giver sten; lava-kilde mod vand fra siden/nedenfra giver obsidian. Flydende lava giver sten.
`ildBreder=false` forhindrer ny ild fra både flammer og lava, men direkte naboer til eksisterende ild kan brænde væk.
Tændt TNT har serverlunte 2,2 s, kædelunte 0,25–0,75 s og radius 3,3. Der er maksimalt 40 aktive lunter.
Når en verden stoppes, afsluttes lunter før gemning. Protokollen har bum, men endnu ingen visuel luntebesked.

## Kontrolpanel, byg og afprøvning

Fra `server/`: `deno task start`, `deno task test`, `deno task byg`.
Kontrolpanelet åbner på `http://127.0.0.1:8080/kontrol` (eller næste ledige port).
Startede verdener vises i testklienten. Efter servergenstart skal eksisterende verdener startes i panelet.
Backup er en mappekopi med meta.json og data.bin.gz. Slet kræver to bekræftelser.

Der er en midlertidig Deno 2.9.7 i `%TEMP%\broekraft-deno\deno.exe` på denne udviklingsmaskine;
den er ikke installeret globalt. De kompilerede programmer kræver ingen Deno-installation.
Programmer ligger i den ignorerede `server/dist/`: Windows, Mac-Intel, Mac-AppleSilicon.
`server/LÆSMIG.md` er den danske forældrevejledning. Ret udviklingsstatus dér og i UDGIVELSE.md, når integrationen er klar.

28 tests består. De omfatter:

- Byte-identisk generation for alle fire typer ved frø 12345 og 64×32×64, inklusive SHA-256 fra den
  uændrede commit `73007dab7e26730d3b778ca8254c8a7e1f8e3d01`.
- Alle fire serverstørrelser og alle typer.
- To rigtige WebSocket-klienter, blokke/positioner, fuld verden, genforbindelse og gemning/genindlæsning.
- RLE-fejl, inputvalidering, klumpfiltrering, TNT, simulering og lokal adgangskontrol.
- Windows-programmet fra en anden arbejdsmappe: QR, verdensgenerering i indpakket worker, to browserfaner,
  ingen konsolfejl i testklienterne, blok-/positionssynkronisering og gemt testblok ved afslutning.

Mac-programmerne er krydskompileret, men ikke kørt på Mac. iPad/Safari og det endelige spil skal afprøves
efter din integration. GitHub-workflowet er skrevet; der er ikke kørt en rigtig GitHub Release.
Tablettens three.js bruger stadig CDN'et fra det eksisterende three.js-modul.

## Ændringer i dine eksisterende filer

Kun de tilladte ændringer: export af lavStøj og antal-værktøj i verden.js, a.antal omkring
de 12 faste dekorationsantal i verdener.js, samt 14 nye skjulte blokke og egenskabskommentarer i blokke.js.
Ingen ændringer i mesh, spil.js, dyr.js, lyd.js, forsiden eller spillenes HTML/CSS.
