#!/bin/sh
# Hent de åbne kortdata omkring Brunlanesveien 855 (Larvik) til mappen data/.
# Bagefter laver "python3 bygdata.py" spil/broekraft/morellgaarden-kort.js.
set -e
cd "$(dirname "$0")"
mkdir -p data
X=552034; Y=6541464; R=300            # adressepunktet i UTM32 (EPSG:25832) og 300 m i hver retning
BBOX="$((X-R)),$((Y-R)),$((X+R)),$((Y+R))"

# Højder fra Kartverket: terræn (DTM) og overflade med huse og træer (DOM), 1 m
for T in dtm dom; do
  curl -sf -o data/$T.tif "https://wcs.geonorge.no/skwms1/wcs.hoyde-$T-nhm-25832?service=WCS&version=1.0.0&request=GetCoverage&coverage=nhm_${T}_topo_25832&crs=EPSG:25832&bbox=$BBOX&width=600&height=600&format=GeoTIFF"
done

# Arealtyper og treslag fra NIBIO AR5 (farvekort, 1 m)
for L in Arealtype Treslag; do
  curl -sf -o data/ar5_$L.png "https://wms.nibio.no/cgi-bin/ar5?service=WMS&version=1.1.1&request=GetMap&layers=$L&styles=&srs=EPSG:25832&bbox=$BBOX&width=600&height=600&format=image/png"
done

# Bygninger, veje og marker fra OpenStreetMap (prøver flere Overpass-servere, hvis en er langsom)
OSM='data=[out:json][timeout:60];(way(around:450,59.00951335016346,9.905957938512747);relation(around:450,59.00951335016346,9.905957938512747)[type=multipolygon];);out body;>;out skel qt;'
for U in https://overpass.kumi.systems/api/interpreter https://overpass-api.de/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter; do
  if curl -sf -m 90 -A "boernespil-kortdata/1.0" -o data/osm.json --data-urlencode "$OSM" "$U" && head -c 1 data/osm.json | grep -q "{"; then break; fi
  echo "Overpass svarede ikke ($U) — prøver den næste…"
done
head -c 1 data/osm.json | grep -q "{" || { echo "Kunne ikke hente OSM-data"; exit 1; }

# Luftfoto (kun til at vælge farver — kommer ikke med i spillet)
python3 fliser.py 18 data
echo "Færdig. Kør nu: python3 bygdata.py"
