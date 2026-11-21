# Byg Herøya industriparks kortdata: terræn, vand, overflade, alle anlæg og huse som søjler, træer og skorstenen.
# Kilder: Kartverket (DTM/DOM), NIBIO AR5 (arealtype og treslag), OpenStreetMap (bygninger, veje, kajer, skinner, skorsten).
# Luftfotoet bruges kun til at vælge farver (tage og pladser) — ingen billeder kommer med i spillet.
# Kør fra denne mappe efter ./hent.sh:  python3 bygdata.py
import sys, os, math, json, base64, statistics
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from geo import *

N = 384                        # blokke i hver retning
M = 4.5                        # meter pr. blok vandret (hele parken skal kunne være der)
V = 2.0                        # meter pr. blok lodret (højere end vandret, så fabrikkerne og skorstenen ser høje ud)
AKSE = math.radians(155.5)     # halvøens retning: gitterets "frem" (-z) peger mod SSØ
LANGS0, TVÆRS0 = 200.5, 166.0  # midten (startstedet) i meter langs og på tværs af halvøen fra Herøya-punktet
sted = Sted(59.1227, 9.6293)
UTM = (536026, 6553885, 1500)  # kortenes firkant i UTM32: midte og halv side (2 m pr. pixel)
FWD = (math.sin(AKSE), math.cos(AKSE)); RIGHT = (math.cos(AKSE), -math.sin(AKSE))
C0 = (LANGS0 * FWD[0] + TVÆRS0 * RIGHT[0], LANGS0 * FWD[1] + TVÆRS0 * RIGHT[1])

def til_m(x, z, du=0.0, dv=0.0):   # punkt i blok (x, z) → meter øst/nord (du/dv: forskudt inde i blokken, -0.5..0.5)
    u = (x - N / 2 + 0.5 + du) * M; v = (z - N / 2 + 0.5 + dv) * M
    return C0[0] + u * RIGHT[0] - v * FWD[0], C0[1] + u * RIGHT[1] - v * FWD[1]
def fra_m(e, n):
    de, dn = e - C0[0], n - C0[1]
    return (de * RIGHT[0] + dn * RIGHT[1]) / M + N / 2, -(de * FWD[0] + dn * FWD[1]) / M + N / 2

dtm = Raster("data/dtm.tif", *UTM, gyldig=(-5, 400)); dom = Raster("data/dom.tif", *UTM, gyldig=(-5, 400))
ar5 = Farvekort("data/ar5_Arealtype.png", *UTM); treslag = Farvekort("data/ar5_Treslag.png", *UTM)
foto = Foto("data/fliser_z17.png", "data/fliser_z17.txt")
AREAL = {"hav": (204, 254, 254), "ferskvand": (145, 231, 255), "bebygd": (252, 219, 214), "skog": (158, 204, 115),
         "vej": (179, 120, 76), "åben": (217, 217, 217), "dyrket": (255, 209, 110)}
TRESLAG = {"ingen": (255, 255, 255), "bar": (125, 191, 110), "løv": (128, 255, 8), "ikke": (207, 204, 145), "bland": (158, 204, 115)}

# ---------- Prøv hver blok i 3 × 3 punkter: terrænet som median, anlæggenes top som højeste ----------
SUB = (-1 / 3, 0, 1 / 3)
H = [[0.0] * N for _ in range(N)]; TOP = [[0.0] * N for _ in range(N)]
A = [[""] * N for _ in range(N)]; T = [[""] * N for _ in range(N)]; F = [[(0, 0, 0)] * N for _ in range(N)]
for z in range(N):
    for x in range(N):
        terr, over = [], []
        for dv in SUB:
            for du in SUB:
                ll = sted.til_latlon(*til_m(x, z, du, dv))
                o = dom(*ll); t = dtm(*ll)
                if t is None: t = max(0.0, o) if o is not None and o < 30 else 0.0     # intet terræn: brug overfladen (vandet)
                if o is None: o = t
                terr.append(t); over.append(max(o, t))
        H[z][x] = statistics.median(terr); TOP[z][x] = sorted(over)[-2]          # næsthøjeste: ikke et enkelt støjpunkt
        ll = sted.til_latlon(*til_m(x, z))
        A[z][x] = nærmest(ar5(*ll), AREAL); T[z][x] = nærmest(treslag(*ll), TRESLAG); F[z][x] = foto(*ll)
