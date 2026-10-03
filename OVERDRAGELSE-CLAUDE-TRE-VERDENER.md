# Tre nye voksenverdener — klar til udgivelsesprøve

3. oktober 2026. Ejeren har bedt Codex om at lave de tre foreslåede 3D-spil nu, bruge Blender så meget
som muligt og **udgive dem, når de er testet**. De skal ligge i voksenrummet, uden blod og med rolig mystik.
Ejeren har også præciseret, at **alle tre skal virke på PC, tablet og telefon**. Touchstyring,
responsive menuer og en lettere grafikindstilling til mobil er derfor krav.
Bestillingen omfatter de nye spils design, modeller og HTML, selv om den sædvanlige arbejdsdeling er en anden.

Spillene er færdige på `codex/tre-verdener` i:
`C:/Users/Frede/.codex/worktrees/pi-afproevning/boernespil/`.

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

Udgivelse gennemføres først efter færdige Windows-pakkeprøver og GitHub-tests på Linux x64/ARM64.

Den fælles maps øvrige igangværende arbejde bevares. Undgå samtidigt at ændre de tre nye spils mapper,
mens Codex bygger dem. Forsideændringer bliver tilføjet som nye kort i voksenrummet.
