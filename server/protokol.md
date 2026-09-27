# Broekraft-protokol 0.1.0

WebSocket: `/ws`, samme host/origin som spillet. JSON-tekst har feltet `t` og er højst 4096 UTF-8-bytes.
Ukendte typer ignoreres. Binære klientbeskeder afvises. Serveren har en samlet grænse på 100 beskeder/s
pr. forbindelse ud over grænserne nedenfor. En brudt forbindelse fjernes automatisk (WebSocket ping/pong).

## Klient → server

| t | Felter | Betydning |
|---|---|---|
| hej | figur, version | Første besked; version `0.1.0`. Figur: gris, ko, faar, hone, fro, and, snegl, zombie |
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

## Simulering

`Simulering` er ren JS uden three.js. Giv hent/sæt/inde/højde, ildBreder, tændTNT og valgfri lyd.
Kald blokÆndret efter manuelle ændringer og tick(dt) med sekunder. Ved indlæsning vækkes gemte væsker
og flammer én gang. Testmuligheden `tilfældig` erstatter Math.random med en deterministisk funktion.
Blok-id 43–50 er vand, 51–54 lava, 55 ild og 56 obsidian. Alle er skjulte indtil Claudes visning er klar.
IldBreder=false forhindrer ny ild fra både ild og lava; eksisterende ild kan stadig brænde sine direkte naboer væk.
Vand ovenfra på lava giver sten; lava-kilde, der møder vand fra siden/nedenfra, giver obsidian.