print("højder", round(min(map(min, H)), 1), round(max(map(max, H)), 1))

# ---------- OSM til gitteret ----------
def polygon_celler(dele):      # scanline med lige/ulige-reglen
    dele = [[fra_m(*p) for p in d] for d in dele if len(d) > 1]; ud = set()
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
def linje_celler(pts, bredde_m):   # celler tæt på en linje (bredde i meter) → (afstand, retning langs x?)
    P = [fra_m(*p) for p in pts]; ud = {}; b = max(1.0, bredde_m / M)
    for i in range(len(P) - 1):
        (x1, z1), (x2, z2) = P[i], P[i + 1]; L = math.hypot(x2 - x1, z2 - z1) or 1e-9
        langsx = abs(x2 - x1) > abs(z2 - z1)
        for x in range(max(0, int(min(x1, x2) - b) - 1), min(N, int(max(x1, x2) + b) + 2)):
            for z in range(max(0, int(min(z1, z2) - b) - 1), min(N, int(max(z1, z2) + b) + 2)):
                px, pz = x + 0.5, z + 0.5
                t = max(0, min(1, ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / (L * L)))
                d = math.hypot(px - x1 - t * (x2 - x1), pz - z1 - t * (z2 - z1))
                if d <= b / 2 and d < ud.get((x, z), (9,))[0]: ud[(x, z)] = (d, langsx)
    return ud

veje = osm("data/osm.json", sted)
industri = set()               # industriparkens område
for k, fid, dele in osm_flader("data/osm.json", sted, ("landuse",)):
    if k == "industrial": industri |= polygon_celler(dele)
BOLIG = {"house", "semidetached_house", "terrace", "apartments", "detached", "residential", "garage", "garages", "kindergarten", "school"}
bygtype = {}
for k, fid, dele in osm_flader("data/osm.json", sted, ("building",)):
    slags = "tank" if k == "storage_tank" else "bolig" if k in BOLIG else "industri"
    for c in polygon_celler(dele): bygtype[c] = slags
for w in veje:                 # lagertanke og kajer, der ikke er tegnet som bygninger
    mm = w["tags"].get("man_made")
    if mm == "storage_tank" and len(w["pts"]) > 3:
        for c in polygon_celler([w["pts"]]): bygtype[c] = "tank"
kaj = set(); brygge = set()
for w in veje:
    mm = w["tags"].get("man_made")
    if mm in ("quay", "pier") and len(w["pts"]) > 1:
        lukket = len(w["pts"]) > 3 and w["pts"][0] == w["pts"][-1]
        celler = polygon_celler([w["pts"]]) if lukket else set(linje_celler(w["pts"], 6))
        (kaj if mm == "quay" else brygge).update(celler)
vej = {}; skinne = {}
for w in veje:
    t = w["tags"]; hw = t.get("highway"); rw = t.get("railway")
    if hw and hw not in ("footway", "path", "steps", "cycleway", "track", "bridleway"):
        bred = {"trunk": 12, "primary": 10, "secondary": 9, "tertiary": 8, "residential": 6, "service": 5}.get(hw, 5)
        for c, (d, lx) in linje_celler(w["pts"], bred).items():
            if t.get("bridge") == "yes": vej[c] = ("bro", d)
            elif c not in vej: vej[c] = ("asfalt", d)
    if rw in ("rail", "abandoned", "disused", "light_rail") and t.get("bridge") != "yes":
        for c, (d, lx) in linje_celler(w["pts"], 3).items(): skinne[c] = lx
