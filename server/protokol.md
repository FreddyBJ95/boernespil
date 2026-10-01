# Broekraft-protokol 0.2.0

WebSocket: `/ws`, samme host/origin som spillet (wss på HTTPS). JSON-tekst har feltet `t` og er højst 4096 UTF-8-bytes,
bortset fra `rtc`, som må fylde 32768 bytes. Version 0.1.0 accepteres stadig uden stemmer i endelige verdener.
Nye uendelige verdener udelades fra 0.1.0-klientens liste; et direkte valg afvises med en besked om
at genindlæse spillet. Den gamle tilslutning bevares. Ældre gemte, endelige `uendelig`-verdener har
stadig format 0.1.0 og `uendelig:false`; de ændres ikke automatisk til en stor verden.
Ukendte typer ignoreres. Binære klientbeskeder afvises. Serveren har en samlet grænse på 100 beskeder/s
pr. forbindelse ud over grænserne nedenfor. En brudt forbindelse fjernes automatisk (WebSocket ping/pong).

## Klient → server

| t | Felter | Betydning |
|---|---|---|
| hej | figur, version | Første besked; version `0.2.0` eller `0.1.0`. Figur: gris, ko, faar, hone, fro, and, snegl, zombie |
| verdener | – | Liste over startede verdener |
| vælg | verden | Verdens-id; ny tilslutning nulstiller klumper |
| udsyn | r | Heltal; begrænses til 1–8, standard 6 |
| pos | x,y,z,yaw,pitch | Føddernes position; højst 10/s, endelige tal inden for verdenen (flyvning op til højde+64) |
| sæt | x,y,z,id | Heltalskoordinater, kendt id, 0 fjerner; højst 20/s sammen med tænd |
| tænd | x,y,z | Tænd TNT med 2,2 sekunders lunte |
| emoji | e | Kun ❤️ 😂 👍 🎉 😮 👋; højst 2/s |

Bundsten kan hverken sættes eller fjernes. Blokke kan ikke placeres i en spillers kasse
(halvbredde 0,3, højde 1,7). Serveren bestemmer blokændringer, simulering og eksplosioner.

## Server → klient

| t | Felter |
|---|---|
| verdener | liste: [{id,navn,type,bredde,dybde,uendelig,spillere,maks}] |
| velkommen | dig, verden: {id,navn,type,bredde,dybde,højde,frø,ildBreder,stemmer,uendelig}, spillere: [{id,figur,x,y,z,yaw,pitch}] |
| fuld | – |
| ind | id,figur |
| ud | id |
| pos | liste: [{id,figur,x,y,z,yaw,pitch}], op til 10/s |
| blok | x,y,z,id, kun til spillere med den berørte klump |
| glem | cx,cz |
| bum | x,y,z (eksplosionens centrum) |
| emoji | id,e |
| fejl | besked |

Maksimum gælder pr. verden. Afvist verdensskift bevarer den gamle tilslutning.
Der er ingen navne eller chat i protokollen. Dyrene simuleres lokalt på hver tablet.

## Fælles brag og fyrværkeri (tilføjelse på codex/netvaerk-effekter)

De nye metoder på `net` sender kun, mens `net.klar` er sand. De lægges aldrig i kø efter afbrydelse.
Spillets visuelle integration udføres af Claude. Den eksisterende version 0.2.0 er bevaret; udvidelsen
ændrer ingen eksisterende beskeder. Gamle klienter ignorerer nye hændelser og modtager stadig blok/bum.

| Klientmetode | Besked | Serverens handling |
|---|---|---|
| `brag(x,y,z)` | `{t:"brag",x,y,z}` | Samme faste radius 3,3 og TNT-kæde som TNT; udsender `blok` og `bum` |
| `fyrværkeri(x,y,z,mønster?)` | `{t:"fyrværkeri",x,y,z,mønster?}` | Vælger fælles farver/flyveparametre og sender én raket til alle i rummet |
| `tændFyrkasse(x,y,z)` | `{t:"fyrkasse",x,y,z}` | Kræver Fyrværkeri-, Show-kasse- eller Fontæne-blok og fjerner den én gang. Fyrværkeri: 12 raketter. Show-kasse: 36 raketter, hvor de sidste 8 er en hurtig finale. Fontæne: én `fyrværkeri`-besked med mønster `fontæne` på blokkens plads |

