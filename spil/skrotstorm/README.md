# Skrotstorm

Et selvstændigt 3D-køre- og byggeeventyr i voksenrummet. Verdenen er cirka 900 × 840 meter, med seks sammenhængende ruter, en industriby, skrotplads, den blå garage, solstation, to ramper, en høj bro og et bjergpas op til 72 meter. Tre egne Blender-biler har forskellige køreegenskaber og fire animerede hjul hver. En rolig depotbil kører gennem industrikvarteret, tre vindrotorer drejer, og garagen har et åbent værksted med værktøj, reservedele, kompressor, servicepumpe og solsejl.

Spillet har ingen konti, betaling, eksterne tjenester eller kopierede aktiver. Det bruger lokale Three.js/GLTFLoader ES-moduler i `../3d-faelles/`. Voksenlåsen deles med spilkassen. Fremgangen gemmes i `skrotstorm-v1` i localStorage, valideres ved indlæsning og nulstilles kun efter en tydelig bekræftelse.

## Styring

PC: WASD eller piletaster. W/↑ giver gas, S/↓ bremser og bakker, A/D eller ←/→ styrer. Mellemrum er håndbremsen, Shift er nitro, R gensætter bilen på nærmeste vej og Escape pauser. Kameraet følger bilen uden Pointer Lock. Indstillinger tilbyder også bred udsigt og kamera fra motorhjelmen.

Telefon/tablet: hold de store venstre/højre pile og GAS. Indstillinger tilbyder et touchrat: træk fingeren vandret på rattet, mens en anden finger holder GAS. BAK, brems (■) og nitro (⚡) kan holdes samtidig med styringen. Alle missioner kan gennemføres med touch alene. Portrait og landscape har kompakt HUD, nordvendt kort, retningspil og kørselsafstand til næste mål. GPS følger vejnettet og det aktuelle højdeplan; blå vejvisere tegnes i ét instansmesh. Tryk på kortet for et større kort og hele opgavens beskrivelse. Køreskolen vises første gang, kan lukkes straks og genåbnes i indstillinger. Alle dialoger standser bilen, rydder holdte input, holder Tab-fokus inde i dialogen og giver fokus tilbage ved lukning. Garage-menuen kan gratis hente bilen tilbage til garagen, hvis den sidder fast eller man blot vil bygge videre. Genplacering mister hverken skrot eller opgaver.

Lyd: en stille motortone, varmt ørkensus og korte klange skabes med WebAudio efter Start; knappen `Lyd` gemmer valget. Pause, hjælpevinduer og en skjult browserfane stopper bevægelsen og motortonen. Indstillingerne for kamera, grafik, touchrat/pile, styrefølsomhed, lydstyrke og GPS valideres og gemmes kun ved ændringer. Mobilbudget ved Auto/Let: pixelratio højst 1 og ingen skygger, ét støvmesh med 35 partikler. Flot kan vælges til kraftigere enheder. Statiske Blender-dele er samlet pr. materiale, verdenen har 17 primitive draw calls inklusive tre rotorer. Depotbilen genbruger truck.glb og venter på spilleren.

## De otte missioner

Koordinater står som `(x, højde, z)` i meter. Kortet er nordvendt: nord er negativ z, øst positiv x. Tilgængelige veje kan altid ses på kortet.

