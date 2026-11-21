# Byg Morellgårdens kortdata: højder, overflade, træer og bygninger i et drejet blok-gitter.
# Kilder: Kartverket (DTM/DOM 1 m), NIBIO AR5 (arealtype og treslag), OpenStreetMap (bygninger, veje, marker).
# Luftfotoet bruges kun til at vælge farver (afgrøden på markerne, grus, buske og tagenes farve) og til frugthavens
# rækker — ingen billeder kommer med i spillet. Kør fra denne mappe efter ./hent.sh:  python3 bygdata.py
import sys, math, json, base64, statistics, random
from geo import *
from PIL import Image

N = 288                        # blokke i hver retning (1 blok = 1 meter)
THETA = math.radians(21.0)     # gitterets "frem" (-z) peger mod azimut 21° = langs laden
C0 = (1.0, -14.0)              # midten (startstedet) i meter øst/nord for adressepunktet
HMIN = 34.0                    # laveste terræn (m.o.h.) bliver højde 0 i dataene
RIGHT = (math.cos(THETA), -math.sin(THETA))   # +x i verden
FWD = (math.sin(THETA), math.cos(THETA))      # -z i verden
random.seed(855)

def til_m(x, z):               # blok-midte (x, z) → meter (øst, nord)
    u = x - N / 2 + 0.5; v = z - N / 2 + 0.5
    return C0[0] + u * RIGHT[0] - v * FWD[0], C0[1] + u * RIGHT[1] - v * FWD[1]
def fra_m(e, n):               # meter → kontinuerte blok-koordinater
    de, dn = e - C0[0], n - C0[1]
    u = de * RIGHT[0] + dn * RIGHT[1]; v = -(de * FWD[0] + dn * FWD[1])
    return u + N / 2, v + N / 2

class Farvekort:               # AR5-kortene (600×600 px, 1 m, UTM32 omkring adressen)
    def __init__(self, sti, X=552034, Y=6541464, R=300):
        self.im = Image.open(sti).convert("RGB"); self.px = self.im.load(); self.x0 = X - R; self.y1 = Y + R
    def __call__(self, lat, lon):
        x, y = utm32(lat, lon); return self.px[min(599, max(0, int(x - self.x0))), min(599, max(0, int(self.y1 - y)))]
def nærmest(c, tabel):
    return min(tabel, key=lambda k: sum((a - b) ** 2 for a, b in zip(c, tabel[k])))
AREAL = {"dyrket": (255, 209, 110), "skog": (158, 204, 115), "bebygd": (252, 219, 214), "åben": (217, 217, 217), "vej": (179, 120, 76), "beite": (255, 255, 170)}
TRESLAG = {"ingen": (255, 255, 255), "bar": (125, 191, 110), "løv": (128, 255, 8), "ikke": (207, 204, 145), "bland": (158, 204, 115)}

dtm = Raster("data/dtm.tif"); dom = Raster("data/dom.tif"); foto = Foto("data/fliser_z18.png", "data/fliser_z18.txt")
ar5 = Farvekort("data/ar5_Arealtype.png"); treslag = Farvekort("data/ar5_Treslag.png")
ll = [[til_latlon(*til_m(x, z)) for x in range(N)] for z in range(N)]
H = [[dtm(*ll[z][x]) for x in range(N)] for z in range(N)]
D = [[dom(*ll[z][x]) for x in range(N)] for z in range(N)]
F = [[foto(*ll[z][x]) for x in range(N)] for z in range(N)]
A = [[nærmest(ar5(*ll[z][x]), AREAL) for x in range(N)] for z in range(N)]
T = [[nærmest(treslag(*ll[z][x]), TRESLAG) for x in range(N)] for z in range(N)]
print("højder", round(min(map(min, H)), 1), round(max(map(max, H)), 1))

