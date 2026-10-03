# Det Sidste Lys

Et originalt, stille førstepersonseventyr til Voksenrummet. Ingen kamp, blod, forskrækkelser eller tidsgrænse. Otte sammenhængende kapitler på Lysø, fra Elins brev til det restaurerede fyr. Skumring/nat, en retningsbestemt fyrstråle og skjulte blå kyststen indgår i selve forløbet.

## Spil og styring

Åbn `spil/det-sidste-lys/index.html` via en HTTP-server. Voksenlåsen bruger den eksisterende `spil/laas.js`. Alle skrifter, modeller og biblioteker er lokale. Three.js r160 og GLTFLoader ligger i `spil/3d-faelles/`.

- PC: WASD/piletaster går, muse-drag ser omkring, Q/R drejer, E undersøger, F vender mod næste mål, M åbner kort, J dagbog og Esc pause. Shift går hurtigere. Pointer Lock bruges ikke.
- Tablet/telefon: analog fingerpind til venstre, samtidig drag på landskabet for kamera og en dedikeret Undersøg-knap til højre. En halv pindbevægelse går langsommere. Fire pile kan vælges under Indstillinger. Hver hånd har sin egen pointer, og pause fjerner holdt input. Alle gåder, natkontrol, kort, galleri, pause og genstart kan bruges med touch alene.
- Første besøg får en kort styringsvejledning, som kan lukkes og genåbnes fra Hjælp. Den forsvinder også efter det første kapitel. Målkortets minus/plus giver mere plads til øen. “Se mod målet” vender kameraet mod næste manglende genstand.
- Indstillinger: kamerafølsomhed, reduceret bevægelse, tekststørrelse, grafik og touchstyring gemmes kun, når man ændrer dem. Reduceret bevægelse fjerner gangvuggen og det bevægelige slutkamera. Let grafik begrænser opløsning og slår skygger fra. Gamle v1-gemninger får sikre standardvalg; et nyt eventyr bevarer komfortvalgene.
- Måne/sol skifter straks mellem skumring og nat med en blød visuel overgang. Øen har altid nok lys til at finde vej.
- Økortet viser næste mål. Allerede besøgte steder kan bruges som hurtig tilbagevej. Nye steder skal udforskes først.
- Gemt fremgang, valideret før brug, ligger under `det-sidste-lys-v1`. Privat Safari / afvist localStorage giver tydelig status og et stadig spilbart eventyr. Genstart kræver en konkret bekræftelse.
- Naturlyd og musik er original WebAudio-syntese, som starter ved brugerens tryk. Lydknappen slår dem fra.

## Gennemførelsesrute til QA

Verdenskoordinater er Three.js X/Z (Y er højden). Nord er negativ Z. Begynd på kajen ved `(-25, 80)` og kig nordpå.

1. **Brev**: Rød postkasse `(-25, 73)`. Gå tæt på, Undersøg → Tag brevet → Videre. Brevet indeholder den næste låses præcise ledetråd.
2. **Kobbernøgle**: Landsbyen, værkstedets åbne dør `(7, 29)`. Undersøg → Gå ind. Du står fysisk inde i det Blender-modellerede rum ved `(7, 25.3)` og kan se bord, bøger, stol og vinduer. Undersøg låsen på bordet. Svar: **Faldende / III / Vest**. Nøglens næste ledetråd er **Ugle / Måne / Bølge**. Gå fysisk ud gennem døren, eller brug kortet til et besøgt sted.
3. **Tre ravdråber**: Skovens gamle træer står ved `(-46,-31)`, `(-54,-20)` og `(-35,-37)`. Undersøg hver. Rav tælles kun én gang pr. træ. Tredje dråbe fuldfører kapitel 3.
4. **Linse**: Kompasruinen `(-12,-62)`. Ringene fra yderst til inderst: **Ugle / Måne / Bølge**. Tag den frigivne linse.
5. **Strøm**: Fyrets røde kontrolbord `(32,-38)`. Ledninger: **Blå → Bølge / Grøn → Blad / Rød → Sol**. Linsen fæstnes med ravet, og lanternen vågner.
6. **Skjult sti**: Brug måneknappen (eller dialogens “Lad natten falde”). Åbn fyrets kontrolbord igen, vælg **Vest**, tryk **Tænd prøvelyset**. Dag eller forkert retning kan ikke fuldføre kapitlet. De blå sten dukker nu op fra ruinen ned langs skovens vestkyst.
7. **Prisme**: Gå til havgrotten `(-66,46)`. Grottens store klippehvælv kan udforskes fysisk. Om natten åbner spejlalterets gåde. Spejle starter i Nord; tryk **Sol én gang → Øst / Bølge tre gange → Vest / Stjerne to gange → Syd**. Saml spejlenes lys.
8. **Slutning**: Vend tilbage til fyrets kontrolbord `(32,-38)`, evt. med Økort → Det gamle fyr. Vælg **Sæt prismen i · tænd fyret**. Et seks sekunders panoramakamera viser den roterende stråle, derefter kommer Elins svar og afslutningsdialogen. “Bliv lidt på øen” lader spilleren udforske videre med al fremgang bevaret.

