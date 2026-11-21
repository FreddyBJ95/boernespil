# Hent luftfoto-fliser (Esri World Imagery) omkring et punkt og sy dem sammen — kun til at vælge farver, kommer ikke med i spillet.
# Brug: python3 fliser.py breddegrad længdegrad radius_i_meter zoom udmappe
import math, sys, urllib.request, io, os
from PIL import Image
lat0, lon0, R, Z, ud = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
def flise(lat, lon, z):        # bredde/længde → flisens nummer (med brøkdel)
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
dlat = R / 111132.0; dlon = R / (111320.0 * math.cos(math.radians(lat0)))
x0, y0 = flise(lat0 + dlat, lon0 - dlon, Z); x1, y1 = flise(lat0 - dlat, lon0 + dlon, Z)
tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
img = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{ty}/{tx}"
        req = urllib.request.Request(url, headers={"User-Agent": "boernespil-kortdata/1.0"})
        img.paste(Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
os.makedirs(ud, exist_ok=True)
img.save(os.path.join(ud, f"fliser_z{Z}.png"))
open(os.path.join(ud, f"fliser_z{Z}.txt"), "w").write(f"{Z} {tx0} {ty0}\n")
print(img.size)
