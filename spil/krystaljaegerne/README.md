# Krystaljægerne

Et originalt 3D-eventyr for Voksenrummet. Ingen konti, betaling, multiplayer eller eksterne tjenester. Ro og mystik;
fjender opløses i lys, uden blod. Lokale Three.js r160 og GLTFLoader fra `../3d-faelles/`.

## Gennemførselsrute

1. Start ved `(0,5)`; Mira ved `(2,0)`, tæt på brønden. Gå inden for 2,8 enheder og tryk E / Brug. Hun heler helt og
   tilbyder udstyr og eliksirer.
2. Saml 8 af 24 lyskrystaller på øen. Den nærmeste bliver næste mål på kortet. De seedede steder ligger 20–60 enheder
   fra landsbyen.
3. Åbn 3 af 6 kister ved `(-30,24)`, `(-50,-8)`, `(34,5)`, `(43,18)`, `(13,-36)`, `(-20,-26)`; de giver mønter, erfaring
   og eliksirer.
4. Berolig 4 stenvogtere omkring ruinerne: `(28,1)`, `(36,11)`, `(43,-9)`, `(24,-12)`. Magi er deres svaghed. Sværd er
   bedst mod slim, bue mod krystaldyr. Lumen hjælper med lysprojektiler.
5. Mosgrotten `(-43,8)` → gennem nye sammenhængende rum til porten i rummet længst fra start → Brug → dybde 2 →
   Mosvogteren (150 liv, områdeslag). Den varsler en ring i 1,1 sekund; gå væk. Ved 45% liv kalder den to små hjælpere.
   Seglet gives ved sejr.
6. Spejlgrotten `(35,-32)` → dybde 2 → Krystalhjorten (185 liv, vifte med 5 krystalprojektiler; hold afstand og brug
   buen). En anden bossmekanik.
7. Kobberdybet `(-5,-45)` → dybde 2 → Den gamle vogter (235 liv, stor ring og hjælpere; magi er særlig effektiv).
8. Efter hver sejr opstår en tydelig udgang ved bossen; indgangsrummet har også altid udgang til øen. Bring tre segl til
   Stjerneporten `(0,-58)`, Brug. Se slutdialogen og fortsæt fri udforskning.

Der er 8 egentlige opgaver med engangsbelønninger og niveau. Opgaver må tages i fri rækkefølge; porten kræver præcis tre
bossegl. Død sender spilleren hjem med alt opgavefremskridt, udstyr og segl bevaret; 10 kobber bruges på hjemrejsen. Liv
regenererer langsomt uden kamp. Mira kan hele gratis. Eliksirer og opgraderinger understøtter gennemførelse.

## Kontrol og mobil

- WASD eller pile: gå i kameraets retning. Mus klik / mellemrum: angrib. Højre musetræk: kamera. 1/2/3: sværd/bue/magi.
  E: Brug. Q: eliksir. I: taske. Esc: pause.
- Tablet/telefon: venstre joystick, højre drag drejer kameraet, op/ned-drag ændrer afstand. Store Slå/Skyd/Kast lys og Brug;
  separate våben og eliksirknap. Touch sigter på nærmeste fjende. Alle menuer, opgaver og slutmålet kan betjenes med
  touch alene. Intet Pointer Lock.
- Mobil: DPR højst 1,4, ingen skyggekort, instanser til statiske gentagelser, fjender langt væk skjules. Desktop DPR
  højst 1,8 og ét 1024-skyggekort. Ingen CDN eller importmap.
- Lyd er selvskabte WebAudio-toner efter interaktion. Mute gemmes.

## Synlige angreb og frivillig øveplads

Sværdet følger højre hånd i to skiftende fejninger. Buen holdes i venstre hånd, mens højre hånd trækker strengen med
en synlig pil. Pilen frigives fra nokken; magien kommer fra stavens løftede krystal. Tilløb, faktisk ramning og
afslutning bruger samme forløb, så skade og skud først udløses ved bevægelsen. Våbnenes oprindelige pauser og skader
bevares. Skift, rejse og død afbryder ufærdige angreb; pause fryser dem. Knappen viser handling, status og tid til klar.

Kameraet starter tættere på (afstand 20) og kan trækkes/rulles ind til 10 for at se figuren. På øvepladsen syd for
brønden står skiver ved `(-3,12)`, `(0,13)` og `(3,12)`: brug henholdsvis sværd, bue og magi. Autosigte hjælper på
touch eller kampknappen; klik kan sigte direkte. Brug / E ved `(0,10)` viser råd og nulstiller en fuldført runde.
Første fuldførelse giver 25 kobber og 15 erfaring. V1-feltet `træning` husker engangsbelønningen; ældre saves får false.
Øvelsen er valgfri og ændrer ikke de otte opgaver. Skiverne nulstilles ved områdeskift; belønningen bevares.