skorstene = []
for p in osm_punkter("data/osm.json", sted):
    if p["tags"].get("man_made") == "chimney":
        x, z = fra_m(*p["pt"]); h = float(p["tags"].get("height", "40"))
        if 0 <= x < N and 0 <= z < N: skorstene.append([int(x), int(z), round(h / V)])
print("skorstene", skorstene)
kugler = []                    # kugleformede tanke (den store hvide ammoniakkugle) bygges som rigtige kugler i spillet
for w in veje:
    t = w["tags"]
    if t.get("man_made") == "storage_tank" and "ammoniakk" in t.get("name", "").lower() and len(w["pts"]) > 3:
        P = [fra_m(*p) for p in w["pts"][:-1]]; cx = sum(p[0] for p in P) / len(P); cz = sum(p[1] for p in P) / len(P)
        r = sum(math.hypot(p[0] - cx, p[1] - cz) for p in P) / len(P)
        if 0 <= cx < N and 0 <= cz < N: kugler.append([int(cx), int(cz), round(r)])
print("kugler", kugler)

# ---------- Vand, land og overflade ----------
KODER = ["vand", "asfalt", "beton", "grus", "græs", "skov", "klippe", "muld", "kaj", "brygge", "skinneNS", "skinneØV", "sand"]
K = {n: i for i, n in enumerate(KODER)}
def vand(x, z): return A[z][x] in ("hav", "ferskvand")
def terrænblokke(m):           # de første 20 m i fuld højde; bakkerne over fjorden trykkes sammen, så de kan være der
    return m / V if m <= 20 else 20 / V + (m - 20) / 6
S = [[0] * N for _ in range(N)]; Hb = [[0] * N for _ in range(N)]
for z in range(N):
    for x in range(N):
        c = (x, z); r_, g_, b_ = F[z][x]; exg = 2 * g_ - r_ - b_; lys_ = (r_ + g_ + b_) / 3; a = A[z][x]
        if c in brygge and vand(x, z): k = "brygge"
        elif vand(x, z) and c not in kaj: k = "vand"
        elif c in skinne: k = "skinneØV" if skinne[c] else "skinneNS"
        elif c in kaj: k = "kaj"
        elif c in vej or a == "vej": k = "asfalt"
        elif a == "skog": k = "skov"
        elif a == "dyrket": k = "muld"
        elif a == "åben": k = "klippe" if lys_ > 90 and exg < 15 else "græs"
        elif c in industri:
            k = "græs" if exg > 22 else "beton" if lys_ > 140 else "grus" if lys_ > 105 and r_ > b_ + 6 else "asfalt"
        else: k = "græs" if exg > 10 or lys_ < 90 else "asfalt"
        S[z][x] = K[k]
        Hb[z][x] = 0 if k == "vand" else max(1, 1 + round(terrænblokke(H[z][x] - 0.5)))

# ---------- Anlæg og huse: hver blok får en højde og et materiale ----------
# 0 intet · 1 lys industri (beton) · 2 mørk industri (stål) · 3 rust og mursten · 4 hvide tanke · 5 boliger · 6 rør og stativer · 7 bro/skib over vandet
MAT = [[0] * N for _ in range(N)]; BH = [[0] * N for _ in range(N)]
def tagfarve(x, z):
    r_, g_, b_ = F[z][x]; lys_ = (r_ + g_ + b_) / 3
    if lys_ > 175 and abs(r_ - b_) < 25: return 4
    if r_ > g_ + 12 and r_ > b_ + 18: return 3
    return 1 if lys_ > 115 else 2
træcelle = set()
for z in range(N):
    for x in range(N):
        c = (x, z); n = TOP[z][x] - H[z][x]; r_, g_, b_ = F[z][x]; exg = 2 * g_ - r_ - b_
        if n < 2.5 or S[z][x] in (K["brygge"],): continue
        grøn = exg > 18 and c not in bygtype and (A[z][x] in ("skog", "dyrket", "åben") or c not in industri)
        if grøn: træcelle.add(c); continue
        if vand(x, z): MAT[z][x] = 7; BH[z][x] = min(31, max(1, round(n / V))); continue
        slags = bygtype.get(c)
        if slags == "tank": m = 4
        elif slags == "bolig": m = 5
        elif slags == "industri" or c in industri: m = tagfarve(x, z) if slags else (6 if n < 9 else tagfarve(x, z))
        else: m = 5 if n < 14 else tagfarve(x, z)
        MAT[z][x] = m; BH[z][x] = min(31, max(1, round(n / V)))
