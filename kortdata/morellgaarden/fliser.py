# Hent luftfoto-fliser (Esri World Imagery) omkring adressen og sy dem sammen
import math, sys, urllib.request, io, os
from PIL import Image
lat0, lon0 = 59.00951335016346, 9.905957938512747
Z = int(sys.argv[1]) if len(sys.argv) > 1 else 18
R = 330  # meter i hver retning
ud = sys.argv[2] if len(sys.argv) > 2 else "data"
def tile(lat, lon, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y
dlat = R / 111132.0; dlon = R / (111320.0 * math.cos(math.radians(lat0)))
x0, y0 = tile(lat0 + dlat, lon0 - dlon, Z); x1, y1 = tile(lat0 - dlat, lon0 + dlon, Z)
tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
W, H = (tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256
img = Image.new("RGB", (W, H))
for tx in range(tx0, tx1 + 1):
    for ty in range(ty0, ty1 + 1):
        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{Z}/{ty}/{tx}"
        req = urllib.request.Request(url, headers={"User-Agent": "boernespil-verdensbygger/1.0"})
        data = urllib.request.urlopen(req, timeout=30).read()
        img.paste(Image.open(io.BytesIO(data)).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
img.save(os.path.join(ud, f"fliser_z{Z}.png"))
open(os.path.join(ud, f"fliser_z{Z}.txt"), "w").write(f"{Z} {tx0} {ty0}\n")
print(W, H, tx0, ty0)
