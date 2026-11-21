# Fælles kortværktøj til Brøkrafts rigtige steder: lokalt meter-gitter, UTM32, højdekort, AR5-farvekort,
# luftfoto-fliser og OpenStreetMap. Bruges af kortdata/*/bygdata.py.
import math, json
from PIL import Image

class Sted:                    # meter øst/nord omkring et punkt (præcist nok over et par kilometer)
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.MLAT = 111132.954 - 559.822 * math.cos(2 * math.radians(lat0))
        self.MLON = 111412.84 * math.cos(math.radians(lat0)) - 93.5 * math.cos(3 * math.radians(lat0))
    def til_latlon(self, e, n): return self.lat0 + n / self.MLAT, self.lon0 + e / self.MLON
    def fra_latlon(self, lat, lon): return (lon - self.lon0) * self.MLON, (lat - self.lat0) * self.MLAT

def utm32(lat, lon):           # bredde/længde → UTM zone 32 (EPSG:25832), som Kartverkets og NIBIOs kort bruger
    a = 6378137.0; f = 1 / 298.257222101; k0 = 0.9996; e2 = f * (2 - f); ep2 = e2 / (1 - e2)
    phi = math.radians(lat); lam = math.radians(lon - 9.0)
    N = a / math.sqrt(1 - e2 * math.sin(phi) ** 2); T = math.tan(phi) ** 2; C = ep2 * math.cos(phi) ** 2; A = math.cos(phi) * lam
    M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * math.sin(2 * phi)
             + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * math.sin(6 * phi))
    x = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000
    y = k0 * (M + N * math.tan(phi) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720))
    return x, y

class Raster:                  # højdekort (GeoTIFF med kommatal) over firkanten X±R, Y±R i UTM32 — bilineært opslag
    def __init__(self, sti, X, Y, R, gyldig=(-100, 3000)):
        self.im = Image.open(sti); self.px = self.im.load(); self.W, self.H = self.im.size
        self.x0 = X - R; self.y1 = Y + R; self.m = 2 * R / self.W     # meter pr. pixel
        self.lav, self.høj = gyldig                                  # værdier udenfor er "ingen data"
    def __call__(self, lat, lon):  # None, hvis ingen af de fire nabopixels har data
        x, y = utm32(lat, lon); u = (x - self.x0) / self.m - 0.5; v = (self.y1 - y) / self.m - 0.5
        i, j = int(math.floor(u)), int(math.floor(v)); fu, fv = u - i, v - j
        g = lambda a, b: self.px[min(self.W - 1, max(0, a)), min(self.H - 1, max(0, b))]
        hjørner = ((g(i, j), (1 - fu) * (1 - fv)), (g(i + 1, j), fu * (1 - fv)), (g(i, j + 1), (1 - fu) * fv), (g(i + 1, j + 1), fu * fv))
        if all(self.lav <= h <= self.høj for h, _ in hjørner):
            return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv
        gode = [(h, w) for h, w in hjørner if self.lav <= h <= self.høj]   # (h != h er NaN og falder også fra)
        vægt = sum(w for _, w in gode)
        return sum(h * w for h, w in gode) / vægt if vægt > 0 else (gode[0][0] if gode else None)

class Farvekort:               # AR5-kort (PNG) over samme slags firkant — nærmeste pixel
    def __init__(self, sti, X, Y, R):
        self.im = Image.open(sti).convert("RGB"); self.px = self.im.load(); self.W, self.H = self.im.size
        self.x0 = X - R; self.y1 = Y + R; self.m = 2 * R / self.W
    def __call__(self, lat, lon):
        x, y = utm32(lat, lon)
        return self.px[min(self.W - 1, max(0, int((x - self.x0) / self.m))), min(self.H - 1, max(0, int((self.y1 - y) / self.m)))]

def nærmest(c, tabel):         # hvilken farve i tabellen ligner c mest
    return min(tabel, key=lambda k: sum((a - b) ** 2 for a, b in zip(c, tabel[k])))

class Foto:                    # luftfoto syet sammen af web-fliser (fliser.py)
    def __init__(self, sti, info):
        self.im = Image.open(sti).convert("RGB"); self.px = self.im.load()
        self.Z, self.tx0, self.ty0 = map(int, open(info).read().split())
    def __call__(self, lat, lon):
        n = 2 ** self.Z
        x = (lon + 180) / 360 * n; y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
        u = int((x - self.tx0) * 256); v = int((y - self.ty0) * 256)
        return self.px[min(self.im.size[0] - 1, max(0, u)), min(self.im.size[1] - 1, max(0, v))]

def osm(sti, sted):            # alle OSM-veje som punkter i meter (øst, nord)
    d = json.load(open(sti)); noder = {e["id"]: (e["lat"], e["lon"]) for e in d["elements"] if e["type"] == "node"}
    return [{"id": w["id"], "tags": w.get("tags", {}), "pts": [sted.fra_latlon(*noder[n]) for n in w["nodes"] if n in noder]}
            for w in d["elements"] if w["type"] == "way"]

def osm_punkter(sti, sted):    # OSM-punkter med mærker (fx skorstene)
    d = json.load(open(sti))
    return [{"id": e["id"], "tags": e["tags"], "pt": sted.fra_latlon(e["lat"], e["lon"])} for e in d["elements"] if e["type"] == "node" and e.get("tags")]

def osm_flader(sti, sted, nøgler=("landuse", "natural")):   # flader som lister af kanter (veje og multipolygoner)
    d = json.load(open(sti)); noder = {e["id"]: (e["lat"], e["lon"]) for e in d["elements"] if e["type"] == "node"}
    veje = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
    pts = lambda w: [sted.fra_latlon(*noder[n]) for n in w["nodes"] if n in noder]
    slags = lambda t: next((t[k] for k in nøgler if k in t), None)
    ud = []
    for w in veje.values():
        k = slags(w.get("tags", {}))
        if k and len(w["nodes"]) > 3 and w["nodes"][0] == w["nodes"][-1]: ud.append((k, w["id"], [pts(w)]))
    for r in d["elements"]:
        if r["type"] != "relation": continue
        k = slags(r.get("tags", {}))
        if k: ud.append((k, r["id"], [pts(veje[m["ref"]]) for m in r["members"] if m["type"] == "way" and m["ref"] in veje]))
    return ud