# enkeltstående blokke (lygtepæle, master, biler) fjernes — de bliver bare til støj
for z in range(1, N - 1):
    for x in range(1, N - 1):
        if MAT[z][x] and MAT[z][x] != 4 and sum(1 for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)) if MAT[z + dz][x + dx]) == 0 and BH[z][x] < 6:
            MAT[z][x] = 0; BH[z][x] = 0
for x, z, h in skorstene:      # skorstenen bygges særskilt i spillet
    for dz in (-1, 0, 1):
        for dx in (-1, 0, 1): MAT[z + dz][x + dx] = 0; BH[z + dz][x + dx] = 0

for x, z, r in kugler:         # kuglen bygges særskilt i spillet
    for dz in range(-r - 2, r + 3):
        for dx in range(-r - 2, r + 3):
            if dx * dx + dz * dz <= (r + 2) ** 2 and 0 <= x + dx < N and 0 <= z + dz < N: MAT[z + dz][x + dx] = 0; BH[z + dz][x + dx] = 0
# tankenes kanter er også tank (skyggen i luftfotoet må ikke gøre dem til en fabrik med vinduer)
tank = {c for c, v in bygtype.items() if v == "tank"}
for (x, z) in list(tank):
    for dz in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if 0 <= x + dx < N and 0 <= z + dz < N and MAT[z + dz][x + dx] not in (0, 7): MAT[z + dz][x + dx] = 4

# over vandet tæller kun store sammenhængende ting (skibe ved kajen og broer) — ikke bølger og støj
set_ = set()
for z in range(N):
    for x in range(N):
        if MAT[z][x] != 7 or (x, z) in set_: continue
        gruppe, kø = [], [(x, z)]; set_.add((x, z))
        while kø:
            cx, cz = kø.pop(); gruppe.append((cx, cz))
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx_, nz_ = cx + dx, cz + dz
                if 0 <= nx_ < N and 0 <= nz_ < N and MAT[nz_][nx_] == 7 and (nx_, nz_) not in set_: set_.add((nx_, nz_)); kø.append((nx_, nz_))
        if len(gruppe) < 15:
            for gx, gz in gruppe: MAT[gz][gx] = 0; BH[gz][gx] = 0