`blender/tre-verdener/krystaljaegerne/kamp.py` og `kamp.blend` er kilderne til fem originale modeller i
`modeller/kamp.glb` (113 KB): sværd, bue, pil, stav og træningsskive. `kampfigur.js` tilføjer skulder-/albueled på
den eksisterende figur. Ansigts- og kappedetaljer vendes lokalt mod spillets −Z uden at ændre de gamle modeller.
De faktiske GLB'er testes for håndkontakt, slipsted, sværdets bevægelse og mange poser uden drift. Integrationstests
afprøver de faktiske kampfunktioner, bevægelse, sigtelinjer, udstyr, afbrydelser og magiens flyvebane.

Ren visuel prøve: `server/tests/krystal-kamp-modelvisning.html` viser model, sværdslag, bue/pil og stav uden spil,
voksenlås eller gemninger. Den erstatter ikke en manuel gennemspilning af eventyret.

## Skatte og synlige genstande

Skattekistens låg åbner på et hængsel, og mønter og den faktisk modtagne eliksir løfter sig ud af kisten.
En lyskrystal bliver vist som en facetteret, lysende Blender-genstand; de tre bossegl får samme tydelige fundforløb.
Genstandskortet viser navne og antal. Hurtige fund sættes i en afgrænset kø, så kisteindhold ikke forsvinder ved
det næste krystalfund. Kortet blokerer ingen fingerknapper. Pause fryser tiden; områdeskift rydder midlertidige fund.

Belønningerne er uændrede: krystal giver 3 kobber og op til 16 energi, kiste giver 18 kobber, 15 erfaring og op til
én eliksir. Eliksirgrænsen er stadig 99; en fuld taske viser ingen fiktiv eliksir. Når en opgave samtidig fuldføres,
medregnes dens ekstra kobber/erfaring og genopfyldning forklares. Samme fund-id kan kun belønnes én gang.
Rejsetaskens billeder viser den aktuelle beholdning af kobber, eliksirer og segl. Lyskrystallernes felt viser 8-krystalopgaven,
da krystallens lys bruges ved indsamlingen. Der er ingen ny gemmeversion eller ændring af gamle rejser.

`blender/tre-verdener/krystaljaegerne/fund.py` og `fund.blend` bygger `modeller/fund.glb` med kiste, krystal,
kobbermønt, eliksir og segl. Egne SVG-genstande gør kortet let på telefonen. Rolige effekter og systemets valg om
mindre bevægelse slår rotation og glimt fra. Ren komponentprøve: `server/tests/krystal-fund-modelvisning.html`.

## Gemning og kontrol

`krystaljaegerne-rejse-v1` i localStorage gemmer hvert 5. sekund, ved regioner, belønning, pause og sideskift. Fortsæt
validerer version, tal/ranges, våben, opgave-IDs, besøg, unikke indsamlings-IDs og dungeonkoordinater. En igangværende
grotte bevarer sit frø; et nyt besøg får nyt frø. Ny rejse kræver bekræftelse, hvis der allerede er en gemning.

Fra repository root:

```
node --test spil/krystaljaegerne/eventyr.test.mjs
node --test spil/krystaljaegerne/ydelse.test.mjs
node --check spil/krystaljaegerne/spil.js
node --check spil/krystaljaegerne/verden.js
```

Testene dækker 1.200 dungeon layouts med åbne forbindelser, seedgenoprettelse, nybesøg, savevalidering, alle opgaver,
våbensvagheder, sværdets retningsområde, udstyr og eliksirer.

## Blender

`../../blender/tre-verdener/krystaljaegerne/byg.py` bygger hele originalbiblioteket, eksporterer `modeller/eventyr.glb`,
gemmer `.blend` og renderer `forside.jpg`. 22 modeller: eventyrer, følgesvend, tre fjendetyper, tre våben,
hus/tårn/brønd, to træer/klippe/krystaller, søjle/ruinbue, kiste/portal, gulv/væg/terræn. Karakterdele har navne, der
animeres ved bevægelse i spillet. Ingen eksterne kunstassets.

## Detaljer og vejvisning

Den første rejse har nu fire korte trin, som kan skjules og genåbnes i Indstillinger. Gyldne pile i verden viser et
åbent næste skridt. I grotter beregnes en korteste vej gennem rumforbindelserne; på øen går sporet rundt om brønd og
bygninger. Beroligede vogtere vælges ikke som mål.