**Galleri:** Fyrets dialog har “Op på galleriet”. Spilleren går fysisk rundt på galleriets ring ved Y ≈ 35 og radius 3.5–4.7 omkring `(38,-44)`. Den dedikerede “Tilbage fra galleriet”-knap går ned til `(32,-35)`. Fyrets gåder kan også bruges deroppe. Gemning efter et besøg placerer spilleren sikkert ved foden.

**Hjælp:** “Et lille vink” begynder med en ledetråd, derefter kan man bede om et tydeligere vink og hele løsningen. Vinkniveau og valg på gådernes hjul gemmes; lukkes en uløst gåde, står hjulene samme sted næste gang. Et forkert svar angiver, hvor mange af de tre indstillinger der er rigtige. Dagbogen bevarer alle fundne fortællingsnoter og gådeledetråde. Øens gyldne markør, afstand og “Se mod målet” følger samme mål og vælger nærmeste endnu manglende ravtræ. Kortets tre ravprikker viser indsamlet og manglende rav; efter kapitel 6 tegnes også den blå kyststi.

**Valgfrie stednoter:** Fire små minder påvirker ingen af de otte kapitler. Redningsringen ved `(-21.5,69)`, havebogen ved `(-12,31)` og skovvarden ved `(-42,-18)` kan undersøges og lægges i dagbogen. Fyrets logbog findes automatisk første gang, man går op på galleriet. Fund tælles kun én gang og bevares ved fortsættelse.

**Supplerende UX-prøve:** Hold gå-pinden med én finger, drej med en anden, og slip hænderne i begge rækkefølger; den tilbageværende hånd skal fortsat virke. Åbn pause eller Indstillinger, mens en finger/tast holdes; spilleren skal stå stille, og gamle pointers må ikke flytte efter genoptagelse. Prøv større tekst i alle gåder, og skift mellem fingerpind og pile. Indstil tidevandslåsen delvist, luk den, genindlæs og fortsæt; hjulene og kapitelrækkefølgen skal være bevaret. Bekræft et nyt eventyr; fremgangen skal være nulstillet, mens tekst/kamera/lydvalget består.

## Originale Blender-kilder og optimering

Kilde: `blender/tre-verdener/det-sidste-lys/byg_o.py` og `det-sidste-lys.blend`. Generatoren bygger faktisk terræn, stier, åbent værkstedsinteriør, seks øvrige bygninger, fyrtårn med lanterne/galleri/rækværk, kaj, fiskerbåd, 80+ fyrretræer, rav, ruinhvælv/kompaslinse, grottekatedral/prisme/spejle, kystklipper, bøger, tønder, kasser, bænke, skilte, lamper og marehalm. Den detaljerede ø har også fortøjningsreb, net, redningsring, blomsterpotter/urtehave, varder og fyrlogbog. En original måge med særskilte vinger eksporteres til `maage.glb` og genbruges i få kloner. Samme ø renderes til den originale `forside.jpg`.