# flade tage: hver højde bliver medianen af naboerne i samme anlæg, og materialet det mest almindelige omkring
BH2 = [r[:] for r in BH]; MAT2 = [r[:] for r in MAT]
for z in range(1, N - 1):
    for x in range(1, N - 1):
        if not MAT[z][x] or MAT[z][x] == 4: continue
        nb = [(BH[z + dz][x + dx], MAT[z + dz][x + dx]) for dz in (-1, 0, 1) for dx in (-1, 0, 1) if MAT[z + dz][x + dx]]
        hs = sorted(h for h, _ in nb); BH2[z][x] = hs[len(hs) // 2]
        ms = [mm for _, mm in nb if mm != 4]; MAT2[z][x] = max(set(ms), key=ms.count) if ms else MAT[z][x]
BH, MAT = BH2, MAT2

# pladserne: det mest almindelige af asfalt, beton, grus og græs omkring hver blok (færre prikker)
PLADS = {K["asfalt"], K["beton"], K["grus"], K["græs"]}
S2 = [r[:] for r in S]
for z in range(1, N - 1):
    for x in range(1, N - 1):
        if S[z][x] not in PLADS or (x, z) in vej: continue
        nb = [S[z + dz][x + dx] for dz in (-1, 0, 1) for dx in (-1, 0, 1) if S[z + dz][x + dx] in PLADS]
        S2[z][x] = max(set(nb), key=nb.count)
S = S2

# ---------- Træer i de grønne områder ----------
CHM = lambda x, z: TOP[z][x] - H[z][x]
træer = []
for (x, z) in træcelle:
    h = CHM(x, z)
    if h < 3 or not (1 <= x < N - 1 and 1 <= z < N - 1): continue
    if any(CHM(x + dx, z + dz) > h or (CHM(x + dx, z + dz) == h and (dz, dx) < (0, 0)) for dx in (-1, 0, 1) for dz in (-1, 0, 1) if dx or dz): continue
    ts = T[z][x]; træer.append([x, z, min(30, round(h)), 0 if ts == "bar" else 2])
print("træer", len(træer))

# ---------- Kodning ----------
def rle(værdier):
    ud = bytearray(); i = 0
    while i < len(værdier):
        j = i
        while j < len(værdier) and værdier[j] == værdier[i] and j - i < 255: j += 1
        ud += bytes([j - i, værdier[i]]); i = j
    return base64.b64encode(bytes(ud)).decode()
delta = [(Hb[z][x] - (Hb[z][x - 1] if x else 0)) & 255 for z in range(N) for x in range(N)]
højder = rle(delta); overflade = rle([v for r in S for v in r]); anlæg = rle([MAT[z][x] * 32 + BH[z][x] for z in range(N) for x in range(N)])
print("størrelser", len(højder), len(overflade), len(anlæg), "maks terræn", max(map(max, Hb)), "maks anlæg", max(map(max, BH)))
os.makedirs("data", exist_ok=True)
json.dump({"N": N, "H": Hb, "S": S, "MAT": MAT, "BH": BH, "F": F, "koder": KODER, "træer": træer, "skorstene": skorstene, "kugler": kugler}, open("data/mellem.json", "w"))

def b64linjer(s, w=120): return "\n".join(f'    "{s[i:i + w]}" +' for i in range(0, len(s), w)).rstrip(" +")
tr = [v for t in træer for v in t]
træl = "\n".join("    " + ",".join(map(str, tr[i:i + 64])) + "," for i in range(0, len(tr), 64))
js = f"""// ===== Herøya industripark i Porsgrunn: kortdata til verdenen (verdener.js) =====
// Lavet af kortdata/heroeya/bygdata.py — ret ikke i hånden, kør scriptet igen.
// 1 blok = {M:g} meter vandret og {V:g} meter lodret (så fabrikkerne og skorstenen ser høje ud). Gitteret er drejet langs halvøen.
// Kilder: højder fra Kartverket (DTM og DOM, CC BY 4.0), arealtyper og treslag fra NIBIO AR5 (CC BY 4.0),
// bygninger, veje, kajer, skinner og skorstenen © OpenStreetMaps bidragydere (ODbL).
//  højder:    terrænets højde i blokke (0 = vand) — forskel til feltet til venstre, (antal, værdi)-par i base64
//  overflade: hvad der ligger øverst (se OVERFLADER) — (antal, værdi)-par i base64
//  anlæg:     materiale × 32 + højde i blokke over jorden for fabrikker, tanke, rør og huse — (antal, værdi)-par i base64
//             materialer: 1 lys industri · 2 mørk industri · 3 rust og mursten · 4 hvide tanke · 5 boliger · 6 rør · 7 bro/skib
//  træer:     x, z, højde i meter, slags (0 gran, 2 løvtræ) · skorstene: x, z, højde i blokke · kugler: x, z, radius i blokke

export const N = {N};
export const OVERFLADER = {json.dumps(KODER, ensure_ascii=False)};
export const SKORSTENE = {json.dumps(skorstene)};
export const KUGLER = {json.dumps(kugler)};
export const HØJDER =
{b64linjer(højder)};
export const OVERFLADE =
{b64linjer(overflade)};
export const ANLÆG =
{b64linjer(anlæg)};
export const TRÆER = [
{træl}
];
"""
open("../../spil/broekraft/heroeya-kort.js", "w").write(js)
print("skrev heroeya-kort.js", len(js), "tegn")
