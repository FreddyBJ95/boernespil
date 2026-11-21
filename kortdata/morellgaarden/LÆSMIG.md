# Morellgården: kortdata til Brøkraft

Verdenen **Morellgården** i Brøkraft er gården ved Brunlanesveien 855 i Larvik — der hvor Airbnb-huset
"Morellgården Smia" ligger. Den er bygget efter rigtige kort: 1 blok = 1 meter, og bakken, markerne, skoven
og husene står, hvor de står i virkeligheden. Gitteret er drejet 21°, så laden, smien og stuehuset står lige på blokkene.

## Sådan bliver kortet lavet

```sh
./hent.sh            # henter højder, arealtyper, OSM og luftfoto til data/ (bliver ikke lagt i git)
python3 bygdata.py   # skriver spil/broekraft/morellgaarden-kort.js
```

Kræver Python 3 med Pillow. `bygdata.py` gør dette:

- **Terræn:** Kartverkets terrænmodel (DTM 1 m), afrundet til hele meter over 34 m.o.h.
- **Bygninger:** Omridset fra OpenStreetMap. Højden af vægge og tagryg måles i Kartverkets overflademodel (DOM).
  Tagets farve vælges ud fra luftfotoet. Husene rettes ind efter blokkene, når de står næsten lige.
- **Træer:** Toppene i kronehøjden (DOM − DTM). Vest for hovedvejen er der mest gran (NIBIO AR5 treslag), ved
  gården løvtræer. Frugthaven får kirsebærtræer i rækker, som i luftfotoet.
- **Overflade:** Marker fra OSM (grøn = ung korn, gullig = hvede, brun = pløjet), skov og bebyggelse fra AR5,
  asfalt og grusveje fra OSM.

Selve verdenen (vægge, vinduer, tag, træernes form, folden, havemøblerne) laves i `spil/broekraft/morellgaarden.js`.
Farverne på husene kommer fra fotoerne af stedet: rød smie og lade med hvide hjørner, hvidt stuehus.

## Kilder

- Højdedata © Kartverket, CC BY 4.0 (hoydedata.no)
- AR5 arealressurskart © NIBIO, CC BY 4.0
- Bygninger, veje og marker © OpenStreetMaps bidragydere, ODbL
- Luftfoto (Esri World Imagery) er kun brugt til at vælge farver og kommer ikke med i spillet