# ---------- OSM til gitteret ----------
veje = osm("data/osm.json")
def polygon_celler(dele):      # scanline med lige/ulige-reglen: alle celler hvis midte ligger i polygonen
    dele = [[fra_m(*p) for p in d] for d in dele]; ud = set()
    zs = [p[1] for d in dele for p in d]
    if not zs: return ud
    for z in range(max(0, int(min(zs)) - 1), min(N, int(max(zs)) + 2)):
        zc = z + 0.5; xs = []
        for P in dele:
            for i in range(len(P) - 1):
                (x1, z1), (x2, z2) = P[i], P[i + 1]
                if (z1 <= zc) != (z2 <= zc): xs.append(x1 + (zc - z1) * (x2 - x1) / (z2 - z1))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            for x in range(max(0, math.ceil(xs[k] - 0.5)), min(N, math.floor(xs[k + 1] - 0.5) + 1)): ud.add((x, z))
    return ud
def linje_celler(pts, bredde):  # celler tæt på en linje → afstand til midten
    P = [fra_m(*p) for p in pts]; ud = {}
    for i in range(len(P) - 1):
        (x1, z1), (x2, z2) = P[i], P[i + 1]; L = math.hypot(x2 - x1, z2 - z1) or 1e-9
        for x in range(max(0, int(min(x1, x2) - bredde) - 1), min(N, int(max(x1, x2) + bredde) + 2)):
            for z in range(max(0, int(min(z1, z2) - bredde) - 1), min(N, int(max(z1, z2) + bredde) + 2)):
                px, pz = x + 0.5, z + 0.5
                t = max(0, min(1, ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / (L * L)))
                d = math.hypot(px - x1 - t * (x2 - x1), pz - z1 - t * (z2 - z1))
                if d <= bredde / 2: ud[(x, z)] = min(ud.get((x, z), 9), d)
    return ud

marker = {}                    # celle → OSM-fladens id (kun dyrket jord)
for k, fid, dele in osm_flader("data/osm.json"):
    if k in ("farmland", "meadow", "orchard"):
        for c in polygon_celler(dele): marker[c] = fid
FRUGTHAVE = marker.get((115, 240))

vej = {}
for w in veje:
    hw = w["tags"].get("highway")
    if not hw or hw in ("footway", "path"): continue
    bred = {"primary": 7.0, "secondary": 6.5, "unclassified": 4.5, "service": 3.5, "track": 3.0}.get(hw, 3)
    slags = "asfalt" if hw in ("primary", "secondary") else "grus"
    for c, d in linje_celler(w["pts"], bred).items():
        if c not in vej or slags == "asfalt": vej[c] = (slags, d)

# hovedvejens x i hver række (træer vest for vejen hører til nåleskoven på Raet)
vejx = {}
for (x, z), (s, d) in vej.items():
    if s == "asfalt": vejx.setdefault(z, []).append(x)
vejx = {z: sum(v) / len(v) for z, v in vejx.items()}
def vest_for_vejen(x, z):
    if z in vejx: return x < vejx[z]
    nær = min(vejx, key=lambda k: abs(k - z)); return x < vejx[nær] and abs(nær - z) < 40

# ---------- Bygninger ----------
OSM_SLAGS = {709576987: "låve", 709576986: "stuehus", 709576985: "smia"}
def hovedretning(P):           # den længste kants retning (radianer i gitteret)
    best = (0, 0)
    for i in range(len(P) - 1):
        dx, dz = P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]; L = math.hypot(dx, dz)
        if L > best[0]: best = (L, math.atan2(dz, dx))
    return best[1]
