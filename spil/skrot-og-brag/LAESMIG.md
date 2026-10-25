# Skrot & Brag

Byg en rigtig lastbil i værkstedet, og kør den direkte ind i et skur, et murstenshus, en lagerhal,
et vandtårn, en betonblok eller en 26 meter høj fabriksskorsten. Lasten på ladet flyver af ved
sammenstødet og springer som rigtigt sprængstof. Spillet er lavet til børn på 3–6 år: alle valg er
billeder, og ingen tekst skal kunne læses for at spille.

Codex lavede den første udgave. Ejeren ønskede derefter, at det skulle se meget mere virkeligt ud,
"ligesom Nedrivningsfirmaet". Derfor kører spillet nu på Nedrivningsfirmaets motor (se nedenfor),
og Claude har bygget lastbilen, værkstedet, kameraet og knapperne ovenpå.

## Sådan spiller man

- **Værkstedet:** fem faner: hjul, motor, front, last og farve. Ikonerne er tegnet af de rigtige
  3D-modeller. Et tryk skifter delen på bilen med det samme. Under lasten vælges også 1, 2 eller 3 stk.
- **Banerne:** seks fotos af bygningerne, taget i spillet selv, med de stjerner, man har fået.
- **Kørsel:** hold den grønne ▶ nede for at køre (→ eller D), ◀ bakker (← eller A), 🔥 giver turbo
  (mellemrum), og 📯 dytter med et rigtigt horn (H). Ringen om turboen viser, hvor meget der er tilbage.
- Ved sammenstødet går spillet et øjeblik i slowmotion. Måleren øverst fyldes, efterhånden som bygningen
  ikke længere står, og tre stjerner tændes med en klokke.
- Resultatet kommer, når alt er faldet til ro: 🔁 prøv igen, ▶ næste bane og 🔧 værkstedet.
- ⏸ / P / Escape holder pause. Skjult fane og mistet fokus pauser automatisk.
- 🐢 slår rolige effekter til (ingen rystelser, intet blink, ingen slowmotion). Enhedens valg af
  reduceret bevægelse respekteres. 🔊 slår lyden fra. Alt gemmes lokalt under `skrot-og-brag-v3`.

## Delene

Alt er i rigtige mål. Bilen vejer ca. 2,5–3 ton.

| Del | Valg |
| --- | --- |
| Hjul | Vejhjul (0,42 m), terrænhjul (0,58 m), monsterhjul (0,85 m med synlig affjedring) |
| Motor | Lynmotor (hurtig), stærk motor (skubber mest, med skorstene), raket (på taget, stærkest turbo) |
| Front | Rambuk af stål med advarselsstriber, sneplov, kofanger |
| Last | Benzintønder, gasflasker, TNT-kasser, fyrværkeri eller ingen |
| Farve | Syv billakker med klar lakhinde |

## Nedrivningsfirmaets motor

Spillet importerer disse filer fra `spil/nedrivning/` uden at ændre dem:

- `fysik.js`: Rapier i rigtig 3D med tyngdekraft på 9,81.
- `bygninger.js` og `dele.js`: bygningerne og deres statik. En del løsnes og knuses ved hårde stød,
  og det, der ikke længere bæres, styrter.
- `ruder.js`: vinduer, der splintres.
- `sprængstof.js`: tønder, gasflasker, TNT og fyrværkeri med kædereaktioner.
- `effekter.js`: ild, røg, støv, glas, gnister og brændemærker.
- `efterbehandling.js`: glød fra ild og filmfarver.
- `materialer.js`: fototeksturer af mursten, beton, træ og stål.
- `verden.js`: byggepladsen, himlen, hegnet og byen.
- `lyd.js`: de optagede lyde.

Nedrivningsfirmaets filer henter deres egne fotos, modeller og lyde med stier, der regnes fra siden.
Derfor har `index.html` linjen `<base href="../nedrivning/">`, og spillets egne filer hentes med
`../skrot-og-brag/`. Ændres Nedrivningsfirmaets moduler, skal Skrot & Brag afprøves igen.

## Bilen i fysikken (`bil.mjs`)

- Karrosseri, førerhus, fire kuglehjul og front er dele af **én** krop uden fuger. Rapiers låste
  drejeakser løber løbsk sammen med fuger. Derfor er akserne ikke låst: efter hvert fysiktrin rettes
  bilen ind, så den kun kan vippe frem og tilbage i sin bane. Murbrokker og tønder flyver frit i 3D.
- Hjulene glider let (friktion 0,04 med "mindste værdi"), og motoren trækker nede ved hjulene, så bilen
  ikke stejler. Uden gas ruller den langsomt ud. Den retter sig selv op, hvis den tipper mere end 35°.
- **Rambukken:** et hårdt stød mod en bygningsdel bruger Nedrivningsfirmaets egen beregning
  (`sprængstof.ramDele`) med en styrke ud fra farten og fronten. Den del, bilen rammer, knuses, og delene
  omkring rystes løs. Ændringerne venter til efter fysiktrinnet, som i Nedrivningsfirmaet.
- Ved første sammenstød flyver lasten af ladet med bilens fart og springer et øjeblik efter.
  Trykbølger fra sprængninger skubber også til bilen.
- Et usynligt hegn i fysikken holder bilen inde på byggepladsen.

Procenten måler, hvor meget af bygningens rumfang der ikke længere står fast, hvor det stod.

## Prøver

```
NODE_PATH=<sti til playwright>/node_modules node --test spil/skrot-og-brag/browser.test.cjs
```

Browserprøven starter selv en lille server og bruger installeret Edge med rigtig WebGL
(`BROWSER_CHANNEL=chrome` vælger Chrome). Den dækker:

- værkstedet, valg af last, front og bane
- kørsel, sammenstød og lasten, der flyver af
- lydhentning, pause med stillestående fysik, forfra og fokus-tab
- gemning
- at alle seks bygninger vælter nok til mindst én stjerne med standardbilen
- næste bane efter resultatet
- telefonlayout og to fingre på gas og turbo samtidig

`?prøve` i adressen giver prøverne adgang til spillets tilstand (`window.sb`).
Banefotoene i `baner/` er taget med `sb.kig()` på samme måde.

Lokal visning: `node spil/skrot-og-brag/proeve-server.mjs` og åbn `http://127.0.0.1:18124/spil/skrot-og-brag/`.

Afprøvet i Edge på Windows i iPad- og telefonstørrelse. En fysisk iPad med Safari er ikke afprøvet.
Offline-cachen er v84. Nedrivningsfirmaets filer ligger allerede i den.
