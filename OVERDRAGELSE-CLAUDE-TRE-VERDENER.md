# Krystaljægerne: synlige våben og frivillig øveplads

4. oktober 2026: ejeren har bedt Codex udvikle Krystaljægerne videre med synlige sværdslag og bue/pil.
Arbejdet ligger isoleret på `codex/krystal-kamp`; Claudes fælles checkout og igangværende Sigtekorn-filer bevares.

- Ny original Blender-pakke `kamp.glb` med sværd, bue, pil, stav og træningsskive, samt `kamp.py`/`kamp.blend`.
- Håndfæstede våben, skulder/albueled, to skiftende sværdslag, rigtig buestreng/nokket pil og synligt stavløft.
  Skud/ramning sker ved animationens slip. Sigte følger målet under tilløbet; magi flyver fra krystallen mod målhøjde.
- Frivillig øveplads syd for brønden: tre skiver kræver hvert sit våben, første runde giver 25 kobber og 15 erfaring.
  V1-feltet `træning` bevarer engangsbelønningen; gamle saves fortsætter uden ændrede opgaver.
- Kampknappen viser Slå/Skyd/Kast lys og en rolig tidsmåler. Kameraet starter tættere og kan zoome ind til afstand 10.
- 88 spilprøver og 140 serverprøver består lokalt. GLB-rig og de faktiske kampfunktioner er omfattet.
- Chrome-modelprøve viser de faktiske våben; isoleret HUD kontrolleret ved 320×566 og 740×370.
  Ingen browserfejl under modellernes indlæsning. Fysisk iPad/Safari er ikke tilsluttet.
- Manuel gennemspilning bag voksenlåsen mangler stadig: den eksisterende kode er efterspurgt, ikke gættet eller ændret.

Klar til pull request, server-v0.5.6 og opdatering af Pi efter grønne pakkeprøver. Udgivelsen er endnu ikke udført.
README i Krystaljægerne beskriver styring, øveplads, gemning og afprøvning.
Den tidligere afsluttede udgivelse 0.5.5 og dens kontrolresultater følger nedenfor som historik.

---
# Afsluttet: tre forbedrede 3D-spil, udgivet og installeret på Pi

4. oktober 2026. Gennemgangen begyndte kl. 00:33 dansk tid og blev afrundet kl. 02:33 efter to timer.
Codex har lavet flere Blender-detaljer og forbedret brugeroplevelsen. Spillene ligger stadig i voksenrummet med rolig
mystik og uden blod, og styringen er lavet til pc, tablet og telefon.

## Hvad er forbedret

- Det Sidste Lys: havn, have og landsby med flere originale Blender-detaljer, animerede måger,
  fire valgfrie stednoter, analog fingerpind, større tekst, foldbart mål og trinvise gådevink.
- Skrotstorm: åbne værksteder, flere bro-/vejdetaljer og en rolig depotbil; GPS følger vejnettet,
  rampen forklares under kørslen, og garagen viser de reelle gevinster ved opgraderinger.
  Kamera, grafik, lyd og touchrat/pile huskes. Lange hjælpevinduer åbner nu øverst.
- Krystaljægerne: 13 Blender-landmærker, rejsekort, gyldent spor, stabilt autosigte,
  våbenråd og bossvarsler. Vogtere og grotter har sikre ruter, og små skærmes beskeder overlapper ikke.
- Alle tre: bevaret v1-fremgang, tydelig besked hvis browseren ikke kan gemme, bedre fokus og
  samtidig fingerstyring, skærmudskæringer respekteres, lydfejl stopper ikke spillet.
  Skjulte faner tegner intet, og menuer begrænser tegningen til 20 billeder/sekund.
- Fælles opstart kan genprøves ved manglende modeller/import eller tabt WebGL-kontekst.
  Offline-cache v67 gemmer ikke fejlsvar og rydder kun gamle Spilkassen-cacher.

## Udgivelse og hjemmets server

