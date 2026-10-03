# Det Sidste Lys

Et originalt, stille førstepersonseventyr til Voksenrummet. Ingen kamp, blod, forskrækkelser eller tidsgrænse. Otte sammenhængende kapitler på Lysø, fra Elins brev til det restaurerede fyr. Skumring/nat, en retningsbestemt fyrstråle og skjulte blå kyststen indgår i selve forløbet.

## Spil og styring

Åbn `spil/det-sidste-lys/index.html` via en HTTP-server. Voksenlåsen bruger den eksisterende `spil/laas.js`. Alle skrifter, modeller og biblioteker er lokale. Three.js r160 og GLTFLoader ligger i `spil/3d-faelles/`.

- PC: WASD/piletaster går, muse-drag ser omkring, Q/R drejer, E undersøger, M åbner kort, J dagbog og Esc pause. Shift går hurtigere. Pointer Lock bruges ikke.
- Tablet/telefon: fire store bevægelsesknapper til venstre, drag på landskabet for kamera, dedikeret Undersøg-knap til højre. Alle gåder, natkontrol, kort, galleri, pause og genstart kan bruges med touch alene.
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

**Hjælp:** “Et lille vink” giver næste trin og den præcise løsning, når man sidder fast. Dagbogen bevarer alle fundne fortællingsnoter og gådeledetråde. Øens gyldne markør viser det aktuelle mål og retter sig mod de endnu ikke indsamlede ravtræer.

## Originale Blender-kilder og optimering

Kilde: `blender/tre-verdener/det-sidste-lys/byg_o.py` og `det-sidste-lys.blend`. Generatoren bygger faktisk terræn, stier, åbent værkstedsinteriør, seks øvrige bygninger, fyrtårn med lanterne/galleri/rækværk, kaj, fiskerbåd, 80+ fyrretræer, rav, ruinhvælv/kompaslinse, grottekatedral/prisme/spejle, kystklipper, bøger, tønder, kasser, bænke, skilte, lamper og marehalm. Samme modeller renderes til den originale `forside.jpg`.

Kør fra repository-roden:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --threads 2 --python blender/tre-verdener/det-sidste-lys/byg_o.py
```

GLB er ca. 2.9 MB, ca. 30.000 trekanter, 27 materialer og ingen eksterne teksturer/buffere. Browseren bager statiske meshtransformer og samler dem efter materiale; kun rav, prisme, linse og lanternen bevares som separate interaktionsdele. Blender-koordinater spejles ved eksport, så øens matematiske terrænhøjde matcher Three.js' X/Z direkte.

Havets bløde bølger, himlens nat/skumring, stjerner, lysstråle og skjulte sten er egen Three.js-geometri og shaders omkring den importerede Blender-verden. På mobil deaktiveres skygger og kantudjævning; DPR begrænses til 1.3. PC begrænses til 1.75. Styringen virker uden Pointer Lock på Safari.

## Automatiske kontroller

```powershell
node spil/det-sidste-lys/logik.test.mjs
node spil/det-sidste-lys/navigation.test.mjs
node --check spil/det-sidste-lys/spil.js
node --check spil/det-sidste-lys/verden.js
node --check spil/det-sidste-lys/lyd.js
```

Tests går gennem det fulde forløb og kontrollerer kapitelrækkefølge, rav uden dobbelttælling, natkrav, fyrretning, korrekte/ukorrekte gådesvar, gemning/fortsættelse, ingen delte fremgangsarrays, beskadigede eller fremmede gemninger, uendelige koordinater og afvist browserlager.

Navigationstesten gennemløber de 5.595 forbundne gangfelter fra kajen og bekræfter, at alle seks steder og tre ravtræer kan nås, samt at værkstedsdøren faktisk kan passeres. Havnebassinet er sænket under vandet; ved start står kameraet 1,68 m over den synlige Blender-trækaj (Y=2,05), og nærmeste kystklippe er over 15 m væk.

Samme test kontrollerer alle 260 stjerners koordinater, deres radius og en faktisk Three.js-beregning af bounding sphere. Højdesamplingen holder sig strengt inden for enhedskuglen, så stjernebufferen er uden NaN.
