# Herøya: kortdata til Brøkraft

Verdenen **Herøya** i Brøkraft er Herøya industripark i Porsgrunn: fabrikshallerne, tankene, kajerne,
skinnerne og skorstenen på 101 meter, på halvøen mellem Frierfjorden og Gunneklevfjorden.

Parken er over 2 km lang, så her er **1 blok = 4,5 meter vandret og 2 meter lodret**. Det gør fabrikkerne
og skorstenen højere i forhold til grundfladen, så de rager op, når man går rundt mellem dem.
Gitteret er drejet langs halvøen (155,5°), og verdenen er 384 × 64 × 384 blokke.

## Sådan bliver kortet lavet

```sh
./hent.sh            # henter højder, arealtyper, OSM og luftfoto til data/ (bliver ikke lagt i git)
python3 bygdata.py   # skriver spil/broekraft/heroeya-kort.js
```

Kræver Python 3 med Pillow. Fælles kode ligger i `kortdata/geo.py` og `kortdata/fliser.py`. `bygdata.py` gør dette:

- **Terræn og vand:** Kartverkets terrænmodel (DTM). Fjordene er AR5-arealtypen hav. Højder over 20 m trykkes sammen.
- **Fabrikker, tanke, rør og huse:** Hver blok prøves i 3 × 3 punkter i Kartverkets overflademodel (DOM).
  Alt, der rager mindst 2,5 m op og ikke er grønt, bliver en søjle. Materialet kommer fra OSM-bygningens type og
  tagets farve i luftfotoet: lys beton, mørk stål, rust/mursten, hvide tanke eller boliger. Tagene glattes, og
  enkeltstående prikker og bølger på vandet fjernes. Store ting over vandet er skibe ved kajen og broer.
- **Særlige ting:** Skorstenen (OSM, 101 m) og Ammoniakktanken bygges særskilt i spillet som en skorsten med striber
  og røg og en stor hvid kugle på ben.
- **Overflade:** Veje og skinner fra OSM, kajer i beton, pladser i asfalt, beton eller grus efter luftfotoets farve.

Selve verdenen laves i `spil/broekraft/heroeya.js`.

## Kilder

- Højdedata © Kartverket, CC BY 4.0 (hoydedata.no)
- AR5 arealressurskart © NIBIO, CC BY 4.0
- Bygninger, veje, kajer, skinner og skorstenen © OpenStreetMaps bidragydere, ODbL
- Luftfoto (Esri World Imagery) er kun brugt til at vælge farver og kommer ikke med i spillet