Alle koordinater skal være endelige tal inden for verdens x/z-grænser og y=0…højde+64.
Brag må være højst 96 blokke fra seneste spillerposition; klienten angiver træfpunktet, mens serveren
bestemmer selve eksplosionen. Den simulerer ikke projektilbanen. Højst to brag/sekund pr. spiller og 16
pr. rum. Klientens foreslåede radius eller øvrige felter ignoreres. Bundsten bevares.

En enkelt raket må starte højst 32 blokke fra spilleren. En kasse kræver heltalskoordinater inde i
verdenen og en afstand på højst otte blokke. Raketter og kassetændinger deler grænsen to/sekund pr.
spiller. Højst fire aktive kasser pr. rum. Rummet sender højst 16 raketter/sekund; kasseserier venter
på ledig kapacitet. Hvert kassetryk forbruger blokken før serien oprettes, så samtidige tryk ikke duplikerer.
Kasseserier følger serverens tick, fortsætter efter afsenderen forlader rummet og ophører ved Stop.
Den forbrugte blok gemmes; uafsluttede kosmetiske serier gemmes ikke.

Server → alle i samme rum, **inklusive afsenderen**:

```js
{ t: "fyrværkeri", id, fra, x, y, z, mønster, farver: ["#…", "#…"], højde, vx, vy, vz }
```

`id` er serverens UUID pr. raket. Mønster vælges fra `kugle`, `ring`, `hjerte`, `stjerne`, `smiley`,
`guldregn`, `knitter`, `blomst`, `sommerfugl`, `spiral`, `palme`, `planet`, `regn`, `regnbue` samt de særlige
`romerlys` (lille kugle), `fontæne` (gnister fra jorden i ti sekunder) og `lygte` (ønskelygte, der svæver op);
udeladt mønster vælges af serveren blandt de almindelige, ukendte mønstre afvises. Højde er 16…26 over
startpunktet; vy=22…27 og vx/vz=−1,25…1,25. Afspil fra eventet og brug de medsendte værdier, så samme
raket har samme bane, mønster og farver hos alle. Ingen skader eller blokændringer fra raketter.

Kontrolpanelets lokale `GET /api/status` har desuden `netværk: {status,profiler}` og `tabletSet`.
Status er `klar`, `ukendt` eller `ikke-windows`. En profil er `{adresser,profil}` med profil
`Public`, `Private`, `DomainAuthenticated` eller `Unknown`. Kun adresser, serveren lytter på, medtages;
SSID/netværksnavne indsamles ikke. Profiler læses højst én gang/minut via en fast PowerShell-kommando,
med fem sekunders tidsgrænse. `tabletSet` betyder en godkendt forespørgsel fra en anden lokal IPv4-enhed
siden opstart, ikke en garanti for HTTPS, lyd eller gennemført verdensvalg. Data er kun tilgængelige
via det eksisterende loopback-beskyttede kontrol-API.

