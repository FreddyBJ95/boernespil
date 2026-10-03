# Skrotstorm

Et selvstændigt 3D-køre- og byggeeventyr i voksenrummet. Verdenen er cirka 900 × 840 meter, med seks sammenhængende ruter, en industriby, skrotplads, den blå garage, solstation, to ramper, en høj bro og et bjergpas op til 72 meter. Tre egne Blender-biler har forskellige køreegenskaber og fire animerede hjul hver.

Spillet har ingen konti, betaling, eksterne tjenester eller kopierede aktiver. Det bruger lokale Three.js/GLTFLoader ES-moduler i `../3d-faelles/`. Voksenlåsen deles med spilkassen. Fremgangen gemmes i `skrotstorm-v1` i localStorage, valideres ved indlæsning og nulstilles kun efter en tydelig bekræftelse.

## Styring

PC: WASD eller piletaster. W/↑ giver gas, S/↓ bremser og bakker, A/D eller ←/→ styrer. Mellemrum er håndbremsen, Shift er nitro, R gensætter bilen på nærmeste vej og Escape pauser. Kameraet følger bilen uden Pointer Lock.

Telefon/tablet: hold de store venstre/højre pile og GAS. BAK, brems (■) og nitro (⚡) kan holdes samtidig med styringen. Alle missioner kan gennemføres med touch alene. Portrait og landscape har kompakt HUD, nordvendt kort, retningspil og afstand til næste mål. Garage-menuen kan gratis hente bilen tilbage til garagen, hvis den sidder fast eller man blot vil bygge videre. Genplacering mister hverken skrot eller opgaver.

Lyd: en stille motortone og korte klange skabes med WebAudio efter Start; knappen `Lyd` gemmer valget. Pause, hjælpevinduer og en skjult browserfane stopper bevægelsen og motortonen. Mobilbudget: pixelratio højst 1,4, ingen skygger ved coarse pointer/små skærme, ét støvmesh og 35 partikler. Statiske Blender-dele er samlet pr. materiale.

## De otte missioner

Koordinater står som `(x, højde, z)` i meter. Kortet er nordvendt: nord er negativ z, øst positiv x. Tilgængelige veje kan altid ses på kortet.

| Opgave | Mål og betingelse | Belønning |
| --- | --- | --- |
| 1. Tre gode fund | Skrotplads: `(-285,0,-176)`, `(-269,0,-201)`, `(-301,0,-203)`. Saml hver del inden for 8 m. Fra garage kør nord ad vestre del af Ørkenringen. | 65 |
| 2. Fabrikken vågner | Lever de automatisk lastede dele ved `(-17,0,-197)`. Brug Fabriksvejen mod øst. | 75 |
| 3. Ørkenens kurér | Fem porte i rækkefølge: `(-170,0,-128)`, `(-90,0,-40)`, `(-170,0,80)`, `(-275,0,220)`, `(-155,0,265)`. Første port starter 100 sekunders timer; ved timeout nulstilles portene. | 90 |
| 4. Signalet på toppen | `(+330,72,+45)`. Følg Ørkenringen mod øst fra fabrikken, så op ad bjergpasset. Man skal være på den høje vej; samme x/z på dalens gulv tæller ikke. | 100 |
| 5. Sand over kløften | Stor rampe: `(+75,0,-29)`. Kør vest→øst ad Stuntvejen med mindst 55 km/t, helst nitro. En rigtig flyvetur på mindst 0,55 sek. og efterfølgende landing kræves. Bare at besøge rampen tæller ikke. | 100 |
| 6. Lys i støvet | Lever det automatisk lastede batteri til solstationen `(-110,0,190)`. | 110 |
| 7. Broens hemmelighed | Besøg tre signaler i rækkefølge: `(-30,0,75)`, `(80,12,100)`, `(160,27,220)`. Følg Brovejen fra vest mod øst; højdekontrollen kræver, at man kører på broen. | 120 |
| 8. Skrotstormens hjerte | Lever stormlygten til `(+330,72,+45)` via bjergpasset. Den sidste opgave tænder et synligt varmt lys over tårnet og viser afslutningen. Derefter fri kørsel. | 200 |