Kør fra repository-roden:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --threads 2 --python blender/tre-verdener/det-sidste-lys/byg_o.py
```

Øens GLB er ca. 3.9 MB, 40.479 trekanter, 30 statiske materialebatches og ingen eksterne teksturer/buffere. Mågen er 24 KB / 184 trekanter. Browseren bager statiske meshtransformer og samler dem efter materiale; kun rav, prisme, linse, lanterne, spejle og den svajende båd bevares som særskilte dele. Mågernes geometri/materialer deles mellem kloner, og kystens 35 lyssten bruger ét instansmesh. Blender-koordinater spejles ved eksport, så øens matematiske terrænhøjde matcher Three.js' X/Z direkte. Skiltenes egne bogstaver er optimerede meshflader; plantefelter, årer, havnestige og kopper deler de eksisterende materialer.

Havets bløde bølger, himlens nat/skumring, stjerner, lysstråle og skjulte sten er egen Three.js-geometri og shaders omkring den importerede Blender-verden. Træer/urter bevæger sig let i vinden; skovens små natlys følger rolige baner. På mobil deaktiveres skygger og kantudjævning; automatisk grafik begrænser DPR til 1.1, Flot til 1.3. PC begrænses til 1.75. Styringen virker uden Pointer Lock på Safari.

## Automatiske kontroller

```powershell
node spil/det-sidste-lys/logik.test.mjs
node spil/det-sidste-lys/navigation.test.mjs
node spil/det-sidste-lys/styring.test.mjs
node --test spil/det-sidste-lys/ydelse.test.mjs
node --check spil/det-sidste-lys/spil.js
node --check spil/det-sidste-lys/verden.js
node --check spil/det-sidste-lys/lyd.js
```

Tests går gennem det fulde forløb og kontrollerer kapitelrækkefølge, rav uden dobbelttælling, natkrav, fyrretning, korrekte/ukorrekte gådesvar, gemning/fortsættelse, gamle gemninger, validerede komfortvalg, gemte gåder, valgfrie fund uden kapitelændring, ingen delte fremgangsarrays, beskadigede eller fremmede gemninger, uendelige koordinater og afvist browserlager. Fingerstyring testes for samtidige hænder, ejerskab, langsom/diagonal gang, dødt felt, slip i begge rækkefølger og nulstillet pauseinput.

Navigationstesten gennemløber de 5.595 forbundne gangfelter fra kajen og bekræfter, at alle seks steder og tre ravtræer kan nås, samt at værkstedsdøren faktisk kan passeres. Havnebassinet er sænket under vandet; ved start står kameraet 1,68 m over den synlige Blender-trækaj (Y=2,05), og nærmeste kystklippe er over 15 m væk.

Samme test kontrollerer alle 260 stjerners koordinater, deres radius og en faktisk Three.js-beregning af bounding sphere. Højdesamplingen holder sig strengt inden for enhedskuglen, så stjernebufferen er uden NaN. Skovlysbufferen kontrolleres også efter ti timers simulation, og alle tre fysiske stednoter kan nås fra kajen. De 35 instanser af kyststen kontrolleres for endelige matricer, en sammenhængende rute og gangafstand til hvert lys. Galleri-save testes særskilt: den gemte fil lander ved fyrfoden, men den levende position ændres ikke ved pagehide/browsertilbage.

Let/automatisk mobilgrafik beholder håndlys og fyrlys, men bruger kun de to nærmeste lanternelys og ingen ekstra spotlight. Fyrkeglen og modellernes glød bevares; Flot genskaber alle lys. Start, pause og dialoger tegner højst 20 billeder/s, og en skjult fane tegner intet. Ydelsestesten kontrollerer de faktiske kvalitetsvalg, lysets sceneantal, frisk frame-tid ved genoptagelse og fuld billedfrekvens under aktiv gang.
