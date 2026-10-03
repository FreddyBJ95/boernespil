# Krystaljægerne

Et originalt 3D-eventyr for Voksenrummet. Ingen konti, betaling, multiplayer eller eksterne tjenester. Ro og mystik; fjender opløses i lys, uden blod. Lokale Three.js r160 og GLTFLoader fra `../3d-faelles/`.

## Gennemførselsrute

1. Start ved `(0,5)`; Mira ved `(2,0)`, tæt på brønden. Gå inden for 2,8 enheder og tryk E / Brug. Hun heler helt og tilbyder udstyr og eliksirer.
2. Saml 8 af 24 lyskrystaller på øen. Den nærmeste bliver næste mål på kortet. De seedede steder ligger 20–60 enheder fra landsbyen.
3. Åbn 3 af 6 kister ved `(-30,24)`, `(-50,-8)`, `(34,5)`, `(43,18)`, `(13,-36)`, `(-20,-26)`; de giver mønter, erfaring og eliksirer.
4. Berolig 4 stenvogtere omkring ruinerne: `(28,1)`, `(36,11)`, `(43,-9)`, `(24,-12)`. Magi er deres svaghed. Sværd er bedst mod slim, bue mod krystaldyr. Lumen hjælper med lysprojektiler.
5. Mosgrotten `(-43,8)` → gennem nye sammenhængende rum til porten i rummet længst fra start → Brug → dybde 2 → Mosvogteren (150 liv, områdeslag). Den varsler en ring i 1,1 sekund; gå væk. Ved 45% liv kalder den to små hjælpere. Seglet gives ved sejr.
6. Spejlgrotten `(35,-32)` → dybde 2 → Krystalhjorten (185 liv, vifte med 5 krystalprojektiler; hold afstand og brug buen). En anden bossmekanik.
7. Kobberdybet `(-5,-45)` → dybde 2 → Den gamle vogter (235 liv, stor ring og hjælpere; magi er særlig effektiv).
8. Efter hver sejr opstår en tydelig udgang ved bossen; indgangsrummet har også altid udgang til øen. Bring tre segl til Stjerneporten `(0,-58)`, Brug. Se slutdialogen og fortsæt fri udforskning.

Der er 8 egentlige opgaver med engangsbelønninger og niveau. Opgaver må tages i fri rækkefølge; porten kræver præcis tre bossegl. Død sender spilleren hjem med alt opgavefremskridt, udstyr og segl bevaret; 10 kobber bruges på hjemrejsen. Liv regenererer langsomt uden kamp. Mira kan hele gratis. Eliksirer og opgraderinger understøtter gennemførelse.

## Kontrol og mobil

- WASD eller pile: gå i kameraets retning. Mus klik / mellemrum: angrib. 1/2/3: sværd/bue/magi. E: Brug. Q: eliksir. I: taske. Esc: pause.
- Tablet/telefon: venstre joystick, højre drag drejer kameraet, op/ned-drag ændrer afstand. Store Angrib og Brug; separate våben og eliksirknap. Touch sigter på nærmeste fjende. Alle menuer, opgaver og slutmålet kan betjenes med touch alene. Intet Pointer Lock.
- Mobil: DPR højst 1,4, ingen skyggekort, instanser til statiske gentagelser, fjender langt væk skjules. Desktop DPR højst 1,8 og ét 1024-skyggekort. Ingen CDN eller importmap.
- Lyd er selvskabte WebAudio-toner efter interaktion. Mute gemmes.

## Gemning og kontrol

`krystaljaegerne-rejse-v1` i localStorage gemmer hvert 5. sekund, ved regioner, belønning, pause og sideskift. Fortsæt validerer version, tal/ranges, våben, opgave-IDs, besøg, unikke indsamlings-IDs og dungeonkoordinater. En igangværende grotte bevarer sit frø; et nyt besøg får nyt frø. Ny rejse kræver bekræftelse, hvis der allerede er en gemning.

Fra repository root:

```
node --test spil/krystaljaegerne/eventyr.test.mjs
node --check spil/krystaljaegerne/spil.js
node --check spil/krystaljaegerne/verden.js
```

Testene dækker 1.200 dungeon layouts med åbne forbindelser, seedgenoprettelse, nybesøg, savevalidering, alle opgaver, våbensvagheder, sværdets retningsområde, udstyr og eliksirer.

## Blender

`../../blender/tre-verdener/krystaljaegerne/byg.py` bygger hele originalbiblioteket, eksporterer `modeller/eventyr.glb`, gemmer `.blend` og renderer `forside.jpg`. 22 modeller: eventyrer, følgesvend, tre fjendetyper, tre våben, hus/tårn/brønd, to træer/klippe/krystaller, søjle/ruinbue, kiste/portal, gulv/væg/terræn. Karakterdele har navne, der animeres ved bevægelse i spillet. Ingen eksterne kunstassets.