bygninger = []; bygcelle = {}
for b in veje:
    t = b["tags"]
    if "building" not in t or len(b["pts"]) < 4: continue
    P = [fra_m(*p) for p in b["pts"]]
    cx = sum(p[0] for p in P[:-1]) / (len(P) - 1); cz = sum(p[1] for p in P[:-1]) / (len(P) - 1)
    if not (4 <= cx < N - 4 and 4 <= cz < N - 4): continue
    a = hovedretning(P); rest = (a + math.pi / 4) % (math.pi / 2) - math.pi / 4   # skævhed i forhold til gitteret
    if abs(rest) < math.radians(14):   # ret huset ind efter blokkene
        ca, sa = math.cos(-rest), math.sin(-rest)
        Pm = [til_m(cx - 0.5 + (p[0] - cx) * ca - (p[1] - cz) * sa, cz - 0.5 + (p[0] - cx) * sa + (p[1] - cz) * ca) for p in P]
    else: Pm = b["pts"]
    celler = polygon_celler([Pm])
    if len(celler) < 6: continue
    xs = [c[0] for c in celler]; zs = [c[1] for c in celler]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    jord = statistics.median(H[z][x] for x, z in celler)
    tag = sorted(D[z][x] - jord for x, z in celler)
    ryg = tag[int(len(tag) * 0.92)]
    # tagryggen ligger langs den lange side
    langs = "x" if (x1 - x0) >= (z1 - z0) else "z"
    halv = ((z1 - z0) if langs == "x" else (x1 - x0)) / 2 + 0.5
    # tagfod: overfladen langs de lange vægge
    kant = [D[z][x] - jord for x, z in celler if ((x, z - 1) not in celler or (x, z + 1) not in celler) and langs == "x"
            or ((x - 1, z) not in celler or (x + 1, z) not in celler) and langs == "z"]
    fod = statistics.median(kant) if kant else ryg * 0.6
    slags = OSM_SLAGS.get(b["id"]) or {"house": "hus", "residential": "hus", "garage": "garage", "shed": "skur",
                                      "farm_auxiliary": "skur", "barn": "låve", "farm": "hus"}.get(t["building"], "skur")
    # tagets farve fra luftfotoet: lyst = stålplader, mørkt = tagpap, rødt = tegl
    rgb = [F[z][x] for x, z in celler]; r_, g_, b_ = (sum(c[i] for c in rgb) / len(rgb) for i in range(3))
    tagfarve = "tegl" if r_ > g_ + 25 and r_ > b_ + 30 else "lyst" if (r_ + g_ + b_) / 3 > 125 else "mørkt"
    fod = max(2.2, min(fod, ryg - 1.0)); ryg = max(fod + 1.5, min(ryg, 9.5))
    if slags in ("garage", "skur"): fod, ryg = min(fod, 2.8), min(ryg, 4.8)   # træer over taget tæller ikke med
    if slags == "smia": fod, ryg = 3.0, 6.0                                  # som på fotoerne: halvanden etage med hems
    if slags == "låve": fod = max(fod, 3.2)
    rækker = ["".join("#" if (x, z) in celler else "." for x in range(x0, x1 + 1)) for z in range(z0, z1 + 1)]
    bygninger.append({"id": b["id"], "slags": slags, "x": x0, "z": z0, "fod": rækker, "jord": round(jord - HMIN),
                      "væg": round(fod), "ryg": round(ryg), "langs": langs, "tagfarve": tagfarve})
    for c in celler: bygcelle[c] = len(bygninger) - 1
    print(f"{slags:8} {b['id']:>11} x{x0}-{x1} z{z0}-{z1} jord {jord:.1f} væg {fod:.1f} ryg {ryg:.1f} {langs} tag {tagfarve} ({r_:.0f},{g_:.0f},{b_:.0f})")

nær_byg = set()
for (x, z) in bygcelle:
    for dx in range(-2, 3):
        for dz in range(-2, 3): nær_byg.add((x + dx, z + dz))