Ved besøg/levering/port kræves afstand under 14 m og højdeforskel under 6 m. Reservedele er gule tandhjul, andre mål er blå lysporte. HUD/pil/kort skifter automatisk til næste del/port/opgave.

## Garage og fysik

Garagepunkt: `(-275,0,220)`. Opgraderinger og bilvalg er aktive inden for 60 m. Ellers kan man trykke `Hent bilen til garagen`. Rustrotten er let/hurtig, Sandloppen har mere greb, Jernoksen er langsommere og stabil. Alle tre biler kan vælges frit.

Motorens tre niveauer giver større trækkraft og højere topfart. Hjulene giver mere greb, højere fartgrænse og lavere modstand i sand. Nitro øger faktisk acceleration/fartgrænse og får længere varighed/hurtigere genopladning ved opgradering. Skrot kan kun bruges, hvis saldoen dækker næste niveau. Kampagnen giver 860 skrot; alle ni forbedringer koster 600.

Fysikken kører med faste trin på 1/60 sek., følger vejenes højder, påvirkes af underlag og stigninger, har inerti ved sving/håndbremse, fysisk tyngdekraft ved hop og sikre landinger. Støttefladen afhænger af bilens eksisterende højde: man kan køre under broen uden at blive løftet op på dækket, og dækket nås gennem de fysiske opkørsler. Bygningers kollisionszoner skubber bilen fri. De høje brovejes rækværker afviser bilen ved kanten. Verdenskanten er en blød barriere. Ingen helbredsmåler, vold eller blod.

## Modeller og genskabelse

`blender/tre-verdener/skrotstorm/byg-skrotstorm.py` er den reproducerbare kilde. `skrotstorm.blend` indeholder hele landskabet, de tre biler, lys og poster-kamera. Scriptet bruger ingen downloadede assets.

Eksporterne er `modeller/oerken.glb` (terræn, vejnet, bro-/bjergrækværk, garage/kran, fabrikker/siloer, solpaneler, stormtårn, ramper og små props) og `rotten.glb`, `buggy.glb`, `truck.glb`. Separate hjul hedder `hjul_for_venstre`, `hjul_for_hoejre`, `hjul_bag_venstre`, `hjul_bag_hoejre`; de drejer/ruller i spillet. Modellerne er cirka 2,42 MB tilsammen. `forside.jpg` er et 1280 × 720 Blender-render.

Genskab fra repositoryets rod med Blender 5.2:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --threads 2 --python blender/tre-verdener/skrotstorm/byg-skrotstorm.py
```

## Kontroller

```powershell
node spil/skrotstorm/tests.mjs
node --check spil/skrotstorm/spil.js
node --check spil/skrotstorm/fysik.js
node --check spil/skrotstorm/fremgang.js
node --check spil/skrotstorm/missioner.js
node --check spil/skrotstorm/styring.js
node --check spil/skrotstorm/lyd.js
```

Tests afprøver korrupte gemmefiler, økonomi, faktiske motor-/hjul-/nitrotal, bygningskollision, en bil under og oven på broen, faktisk kørsel op ad bro-/bjergvejene, ægte hop og landing, bremse/styring samt alle otte missioners afstand/højde/port/timer/stunt/slutmål. Den fysiske bjergtur og rampeflyvning prøves også direkte mod deres missionregler. Browserprøven skal derudover afprøve lås, Start/Fortsæt, lyd/mute, bilvalg/opgraderinger, hjælp, redning, pause/genstart og touch på både portrait og landscape. Tests kan afvikles i Node 22+; den lokale `package.json` markerer rene ES-moduler.
