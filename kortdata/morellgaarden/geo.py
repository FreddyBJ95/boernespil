# Fælles: lokalt meter-gitter omkring adressen (x = øst, z = syd), UTM32 og luftfoto-opslag
import math, json, struct
from PIL import Image
lat0, lon0 = 59.00951335016346, 9.905957938512747
MLAT = 111132.954 - 559.822 * math.cos(2 * math.radians(lat0))
MLON = 111412.84 * math.cos(math.radians(lat0)) - 93.5 * math.cos(3 * math.radians(lat0))
def til_latlon(e, n):  # meter øst/nord for adressen → lat, lon
    return lat0 + n / MLAT, lon0 + e / MLON
def fra_latlon(lat, lon):
    return (lon - lon0) * MLON, (lat - lat0) * MLAT
def utm32(lat, lon):
    a = 6378137.0; f = 1 / 298.257222101; k0 = 0.9996; e2 = f * (2 - f); ep2 = e2 / (1 - e2)
    phi = math.radians(lat); lam = math.radians(lon - 9.0)
    N = a / math.sqrt(1 - e2 * math.sin(phi) ** 2); T = math.tan(phi) ** 2; C = ep2 * math.cos(phi) ** 2; A = math.cos(phi) * lam
    M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000
    y = k0 * (M + N * math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720))
    return x, y
class Raster:  # 600×600 m højdekort i UTM32 med 1 m opløsning
    def __init__(self, sti, X=552034, Y=6541464, R=300):
        self.im = Image.open(sti); self.px = self.im.load(); self.x0 = X - R; self.y1 = Y + R; self.W, self.H = self.im.size
    def __call__(self, lat, lon):
        x, y = utm32(lat, lon); u = x - self.x0 - 0.5; v = self.y1 - y - 0.5
        i, j = int(math.floor(u)), int(math.floor(v)); fu, fv = u - i, v - j
        g = lambda a, b: self.px[min(self.W - 1, max(0, a)), min(self.H - 1, max(0, b))]
        return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv
class Foto:
    def __init__(self, sti, info):
        self.im = Image.open(sti).convert("RGB"); self.px = self.im.load()
        self.Z, self.tx0, self.ty0 = map(int, open(info).read().split())
    def __call__(self, lat, lon):
        n = 2 ** self.Z
        x = (lon + 180) / 360 * n; y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
        u = int((x - self.tx0) * 256); v = int((y - self.ty0) * 256)
        return self.px[min(self.im.size[0] - 1, max(0, u)), min(self.im.size[1] - 1, max(0, v))]
def osm(sti):
    d = json.load(open(sti)); noder = {e["id"]: (e["lat"], e["lon"]) for e in d["elements"] if e["type"] == "node"}
    veje = [e for e in d["elements"] if e["type"] == "way"]
    ud = []
    for w in veje:
        pts = [fra_latlon(*noder[n]) for n in w["nodes"] if n in noder]
        ud.append({"id": w["id"], "tags": w.get("tags", {}), "pts": pts})
    return ud
def osm_flader(sti):  # landuse/natural som lister af kanter (veje og multipolygoner); lige/ulige-reglen klarer huller
    d = json.load(open(sti)); noder = {e["id"]: (e["lat"], e["lon"]) for e in d["elements"] if e["type"] == "node"}
    veje = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
    pts = lambda w: [fra_latlon(*noder[n]) for n in w["nodes"] if n in noder]
    ud = []
    for w in veje.values():
        t = w.get("tags", {}); k = t.get("landuse") or t.get("natural")
        if k and len(w["nodes"]) > 3 and w["nodes"][0] == w["nodes"][-1]: ud.append((k, w["id"], [pts(w)]))
    for r in d["elements"]:
        if r["type"] != "relation": continue
        t = r.get("tags", {}); k = t.get("landuse") or t.get("natural")
        if k: ud.append((k, r["id"], [pts(veje[m["ref"]]) for m in r["members"] if m["type"] == "way" and m["ref"] in veje]))
    return ud
