# Viderearbejde: flere detaljer og bedre brugeroplevelse i de tre 3D-spil

4. oktober 2026, 01:30 dansk tid. Codex arbejder fortsat frem til ca. 02:33 på
`codex/tre-verdener-detaljer` i `C:/Users/Frede/.codex/worktrees/pi-afproevning/boernespil/`.
Den første stabile milepæl er committet, og Claudes main frem til `968fed5` er samlet med.
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
- Pakkekontrollen opdager alle 107 aktuelle offentlige Fisk/Rasmus/Sigtekorn-filer,
  inklusive alle våben, banemoduler og begge lysatlas.

43 spilprøver, 139 serverprøver og den nybyggede Windows-pakke består.
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
