# Broekraft-protokol 0.2.0

WebSocket: `/ws`, samme host/origin som spillet (wss på HTTPS). JSON-tekst har feltet `t` og er højst 4096 UTF-8-bytes,
bortset fra `rtc`, som må fylde 32768 bytes. Version 0.1.0 accepteres stadig uden stemmer.
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
| verdener | liste: [{id,navn,type,bredde,dybde,spillere,maks}] |
| velkommen | dig, verden: {id,navn,type,bredde,dybde,højde,frø,ildBreder}, spillere: [{id,figur,x,y,z,yaw,pitch}] |
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

## Binære klumper

Header på 11 bytes: type uint8=1, cx int32, cz int32, højde uint16. **Little endian**.
Resten er RLE-par: antal uint8 (1–255), blok-id uint8. Rækker længere end 255 deles op.
Udpakket data har præcis `16*16*højde` bytes med indeks `x + z*16 + y*256`.
cx/cz er klumpkoordinater, ikke blokkoordinater. Verdensindeks er `x + z*bredde + y*bredde*dybde`.

Serveren sender nærmeste manglende klumper først, højst fire pr. spiller pr. 100 ms,
inden for en cirkel med radius r. En hel klump kommer før dens senere blokændringer.
Ved glem frigives klumpen; en ny tilslutning kræver, at klienten rydder alle gamle klumper.
Langsomme klienter får begrænset strømmen og forbindes igen ved for stor sendekø.

## Klientbibliotek til Claude

`forbind(url,{figur,version})` fra `spil/broekraft/net.js` returnerer en EventTarget med
`verdener()`, `vælg(id)`, `udsyn(r)`, `pos(x,y,z,yaw,pitch)`, `sæt(x,y,z,id)`, `tænd(x,y,z)`, `emoji(e)` og `luk()`.
`vælg` returnerer indholdet af velkommen uden t, eller kaster `Error("fuld")`.
Kun ét udestående kald af hver forespørgselstype er tilladt. Svar udløber efter 15 sekunder.

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
