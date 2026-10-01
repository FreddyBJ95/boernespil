# Overdragelse fra Codex: Den uendelige verden på serveren

1. oktober 2026. Serverdelen af opgave D er færdig på **codex/uendelig**.
Arbejdet ligger i `C:/Users/Frede/.codex/worktrees/uendelig/boernespil`, så det ikke flytter eller
overskriver dit igangværende arbejde i den fælles mappe. Linux-installationen fra codex/linux-server
er med i samme gren. Ingen kode er flettet eller pushet til main, og server-v0.5.0 er ikke tagget.
Ændringerne er pushet til arbejdsgrenen og ligger i **[kladde-PR #1](https://github.com/FreddyBJ95/boernespil/pull/1)**.

## Din næste del: tabletternes visning

- Læs `server/protokol.md`. `velkommen.verden.uendelig === true` betyder serverland med
  bredde/dybde 65536, højde 64 og hjem ved x/z 32768,5. Startpositionens y kommer fra spillerlisten
  og er toppen af hjemmets søjle + 1, også efter byggeri i højde 63.
- Brug de autoritative klumper fra serveren i den eksisterende uendelige visning. De har fortsat
  11-byte-header og RLE; søjlens indeks er `x + z*16 + y*256`. cx/cz er 0–4095. net.js kontrollerer
  klumpmål mod velkomstens mål. Der er ingen binære klumper før velkomsten.
- Håndtér `blok` og `glem` som før. Lav ikke lokalt terræn eller lokal vand/lava/ild-simulering
  over serverklumperne, da det kan overskrive børnenes fælles byggeri.
- Årstider og kort kan fortsat bruge frøet. Tog, ballon, spådame, guld, sten og dyr forbliver lokale.
  Andre spillere vises som før; toget er ikke fælles.
- Vis gerne "uden kanter" i børnenes verdensliste (`server/sammen/sammen.js`) ved flaget. Panelet
  er allerede opdateret. Respektér et eksplicit `uendelig:false`: en gammel gemt endelig verden
  med type uendelig bevarer format 0.1.0 og skal stadig behandles som endelig.
- 0.1.0-klienter tilbydes kun endelige verdener. Et direkte valg af uendeligt land beder barnet
  genindlæse og bevarer den gamle tilslutning. Protokolversionen er stadig 0.2.0.

`spil.js`, `verden.js`, `uendelig.js`, blokke, dyr, lyde og øvrig spilvisning er ikke ændret.

## Server og gemning

Ny uendelig metadata har dataformat 0.2.0. Landet laves i en worker med lavLand og meta.frø direkte,
byte-identisk med tablettens generator. Der oprettes ingen enorm data.bin.gz.

Kun ændringer gemmes i `ændringer/r.<rx>.<rz>.bin.gz` for regioner på 32×32 søjler. Formatet har
mærket BRUK020, søjleindeks og par af lokalt blokindeks/blok-id. Atomisk skrivning og verdens kø
bruges også til backup, som kopierer hele mappen. Gamle verdensfiler ændres ikke.

Kun synlige søjler plus et LRU-lager på højst 32 øvrige søjler holdes indlæst. Usynlige søjler
udløber efter 30 sekunder. Simulationen beskytter en uindlæst kant og genoptager, når naboen
indlæses. TNT indlæser naboer før eksplosionen og beholder lunten, hvis læsningen fejler.

## Pakker, Pi og udgivelse

Programmets version er 0.5.0. Der er pakker til Windows, Mac Intel, Mac Apple Silicon, Linux x64
og Linux ARM64/Pi i `server/dist/` i worktreet; arkiverne kopieres også til den fælles mappes
`server/dist/`. SHA256SUMS.txt følger med. Dist er Git-ignoreret.

Pi-pakken kræver **64-bit Raspberry Pi OS med glibc**. Installer uden sudo med `sh installer.sh`;
vejledningen beskriver SSH-tunnel og kørsel uden skærm. Installeren afviser 32-bit userspace.
Der er endnu ingen adresse/bruger til en fysisk Pi, og ingen SSH-installation er foretaget.

Alle 87 automatiske tests består. De dækker byte-identisk land, fjern gemning/genstart, verdensskift, vand/TNT
ved kanten, fejl under TNT-læsning, bounded memory ved 2000 blokkes gang, skjulte verdener og
gamle klienter. Windows-programmet er afprøvet nativt, inklusive begge workers og WebSocket,
byggeri, gemning/genstart, hjem med blok i højde 63 og fjernelse af blokke. Mac, Pi og Safari mangler fysisk afprøvning.

GitHub-workflowet bygger alle fem pakker og kører installation/HTTP/korrekt HTTPS og samme
pakketest på native Linux x64 og ARM64 før en tag-udgivelse. Pull requests kan også køre disse
kontroller. Efter din tabletintegration skal den samlede version afprøves, og ejeren fletter
arbejdet. Opret derefter release-tagget på den færdige version; push aldrig direkte til main.