Forbedringer: PR #6. Korrekt HEAD-filstørrelse: PR #7. Den sidste menujustering: PR #8.
Alt er flettet gennem pull requests; der er ikke pushet direkte til main.
Den endelige pakke er server-v0.5.5, commit `9b50ac9942c32d71c174c5e55264f3eeb70bdcbb`, med Windows, Mac Intel/Apple Silicon
og Linux x64/ARM64 samt checksums:
https://github.com/FreddyBJ95/boernespil/releases/tag/server-v0.5.5

Pi 192.168.0.26 kører den checksumkontrollerede officielle ARM64-pakke 0.5.5.
Far-verdenen er startet, og alle syv verdens-/certifikatfiler er byte-uændrede.
Privat backup før sidste opdatering: `/home/vindr1/BroekraftServer-055-05oadsk5/backup/` (mappe 700, filer 600).
Backup-arkivets syv datafiler er læst tilbage og matcher hashmanifestet. Brugerens systemd-service
er aktiv og aktiveret, og `Linger=yes` holder den kørende uden en åben SSH-session.
HTTPS er kontrolleret med rigtig CA-validering på både localhost og Pi-adressen.
Spilsiden er https://192.168.0.26:8443/index.html .
Kontrolpanelets eksisterende SSH-tunnel er bevaret på http://127.0.0.1:18080/kontrol .
Familiedata og adgangskoder er aldrig lagt i repoet.

Familieserveren inkluderer også det main-indhold, der var med ved udgivelsen.
Claude kan fortsætte med nyere Sigtekorn-indhold; efterfølgende webændringer kræver en senere
serverpakke, før de kommer til Pi. Den fælles checkout er ajourført uden at ændre Claudes
igangværende lokale filer.

## Kontrol og kendt begrænsning