| Opgave | Mål og betingelse | Belønning |
| --- | --- | --- |
| 1. Tre gode fund | Skrotplads: `(-285,0,-176)`, `(-269,0,-201)`, `(-301,0,-203)`. Saml hver del inden for 8 m. Fra garage kør nord ad vestre del af Ørkenringen. | 65 |
| 2. Fabrikken vågner | Lever de automatisk lastede dele ved `(-17,0,-197)`. Brug Fabriksvejen mod øst. | 75 |
| 3. Ørkenens kurér | Fem porte i rækkefølge: `(-170,0,-128)`, `(-90,0,-40)`, `(-170,0,80)`, `(-275,0,220)`, `(-155,0,265)`. Første port starter 100 sekunders timer; ved timeout nulstilles portene. | 90 |
| 4. Signalet på toppen | `(+330,72,+45)`. Følg Ørkenringen mod øst fra fabrikken, så op ad bjergpasset. Man skal være på den høje vej; samme x/z på dalens gulv tæller ikke. | 100 |
| 5. Sand over kløften | Stor rampe: `(+75,0,-29)`. GPS viser først tilløbet ved (28,0,-34). Kør vest→øst ad Stuntvejen med mindst 55 km/t, helst nitro. En rigtig flyvetur på mindst 0,55 sek. og efterfølgende landing kræves. Bare at besøge rampen tæller ikke. | 100 |
| 6. Lys i støvet | Lever det automatisk lastede batteri til solstationen `(-110,0,190)`. | 110 |
| 7. Broens hemmelighed | Besøg tre signaler i rækkefølge: `(-30,0,75)`, `(80,12,100)`, `(160,27,220)`. Følg Brovejen fra vest mod øst; højdekontrollen kræver, at man kører på broen. | 120 |
| 8. Skrotstormens hjerte | Lever stormlygten til `(+330,72,+45)` via bjergpasset. Den sidste opgave tænder et synligt varmt lys over tårnet og viser afslutningen. Derefter fri kørsel. | 200 |

Ved besøg/levering/port kræves afstand under 14 m og højdeforskel under 6 m. Reservedele er gule tandhjul, andre mål er blå lysporte. HUD/pil/kort skifter automatisk til næste del/port/opgave.

## Garage og fysik

Garagepunkt: `(-275,0,220)`. Opgraderinger og bilvalg er aktive inden for 60 m. Ellers kan man trykke `Hent bilen til garagen`. Rustrotten er let/hurtig, Sandloppen har mere greb, Jernoksen er langsommere og stabil. Alle tre biler kan vælges frit.

Garagen viser bilernes faktiske topfart/greb, nuværende sandfart/nitro og før→efter for næste forbedring. På smalle telefoner er bilvalg brede rækker. Motorens tre niveauer giver større trækkraft og højere topfart. Hjulene giver mere greb, højere fartgrænse og lavere modstand i sand. Nitro øger faktisk acceleration/fartgrænse og får længere varighed/hurtigere genopladning ved opgradering. Skrot kan kun bruges, hvis saldoen dækker næste niveau. Kampagnen giver 860 skrot; alle ni forbedringer koster 600.

Fysikken kører med faste trin på 1/60 sek., følger vejenes højder, påvirkes af underlag og stigninger, har inerti ved sving/håndbremse, fysisk tyngdekraft ved hop og sikre landinger. Støttefladen afhænger af bilens eksisterende højde: man kan køre under broen uden at blive løftet op på dækket, og dækket nås gennem de fysiske opkørsler. Bygningers kollisionszoner skubber bilen fri. De høje brovejes rækværker afviser bilen ved kanten. Verdenskanten er en blød barriere. Ingen helbredsmåler, vold eller blod.

## Modeller og genskabelse

`blender/tre-verdener/skrotstorm/byg-skrotstorm.py` er den reproducerbare kilde. `skrotstorm.blend` indeholder hele landskabet, de tre biler, lys og poster-kamera. Scriptet bruger ingen downloadede assets.