Kilde til Windows-profiltjek: [Microsofts Get-NetConnectionProfile](https://learn.microsoft.com/en-us/powershell/module/netconnection/get-netconnectionprofile).

## Binære klumper

Header på 11 bytes: type uint8=1, cx int32, cz int32, højde uint16. **Little endian**.
Resten er RLE-par: antal uint8 (1–255), blok-id uint8. Rækker længere end 255 deles op.
Udpakket data har præcis `16*16*højde` bytes med indeks `x + z*16 + y*256`.
cx/cz er klumpkoordinater, ikke blokkoordinater: `0 <= cx < bredde/16` og `0 <= cz < dybde/16`,
med bredde/dybde fra seneste `velkommen.verden`. Højden skal svare til velkomstens `højde`.
For den uendelige verden er cx/cz 0…4095. De endelige verdener har stadig deres tidligere mål.
Verdensindeks i de endelige verdener er `x + z*bredde + y*bredde*dybde`.

Serveren sender nærmeste manglende klumper først, højst fire pr. spiller pr. 100 ms,
inden for en cirkel med radius r. En hel klump kommer før dens senere blokændringer.
Ved glem frigives klumpen; en ny tilslutning kræver, at klienten rydder alle gamle klumper.
Langsomme klienter får begrænset strømmen og forbindes igen ved for stor sendekø.

## Den uendelige verden (server 0.5.0)

For `type: "uendelig"` sender serveren `velkommen.verden.uendelig: true`, `bredde: 65536`,
`dybde: 65536` og `højde: 64`. Frøet er direkte `meta.frø`, så grundlandet passer byte for byte
med `lavLand({støj: lavStøj(frø), ID, BY: 64, frø}).søjle(cx, cz)` på tabletten. Startpositionen
er ved hjemmet, x/z = 32768,5; y ligger én blok over toppen. Koordinater for positioner,
blokændringer, TNT, brag og fyrværkeri kontrolleres stadig mod verdens medsendte mål.

**Claude integrerer visningen:** Når `velkommen.verden.uendelig` er sand, skal spillet bruge
serverens `klump`, `blok` og `glem` som grundlag for de viste søjler. Det må ikke generere
terrænet lokalt oven i serverens klumper. Ryd tidligere søjler ved hver `velkommen`, også ved
verdensskift og genforbindelse. Der skal ikke oprettes én tæt blokmatrix på 65536²; behold de
modtagne søjler enkeltvis. Kortet og årstiderne bruger fortsat verdens frø og indstillinger.

Tog, luftballon, spådamen, guld, sten og dyr kører lokalt på hver tablet, som når barnet spiller
alene. Andre spilleres figurer og blokændringer deles; toget er ikke fælles. Vand, lava, ild
og TNT styres af serveren. Simulering ved en endnu ikke indlæst søjle venter, til søjlen er klar.

Kontrolpanelet viser "uden kanter" og spørger ikke om størrelse for denne type. Kun typen
`uendelig` bruger metadataformat 0.2.0 og regioner med ændringer; endelige verdener beholder
format 0.1.0. Protokollen er fortsat 0.2.0, og 0.1.0-klienter kan stadig bruge endelige verdener.
Ældre udgaver af spillets netmodul kan ikke læse klumpkoordinater over 63 og skal opdateres,
før de går ind i den uendelige verden.

## Klientbibliotek til Claude

`forbind(url,{figur,version})` fra `spil/broekraft/net.js` returnerer en EventTarget med
`verdener()`, `vælg(id)`, `udsyn(r)`, `pos(x,y,z,yaw,pitch)`, `sæt(x,y,z,id)`, `tænd(x,y,z)`, `emoji(e)` og `luk()`.
`vælg` returnerer indholdet af velkommen uden t, eller kaster `Error("fuld")`.
Kun ét udestående kald af hver forespørgselstype er tilladt. Svar udløber efter 15 sekunder.
`udpakKlump(buffer,maksId=255,mål={bredde:1024,dybde:1024})` bevarer ældre direkte kald;
forbindelsen bruger altid målene fra sin seneste velkomst og afviser klumper før velkomsten.

Alle serverbeskeder bliver hændelser med `e.detail` uden t. Desuden:

- klump: {cx,cz,højde,data:Uint8Array}.
- lukket: {genforbinder:boolean}.
- velkommen udsendes **også efter automatisk genforbindelse**. Ryd gamle klumper og spillerfigurer
  her, og brug det nye `dig`. Hændelsen kommer før de nye klumper.

Registrér hændelser inden `vælg`. Biblioteket sender seneste position højst 10/s,
genforbinder efter 0,5–10 sekunder og gentager hej/vælg/udsyn og seneste position.
Ændringer, der forsøges under afbrydelsen, køres ikke senere. Vis først ændringer efter serverens blok-besked.
`luk()` stopper genforbindelse, når spillet forlades. Ved et almindeligt verdensskift skal spillet nulstille
sin position ud fra spillerlisten og kalde pos med den nye startposition.

## Walkie-talkie (0.2.0)

`velkommen.verden.stemmer` er boolsk og standard `false`; spillerlisten og `ind` indeholder også
`version`. `net.info` indeholder seneste velkomst, og `net.spillere` er et Map med aktuelle spillere.
`net.rtc(til,data)` og `net.taler(til)` sender kun under en aktiv tilslutning med version 0.2.0.

- Klient → server: `{t:"rtc",til:<spiller-id>,data}`. Server → modtager: `{t:"rtc",fra:<ægte afsender-id>,data}`.
  Kun mellem 0.2.0-spillere i samme rum med stemmer slået til. Højst 64 signaler/sekund pr. afsender;
  overskydende signaler ignoreres. Lyd transporteres ikke på WebSocket.
- `data` er enten `{klar:true,runde}`, `{runde,modrunde,beskrivelse:{type,sdp}}` eller
  `{runde,modrunde,kandidat:{candidate,sdpMid,sdpMLineIndex,usernameFragment?}}`.
  Runde er en ny UUID ved genforbindelse/skift. Modrunde skal matche modtagerens aktuelle UUID.
  Klar-håndtrykket gør, at modulet kan oprettes efter `vælg` og mikrofontilladelsen. Mindste spiller-id
  sender offer. Gamle svar og kandidater fra tidligere forbindelser ignoreres.
- SDP: én audio-sektion, rtcp-mux, højst 24000 tegn. ICE: kun lokale `host`-kandidater, private IPv4,
  lokal IPv6 eller mDNS `.local`. Ingen STUN/TURN. Video og data channels accepteres ikke.
- Klient → server: `{t:"taler",til:true|false}`. Server → rum: `{t:"taler",id,til}` til 0.2.0-klienter.
  Højst fire startbeskeder/sekund; stop accepteres altid. Serveren stopper talestatus efter 20 sekunder.
- Voksenkontakt: `POST /api/stemmer {id,til}` med samme origin/token som andre kontrolhandlinger.
  Gemmes før udsendelse af `{t:"stemmer",til}`. Ved fra lukkes lydforbindelserne straks af klienten.
  Ældre 0.1.0-klienter modtager ikke disse nye beskedtyper, men kan stadig spille.

`forbindStemmer(net,strøm)` fra `spil/broekraft/stemmer.js` returnerer synkront en EventTarget.
Strømmen skal have præcis ét audiospor, ingen video, og være den færdigbehandlede stemme fra Claudes
lydgraf. Modulet henter aldrig mikrofon, optager aldrig og afspiller aldrig selv. Det slukker sporet
straks; `tal(true)` tænder, `tal(false)` slukker. Gentagne true forlænger ikke 20-sekundersfristen.
Efter automatisk stop/afbrydelse kræves `tal(false)` før næste tryk. Skjult side, fokus-tab og
netafbrydelse slukker også sporet. `luk()` lukker peers og fjerner alle lyttere.

Events (`e.detail`): `lyd {id,strøm}`, `taler {id,til}`, `stemmerTil {til}`, desuden
`lydSlut {id}` til oprydning af afspilleren og `fejl {id?,besked}`. Den aktuelle tilladelse findes på
`tilladt`; første `stemmerTil` kommer også som microtask, så lyttere kan tilføjes efter oprettelsen.
Net-genforbindelse og verdensskift håndteres automatisk. En fejlet ICE-forbindelse giver `fejl`;
genopret modulet eller skift voksenkontakten fra og til for at forsøge igen.

**Claude ejer mikrofon og afspillere:** kald `tal(false)` ved pointerup/pointercancel/lostpointercapture,
og `luk()` ved exit. Stop de oprindelige mikrofonspor og luk lydgrafen ved exit/tilbagekaldt tilladelse;
modulet deaktiverer kun det leverede spor og stopper ikke kalderens lydgraf. Afspil den modtagne stream
i et audio-element og håndtér Safaris krav om brugertryk. Tilslut aldrig egen stemme til højttaleren.
Intet af dette bruger et offentligt relæ; netværk med klientisolering kan derfor blokere lyden.

## Simulering

`Simulering` er ren JS uden three.js. Giv hent/sæt/inde/højde, ildBreder, tændTNT og valgfri lyd.
Kald blokÆndret efter manuelle ændringer og tick(dt) med sekunder. Ved indlæsning vækkes gemte væsker
og flammer én gang. Testmuligheden `tilfældig` erstatter Math.random med en deterministisk funktion.
Blok-id 43–50 er vand, 51–54 lava, 55 ild og 56 obsidian. Alle er skjulte indtil Claudes visning er klar.
IldBreder=false forhindrer ny ild fra både ild og lava; eksisterende ild kan stadig brænde sine direkte naboer væk.
Vand ovenfra på lava giver sten; lava-kilde, der møder vand fra siden/nedenfra, giver obsidian.