Rejsekort / M åbner et større nordvendt kort med områdenavne, landmærker, skatte, krystaller, levende vogtere og en
gylden rute. Et sted kan vælges som eget spor. `Følg næste opgave` vender tilbage til opgaveforløbet. Kort, taske, hjælp
og indstillinger pauser både kampen og holdte fingre/taster.

Hold Angrib eller mellemrum for gentagne angreb. Autosigte vælger en levende fjende med fri sigtelinje og holder roligt
fast på et relevant mål. Følgesvenden vælger også synlige mål. Vægge stopper projektiler langs hele flyvesegmentet, også
ved lav billedfrekvens. Kampfeltet viser fjendenavn, liv, våbensvaghed og en tekstvarsling for slag/krystalvifte.
Skadetal og automatisk kobber/erfaring vises ved figuren. Efter en boss bliver udgangen en rigtig Blender-port.

Indstillinger: autosigte, gylden vejviser, rolige effekter og kameraets følsomhed. Valgene gemmes i den eksisterende
v1-rejse. Gamle saves uden disse felter får sikre standarder; krystaller/kister, segl, udstyr, position og igangværende
grotte bevares. `Kun i denne åbne fane` vises ærligt, hvis browseren afviser lageret; samme lagerfejl giver ikke nye
advarsler hvert femte sekund.

Alle handlinger har synligt tastaturfokus. Dialoger har læserolle og fokus vender tilbage til den åbnende knap; Tab
holdes inden for den åbne dialog. Titlen får synligt fokus øverst, også når kortet eller tasken er lang. Touchknapper er
mindst 44 px, og kameraets drej/afstand glider blødt mod fingerens mål. På korte telefoner viser målfeltet en kort
tekst; den fulde opgave kan læses på Rejsekortet. En belønningsbesked har kortvarigt prioritet over den genåbnede guide,
så hverken mål, Brug-prompt eller handlingsknapper dækkes. Uændret gemt-status og kamptekst genoplæses ikke hver frame.

Det nye `modeller/detaljer.glb` indeholder 13 Blender-modeller: lanterne, vejviser, bænk, markedsvogn, lejr, svampe,
blomster, faldet stamme, ruintavle, statue, grottepille, lyssøjle og havn. De deles som instanser. De tre grotter har
forskellige farver og rekvisitter. `blender/tre-verdener/krystaljaegerne/detaljer.py` og `.blend` er kilderne;
`forside-detaljer.py` og `.blend` renderer forsiden med de samme modeller.

Nye lokale runtimefiler: `navigation.js`, `kort.js`, `lagring.js`, `styring.js`. De skal pakkes/offline-caches sammen
med resten af spillet. Regressionstestene dækker også gammel v1-migration, synlige/døde autosigtemål, åbne ruter i 200
grotter, omvej om øens huse/brønd, projektiler gennem tynde vægge og ærlig lagerstatus.

Vejvisningen kontrollerer hele startbenet, alle gridkanter og hele slutbenet. En kort, fri genvej til næste punkt
fjerner en allerede nået pil; afstanden regnes fra den faktiske position. Den uafhængige kontrol over 25 øfrø gav 7.160
ruter uden blokerede stræk. Kollisioner bruger lokale felter, sammenlignet med den oprindelige beregning i 40.000
positioner. Et træ må ikke fastholde en opgavevogter; dens ID bevares, mens dens spawn flyttes en smule til fri plads.
Gamle skatte beholder deres positioner, og ruten ender på et frit sted inden for Brug-afstand.

Fortsæt efter en bossejr genskaber udgangen ved målrummet. Dialoger slipper både pointers og taster; browserens gentagne
W/Space tager ikke en sluppet tast igen. Målringen og det næste automatiske angreb bruger samme stabile fjende. Genåbnet
vejledning venter på nye skridt fra stedet, hvor spilleren åbner den. Disse konkrete tilfælde er dækket af de 30
regressionstests. En særskilt prøve fjerner `structuredClone`, så ældre Safari fortsat kan kopiere, gemme og genoptage
en JSON-rejse uden at dele mutable data. En fejl ved modelindlæsning sender `spil-3d-fejl` til det fælles fejlskærmslag.

Start og åbne dialoger tegner højst 20 billeder/s; en skjult fane tegner intet. Den faktiske framefunktion afprøves separat for pause, skjult fane og genoptagelse uden gammel frame-tid. Aktiv bevægelse og kamp beholder hver frame.