# ---------- Kronehøjde og træer ----------
CHM = [[max(0.0, D[z][x] - H[z][x]) if (x, z) not in nær_byg else 0.0 for x in range(N)] for z in range(N)]
træer = []
for z in range(2, N - 2):
    for x in range(2, N - 2):
        h = CHM[z][x]
        if h < 2.8 or (vej.get((x, z), ("",))[0] == "asfalt"): continue
        if marker.get((x, z)) == FRUGTHAVE: continue
        if (x, z) in marker and h < 5: continue          # høballer og maskiner på markerne
        r = int(1 + min(3, h * 0.13)); top = True
        for dz in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if (dx or dz) and 0 <= x + dx < N and 0 <= z + dz < N:
                    o = CHM[z + dz][x + dx]
                    if o > h or (o == h and (dz, dx) < (0, 0)): top = False
        if not top: continue
        if vest_for_vejen(x, z):
            ts = T[z][x]; p = {"bar": 0.85, "bland": 0.5, "løv": 0.1}.get(ts, 0.6)
            slags = "gran" if random.random() < p else "birk"
        else: slags = "løv"
        træer.append([x, z, min(24, round(h)), slags])
# frugthaven: kirsebærtræer i rækker (rækkerne går 41° på skrå med 3,9 m imellem — som i luftfotoet)
ra = math.radians(41.0); rx, rz = math.cos(ra), math.sin(ra); nx, nz = -rz, rx
fh = [c for c, f in marker.items() if f == FRUGTHAVE]
for (x, z) in fh:
    p = (x + .5) * nx + (z + .5) * nz; q = (x + .5) * rx + (z + .5) * rz
    if abs(((p - 88.75) / 3.9) - round((p - 88.75) / 3.9)) * 3.9 < 0.5 and int(math.floor(q)) % 3 == 0:
        if all((x + dx, z + dz) in marker for dx in (-2, 2) for dz in (-2, 2)):
            træer.append([x, z, 3 + (x * 7 + z * 3) % 2, "kirsebær"])
print("træer", len(træer), {s: sum(1 for t in træer if t[3] == s) for s in ("gran", "birk", "løv", "kirsebær")})

# ---------- Overfladen ----------
KODER = ["græs", "muld", "kornmark", "grus", "asfalt", "vejstribe", "skovbund", "hogst", "have", "busk", "frugthave", "eng", "hvedemark"]
K = {n: i for i, n in enumerate(KODER)}
markfarve = {}
for c, f in marker.items():
    r_, g_, b_ = F[c[1]][c[0]]; markfarve.setdefault(f, []).append(2 * g_ - r_ - b_)
markfarve = {f: sum(v) / len(v) for f, v in markfarve.items()}
print("marker", {f: round(v) for f, v in markfarve.items()})
def skov_nær(x, z, r=3):
    return any(CHM[zz][xx] > 3 for xx in range(max(0, x - r), min(N, x + r + 1)) for zz in range(max(0, z - r), min(N, z + r + 1)))
