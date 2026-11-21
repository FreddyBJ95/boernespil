#!/bin/sh
# Hent de åbne kortdata over Herøya industripark (Porsgrunn) til mappen data/.
# Bagefter laver "python3 bygdata.py" spil/broekraft/heroeya-kort.js.
set -e
cd "$(dirname "$0")"
mkdir -p data
X=536026; Y=6553885; R=1500           # parkens midte i UTM32 (EPSG:25832) og 1500 m i hver retning
BBOX="$((X-R)),$((Y-R)),$((X+R)),$((Y+R))"

# Højder fra Kartverket: terræn (DTM) og overflade med alle fabrikker, tanke og træer (DOM), 2 m pr. pixel
for T in dtm dom; do
  curl -sf -m 180 -o data/$T.tif "https://wcs.geonorge.no/skwms1/wcs.hoyde-$T-nhm-25832?service=WCS&version=1.0.0&request=GetCoverage&coverage=nhm_${T}_topo_25832&crs=EPSG:25832&bbox=$BBOX&width=1500&height=1500&format=GeoTIFF"
done

# Arealtyper (hav, bebyggelse, skov …) og treslag fra NIBIO AR5
for L in Arealtype Treslag; do
  curl -sf -m 120 -o data/ar5_$L.png "https://wms.nibio.no/cgi-bin/ar5?service=WMS&version=1.1.1&request=GetMap&layers=$L&styles=&srs=EPSG:25832&bbox=$BBOX&width=1500&height=1500&format=image/png"
done

# Bygninger, veje, kajer, skinner og skorstenen fra OpenStreetMap (prøver flere Overpass-servere)
OSM='data=[out:json][timeout:120];(way(around:1700,59.1227,9.6293);relation(around:1700,59.1227,9.6293)[type=multipolygon];node(around:1700,59.1227,9.6293)[man_made];);out body;>;out skel qt;'
for U in https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter; do
  if curl -sf -m 180 -A "boernespil-kortdata/1.0" -o data/osm.json --data-urlencode "$OSM" "$U" && head -c 1 data/osm.json | grep -q "{"; then break; fi
  echo "Overpass svarede ikke ($U) — prøver den næste…"
done
head -c 1 data/osm.json | grep -q "{" || { echo "Kunne ikke hente OSM-data"; exit 1; }

# Luftfoto (kun til at vælge farver på tage og pladser — kommer ikke med i spillet)
python3 ../fliser.py 59.1200 9.6290 1300 17 data
echo "Færdig. Kør nu: python3 bygdata.py"