44 spilprøver og 140 serverprøver består. CI bygger alle fem pakker og afprøver installation,
opdatering og HTTPS på Linux x64 og ARM64. Den officielle Windows-pakke består også på denne pc
med egne midlertidige data: netværk, gemning, privatfil-afskærmning og 171 runtimefiler.
Den faktiske Pi-pakke og Windows-pakken leverer disse filer byte-identisk med taggets Git-objekter,
med korrekt GET/HEAD. GitHub Pages er også godkendt med de samme 171 filer på 9b50ac9.
Begge officielle Mac-downloads er checksumkontrolleret: program og vejledning findes, zip-filen
bevarer udførselsrettighederne, og Mach-O-headeren angiver korrekt 64-bit Intel/ARM64.
Formatkontrollen følger Apples offentlige [loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)
og [machine.h](https://github.com/apple-oss-distributions/xnu/blob/main/osfmk/mach/machine.h).
Det er en kontrol af pakkernes indhold og arkitektur; programmerne er ikke kørt på en fysisk Mac.

UI-komponenter er kontrolleret i Chrome på små stående og liggende skærme; herunder
Hjælp/Køreskole/Kort ved 740×370 og Hjælp ved 320×566. De faktiske GLB-modeller er indlæst med
GLTFLoader og vist i en ren modelscene. Logikprøver omfatter fuld fysisk bilkampagne, mange
grottelayouts, navigation, gemning, frivillig lyd og input/fokus.

Ny manuel gennemspilning af den forbedrede udgave bag voksenlåsen er ikke udført:
ejerens eksisterende voksenkode mangler stadig i sessionen. Codex har spurgt én gang og hverken
gættet, nulstillet eller læst den fra browserlageret. Fysisk iPad/Safari og Mac er ikke tilsluttet.
De ældre 0.5.2-spil blev afprøvet manuelt før forbedringerne; det er ikke en manuel prøve af 0.5.5.
README i hvert spil indeholder styring og gennemførelsesrute til næste menneskelige prøve.

## Første menneskelige prøve

Åbn Spilkassen, vælg Voksenspil og brug den eksisterende kode. Vælg Fortsæt, hvis der allerede
er en gemt rejse. På en telefon kan Let grafik vælges i spillets indstillinger.

- Det Sidste Lys: gå hen til den røde postkasse på kajen, og vælg Undersøg / E. Prøv at gå med
  fingerpinden og se omkring med den anden hånd. Åbn dagbogen, fold målet sammen, og afprøv
  større tekst i indstillingerne. De trinvise vink kan åbnes, når en gåde dukker op.
- Skrotstorm: læs køreskolen, og kør mod de tre reservedele på skrotpladsen. Prøv GAS sammen
  med styring, åbning af det store kort og valget mellem rat og pile. Åbn Hjælp på en liggende
  telefon: overskriften og den første vejledning skal være synlige. Garagen viser prisen og
  den konkrete forbedring, før man bruger skrot.
- Krystaljægerne: tal med Mira ved brønden med Brug / E. Åbn Rejsekort og følg det gyldne spor.
  Prøv at gå og dreje kameraet samtidig med to fingre. På pc: åbn pause, fortsæt, og afprøv
  angreb med mellemrum. Taske, hjælp og kort skal standse kampen, mens de er åbne.

Afprøv derefter skift mellem stående og liggende skærm, lyd til/fra samt at gå til en anden fane
og vende tilbage. Se gemmestatus, luk siden og vælg Fortsæt igen; næste mål og optjent fremgang
skal være bevaret. Notér enhed, browser, spil og præcis handling ved en fejl.

Blender-kilder: `blender/tre-verdener/<spil>/`.
Modelbevis: `output/tre-verdener-055/krystal-landsby-detaljer.png` i den fælles mappe.
De tre spilmapper er nu fri til Claudes viderearbejde. Den følgende tekst er historiske arbejdsnoter;
status ovenfor gælder.

Prøveserveren og de midlertidige browserfaner er lukket. Den eksisterende Pi-tunnel er bevaret.
Fire egne midlertidige `server/dist/test-tre-verdener-*`-mapper ligger fortsat i den adskilte worktree:
automatisk sikkerhedskontrol afviste sletningen med `blocked by policy`, uden yderligere begrundelse.
Ingen alternativ sletningsmetode er brugt. Mapperne er ignorerede prøvedata og ikke familiens Pi-data.

---

## Tidligere status under detaljearbejdet
# Viderearbejde: flere detaljer og bedre brugeroplevelse i de tre 3D-spil

4. oktober 2026, 01:30 dansk tid. Codex arbejder fortsat frem til ca. 02:33 på
`codex/tre-verdener-detaljer` i `C:/Users/Frede/.codex/worktrees/pi-afproevning/boernespil/`.
Den første stabile milepæl er committet, og Claudes main frem til `195fc51` er samlet med.
Server 0.5.3 og cache `boernespil-v66` klargøres; udgivelse og Pi-opdatering er endnu ikke udført.

- Det Sidste Lys: detaljer i havn, landsby og have, animerede måger, fire valgfrie stednoter,
  fingerpind/pile, tekststørrelse, kamerapræferencer og trinvise vink med gemte gådevalg.
- Skrotstorm: flere værksteder, brodetaljer, kaktusser, vindmøller og en rolig depotbil;
  GPS på vejnettet, kort, rampfeedback, garagens faktiske tal og huskede komfortvalg.
- Krystaljægerne: 13 originale Blender-detaljer, rejsekort, gyldent spor, stabilt autosigte,
  våbenråd, bossvarsler og bedre touch/dialoger. Fastlåste ruter og vogtere er rettet.
- Gamle v1-gemninger bevares. Gemmefejl vises ærligt. Skjulte faner tegner intet,
  og menuer tegner højst 20 billeder/s. Let grafik på øen bruger færre lokale lys.
- Fælles opstart giver selvstændig retry/hjemlink ved import-/modelfejl eller tabt WebGL-kontekst.
  Voksenlåsen bevares. Lyd er valgfri og kan ikke afbryde spillet ved afvisning.
- Offline-lageret gemmer ikke 404/503 og rydder kun gamle Spilkassen-cacher.
- Pakkekontrollen opdager alle 120 aktuelle offentlige Fisk/Rasmus/Sigtekorn-filer,
  inklusive alle våben, banemoduler og de tre lysatlas (også Fjeldbyen).

44 spilprøver og 139 serverprøver består; Windows-pakken består også før de sidste UI-/lydrettelser.
Krystaljægernes mellemrum virker nu efter pause og museklik, mens Tab bevarer normal knapbetjening.
Vigtige statusoplysninger er mindst 11 px på små telefoner.
Alle tre spil tager hensyn til skærmudskæringer i liggende format. Lys' knapper er mindst 44 px,
og målkortet kan rulles uden at dække fingerpinden. Krystals kampvarsel, besked og Brug-prompt
står hver for sig. Skrotstorms afviste eller delvist oprettede lyd kan ikke blokere Start.
Nye UI-komponenter er kontrolleret i Chrome ved bl.a. 320×567 og liggende telefonformat;
Blender-filerne er indlæst gennem den faktiske GLTFLoader og en ren sceneprøve.
Den nye udgave er endnu ikke gennemspillet manuelt i browseren: den eksisterende voksenkode
mangler i denne session, og Codex har spurgt ejeren. Ingen adgangskode eller gemt fremgang er ændret.
Fysisk iPad/Safari er ikke tilsluttet. Brug de enkelte spils README til morgenens gennemspilning.

Undgå parallelle ændringer i de tre spilmapper til den afsluttende overdragelse.
Den fælles checkout og øvrigt igangværende arbejde bevares.

---

## Tidligere udgivelse 0.5.2 og Pi-status
# Tre nye voksenverdener — udgivet og installeret på Pi

4. oktober 2026. Ejeren har bedt Codex om at lave de tre foreslåede 3D-spil nu, bruge Blender så meget
som muligt og **udgive dem, når de er testet**. De skal ligge i voksenrummet, uden blod og med rolig mystik.
Ejeren har også præciseret, at **alle tre skal virke på PC, tablet og telefon**. Touchstyring,
responsive menuer og en lettere grafikindstilling til mobil er derfor krav.
Bestillingen omfatter de nye spils design, modeller og HTML, selv om den sædvanlige arbejdsdeling er en anden.

Spillene er færdige på `codex/tre-verdener` i:
`C:/Users/Frede/.codex/worktrees/pi-afproevning/boernespil/`.

## Nu: to timers viderearbejde

Frede har nu bedt Codex om at gennemgå de tre spil og bruge de næste to timer på flere detaljer
og bedre brugeroplevelse. Arbejde fra 4. oktober 00:33 til ca. 02:33 dansk tid på
`codex/tre-verdener-detaljer` i samme adskilte arbejdsmappe. PC/tablet/telefon, Blender, rolig mystik
og ingen blod gælder stadig. De tre spilmapper og deres Blender-mapper redigeres af Codex nu;
undgå parallelle ændringer der indtil næste overdragelse. Den øvrige fælles mappe bevares.

## Spil

- `spil/det-sidste-lys/`: indieeventyr på en ø, med fyrtårn, dag/nat, skjulte spor og en sammenhængende historie.
- `spil/skrotstorm/`: stor køreverden med garage, reservedele, opgraderinger, løb, leveringer og stunts.
- `spil/krystaljaegerne/`: fantasyverden med quests, sværd/bue/magi, følgesvend, grotter og bosskampe.

Blender-kilder ligger i `blender/tre-verdener/<spil>/`. Færdige GLB-modeller og billeder ligger i spillenes mapper.
`spil/3d-faelles/` indeholder lokale Three.js r160-moduler, så disse spil også kan hente deres 3D-kode fra familieserveren.

De tre kort er integreret i voksenrummet bag den eksisterende lås. Service worker medtager hele de nye spil,
modellerne, forsiderne og de lokale 3D-biblioteker. Serverrettelsen fra PR #4 er med i grenen.
Server 0.5.2 indeholder både Spilkassens billeder/ikoner og de tre spil på Windows, Mac og Linux/Pi.

Hvert spil har otte opgaver og en afslutning. Det Sidste Lys har et åbent værksted, fyrgalleri, natspor og gåder.
Skrotstorm har seks vejstrækninger, tre biler, opgraderinger og fysiske rampehop. Krystaljægerne har tre grotter
med to genererede dybder, tre bosser, tre våben og følgesvenden Lumen. Spilmappernes README-filer indeholder
koordinater, fuld gennemførelsesrute, styring og Blender-genopbygning.

Logikprøver, navigation, gemning, fuld kampagne med simuleret bilstyring, 1.200 grottelayouts og browserfiler
med GET/HEAD består. Browserprøver på PC og telefonstørrelser omfatter touchbevægelse, garage/bilvalg,
Miras første opgave/magi, kaj→værksted/tidevandslås, fortsættelse og pause/hjælp. Fysiske iPads er ikke tilsluttet.
Uafhængig gennemgang fangede og rettede projektil-død, skud gennem vægge, gemmegrænser, underbro-fysik,
dialoger over pause, slutstyring og klipper foran havnens startkamera.

## Udgivelse og Pi

- PR #5 er flettet: https://github.com/FreddyBJ95/boernespil/pull/5 (PR #4 er dermed også flettet).
- Prøvet udgivelsescommit: `01f1c64c244b05f1ef332c99f90858a66e610d12`.
- Spilkassen: https://freddybj95.github.io/boernespil/ — tryk Voksenspil og brug den eksisterende kode.
- Server 0.5.2: https://github.com/FreddyBJ95/boernespil/releases/tag/server-v0.5.2
  med Windows, Mac Intel, Mac Apple Silicon, Linux x64, Linux ARM64 og SHA256SUMS.
- Alle 17 spilprøver og 121 serverprøver består. Færdig Windows-pakke og GitHubs Linux x64/ARM64-
  installation, opdatering, HTTPS, fuld pakketest og normal afslutning består.
- Alle 35 nye browserfiler, forsider, Blender-modeller og lokale biblioteker er verificeret på GitHub Pages.
- Pi `192.168.0.26` er opdateret med den officielle, SHA-256-kontrollerede ARM64-pakke.
  `broekraft-server.service` er aktiv og aktiveret ved opstart; API viser version 0.5.2.
- Far-verdenen `2a8c348e-6d6c-4b49-a012-70ea6c7adf11` starter stadig. Opdatering skete uden spillere.
  Regionfiler, meta.json og begge certifikatfiler er SHA-256-identiske før og efter opdateringen.
- Backup af gammelt program, tjeneste og samtlige data/certifikater er kun på Pi:
  `/home/vindr1/BroekraftServer-052-GnIBKq/backup/`. Mappen er privat (700), backupfiler 600.
- Pi-forside: https://192.168.0.26:8443/index.html — HTTPS er verificeret med den eksisterende rod.
  De tre spil, logo/ikoner samt Slange- og Sigtekorn-modeller er kontrolleret via GET/HEAD uden at ændre verdenen.
- Den fælles mappe er ført frem til udgivelsescommit uden at overskrive Claudes igangværende ændringer.

Sidste rettelser: nattehimlens 260 stjerner har endelige koordinater og ingen Three.js NaN-fejl;
telefonens liggende format har plads til alle touchknapper. Service worker er `boernespil-v63`.
Claudes seneste Slange-GLB og Sigtekorn-moduler fra `c8dc98f7` er bevaret. Senere ufærdige Blender/
Sigtekorn-ændringer i den fælles mappe er ikke en del af server 0.5.2.

Det øvrige igangværende arbejde i den fælles mappe er bevaret. Claude kan nu arbejde videre i de tre spil.
Blender-kilder og README-filer er med i main. Denne lokale statusopdatering er endnu ikke committet.