Eksporterne er `modeller/oerken.glb` (terræn, vejnet, bro-/bjergrækværk, garage/kran, fabrikker/siloer, solpaneler, stormtårn, ramper og små props) og `rotten.glb`, `buggy.glb`, `truck.glb`. Separate hjul hedder `hjul_for_venstre`, `hjul_for_hoejre`, `hjul_bag_venstre`, `hjul_bag_hoejre`; de drejer/ruller i spillet. Modellerne er cirka 4 MB tilsammen. `forside.jpg` er et 1280 × 720 Blender-render.

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
node --check spil/skrotstorm/gps.js
node --check spil/skrotstorm/indstillinger.js
node --check spil/skrotstorm/brugerflade.js
node --check spil/skrotstorm/liv.js
```

Tests afprøver korrupte gemmefiler, økonomi, faktiske motor-/hjul-/nitrotal, bygningskollision, en bil under og oven på broen, faktisk kørsel op ad bro-/bjergvejene, ægte hop og landing, bremse/styring samt alle otte missioners afstand/højde/port/timer/stunt/slutmål. Den fysiske bjergtur og rampeflyvning prøves også direkte mod deres missionregler. En ekstra testfører gennemkører hele GPS-kampagnen med gas og retning; fysikken alene flytter x/y/z gennem alle otte missioner, også ræs, rampen og slutleveringen. GPS-testene afprøver underbro/øvre dæk, højdebevidst redning, alle mål, v1-migrering, korrupte indstillinger, ændringsgemning og afvist lager. Depotbilens venten, pause og sikre kontakt er også dækket. Browserprøven skal derudover afprøve lås, Start/Fortsæt, lyd/mute, bilvalg/opgraderinger, hjælp, redning, pause/genstart og touch på både portrait og landscape. Tests kan afvikles i Node 22+; den lokale `package.json` markerer rene ES-moduler.

## Den forbedrede udgave

Fremgangen bruger fortsat skrotstorm-v1. Eksisterende spil bevarer alle opgaver, biler og opgraderinger. En valgfri sikker jordposition giver Fortsæt fra sidste placering. Gemmefejl vises ærligt; spillet kan stadig fortsætte i den åbne fane. Indstillinger ligger separat i skrotstorm-indstillinger-v1 og påvirker aldrig den gamle fremgang.

Verdenen indeholder desuden fire sideværksteder med tilsvarende kollisionszoner, lastepaletter, parkerede servicebiler, kaktusser og vejskilte. Siloen ved (-28,-236) er flyttet væk fra hovedvejen. De separate noder rotor_0 til rotor_2 har nulrotation og roterer om z i runtime. Den genbrugte depotbil har blød afvisning uden skade eller straf.

### Browserprøve

1. Start et nyt spil: køreskolen kan lukkes og genåbnes fra Pause → Indstillinger.
2. Tryk på minimap: læs opgaven på det store kort, se orange bil og sammenhængende blå rute.
3. Pause → Indstillinger: prøv alle tre kameraer, Let/Auto/Flot, pile/rat, følsomhed, lydstyrke og vejvisere. Genåbn spillet og kontroller, at valgene og den sikre position bevares.
4. Garage: sammenlign de tre karrosserier og se før/efter ved køb. Brug telefonens scroll; alle knapper er mindst 44 px.
5. Kør til Rustbyen; kontroller værkstedsfacader, vindrotorer, kaktusser og den ventende depotbil. Den flyttede silo spærrer ikke hovedruten.
6. Kør til broen fra dalen. GPS må ikke sende bilen gennem brodækket; Gensæt i dalen skal vælge en lav vej. Følg derefter fysisk opkørsel og bjergvej.
7. Spil otte opgaver med både tastatur og multitouch. Missionens belønningskort skal standse bilen og vise næste opgave. Opgave 5's tilløb skal føre mod øst.
8. Prøv afvist localStorage i en testprofil. Pause og startmenu skal sige, at browseren ikke kan gemme; kørsel skal stadig virke. Test også Tab/Shift+Tab, Escape, fokusretur og holdte input under en dialog.


De høje broer har nu portalrammer, undersidens kantbjælker og diagonale afstivninger. Klipper placeres uden for hele vejsegmenter, så dekorative sten aldrig står i den gennemgående kørebane. Reservedele bruger instanser til tandhjulstænderne (21 færre draw calls); pausemenuer renderer kun 20 billeder/s. Luftmodstanden er justeret, så alle tre biler kan opnå garagens farttal på motor0–3, verificeret i de faktiske fysiktrin. Forhjulenes rotationsrækkefølge holder deres akse vandret under rul og styring.

En skjult browserfane tegner intet. Den eksisterende frame-tid holdes frisk under pause og skjult fane; det er dækket af en isoleret regression af den faktiske framefunktion.


Stunt-HUD viser tilløb, nødvendig fart og tid i luften. Et kort eller forkert tilløb giver ét venligt råd efter landing og sender GPS tilbage til tilløbet. Et bestået stunt kommer mod øst over rampens høje ende; spilleren kan ikke klare det med et tilfældigt hop i nærheden. Alle tre biler gennemkører nu kampagnen fysisk i tests, både uden og med fulde forbedringer, og får 860 skrot. Garage forklarer manglende skrot og næste opgaves belønning; leveringer viser lasten i HUD og tårnbesøget viser højdefremdrift.