S = [[0] * N for _ in range(N)]
for z in range(N):
    for x in range(N):
        c = (x, z); a = A[z][x]; r_, g_, b_ = F[z][x]; exg = 2 * g_ - r_ - b_; lys_ = (r_ + g_ + b_) / 3
        if c in vej:
            s, d = vej[c]
            k = ("vejstribe" if d < 0.55 and (x + z) // 3 % 2 == 0 else "asfalt") if s == "asfalt" else "grus"
        elif c in bygcelle: k = "grus"
        elif marker.get(c) == FRUGTHAVE: k = "frugthave"
        elif c in marker:                                  # grøn mark = ung korn, gullig = hvede, brun = pløjet
            mf = markfarve[marker[c]]; k = "kornmark" if mf > 45 else "hvedemark" if mf > 22 else "muld"
        elif a == "dyrket": k = "eng"                      # dyrket jord uden mark i OSM: græsmark og fold (hestene!)
        elif a == "skog": k = "skovbund" if skov_nær(x, z) else "hogst"
        elif a == "vej": k = "grus"
        elif a == "bebygd":
            if lys_ > 115 and exg < 12: k = "grus"
            elif 1.0 < CHM[z][x] < 2.8 and exg > 15: k = "busk"
            else: k = "have"
        else: k = "busk" if 1.2 < CHM[z][x] < 2.8 and exg > 20 else "eng" if a in ("åben", "beite") else "græs"
        S[z][x] = K[k]

# ---------- Kodning: højder som forskelle langs x, alt som (antal, værdi)-par i base64 ----------
def rle(værdier):
    ud = bytearray(); i = 0
    while i < len(værdier):
        j = i
        while j < len(værdier) and værdier[j] == værdier[i] and j - i < 255: j += 1
        ud += bytes([j - i, værdier[i]]); i = j
    return base64.b64encode(bytes(ud)).decode()
Hb = [[max(0, round(H[z][x] - HMIN)) for x in range(N)] for z in range(N)]
delta = []
for z in range(N):
    for x in range(N): delta.append((Hb[z][x] - (Hb[z][x - 1] if x else 0)) & 255)
højder = rle(delta); overflade = rle([v for række in S for v in række])
print("størrelser", len(højder), len(overflade), "maks højde", max(map(max, Hb)))

tr = [v for t in træer for v in (t[0], t[1], t[2], ["gran", "birk", "løv", "kirsebær"].index(t[3]))]
json.dump({"N": N, "højder": højder, "overflade": overflade, "koder": KODER, "træer": tr, "bygninger": bygninger}, open("data/kort.json", "w"), ensure_ascii=False)
json.dump({"N": N, "H": H, "CHM": CHM, "F": F, "S": S, "koder": KODER, "træer": træer, "byg": {f"{x},{z}": v for (x, z), v in bygcelle.items()}}, open("data/mellem.json", "w"))
print("gemt data/kort.json og data/mellem.json")

# ---------- Skriv JS-modulet til spillet ----------
def js_bygning(b):
    fod = ",\n      ".join(json.dumps(r) for r in b["fod"])
    return (f'  {{ slags: "{b["slags"]}", x: {b["x"]}, z: {b["z"]}, jord: {b["jord"]}, væg: {b["væg"]}, ryg: {b["ryg"]}, langs: "{b["langs"]}", tag: "{b["tagfarve"]}", osm: {b["id"]},\n'
            f'    fod: [\n      {fod},\n    ] }},')
linjer = []
for i in range(0, len(tr), 64): linjer.append("    " + ",".join(map(str, tr[i:i + 64])) + ",")
def b64linjer(s, w=120): return "\n".join(f'    "{s[i:i + w]}" +' for i in range(0, len(s), w)).rstrip(" +")
js = f"""// ===== Morellgården i Brunlanes: kortdata til verdenen (verdener.js) =====
// Lavet af kortdata/morellgaarden/bygdata.py — ret ikke i hånden, kør scriptet igen.
// 1 blok = 1 meter. Gitteret er drejet 21°, så laden, smien og stuehuset står lige på blokkene.
// Kilder: højder fra Kartverket (DTM og DOM 1 m, CC BY 4.0), arealtyper og treslag fra NIBIO AR5 (CC BY 4.0),
// bygninger, veje og marker © OpenStreetMaps bidragydere (ODbL).
//  højder:    terrænets højde over {HMIN:.0f} m.o.h. i hele meter — forskel til feltet til venstre, (antal, værdi)-par i base64
//  overflade: hvad der ligger øverst (se OVERFLADER) — (antal, værdi)-par i base64
//  træer:     x, z, højde i meter, slags (0 gran, 1 birk, 2 løvtræ, 3 kirsebær) — fire tal pr. træ
//  bygninger: grundplan ("#" = hus), jordens højde, væggens og tagryggens højde i meter, tagryggens retning og tagets farve

export const N = {N};
export const OVERFLADER = {json.dumps(KODER, ensure_ascii=False)};
export const HØJDER =
{b64linjer(højder)};
export const OVERFLADE =
{b64linjer(overflade)};
export const TRÆER = [
{chr(10).join(linjer)}
];
export const BYGNINGER = [
{chr(10).join(js_bygning(b) for b in bygninger)}
];
"""
open("../../spil/broekraft/morellgaarden-kort.js", "w").write(js)
print("skrev morellgaarden-kort.js", len(js), "tegn")
