# ===== Hent teksturerne til Støvbyen fra Poly Haven (polyhaven.com — alt der er CC0, frit at bruge) =====
# Kør med almindelig Python (skal have Pillow):  python hent_teksturer.py
# Billederne hentes i 2k til ud/polyhaven/ og gemmes som WebP i ../teksturer/ i den størrelse, spillet bruger.
#   farve:  farven (sRGB)      normal: fladens små buler (OpenGL-retning, som three.js bruger)
#   arm:    rød = skygge i krogene (AO), grøn = ruhed, blå = metal

import json, os, urllib.request
from PIL import Image

MAPPE = os.path.dirname(os.path.abspath(__file__))
KILDE = os.path.join(MAPPE, "ud", "polyhaven")
MÅL = os.path.normpath(os.path.join(MAPPE, "..", "teksturer"))

# navn i spillet: (Poly Haven-id, størrelse på farvebilledet, farven ganges med (rød, grøn, blå) — så det passer til en lys ørkenby)
TEKSTURER = {
    "sandsten": ("sandstone_blocks_08", 2048, (1.0, 1.0, 1.0)),
    "puds": ("beige_wall_002", 2048, (1.4, 1.3, 1.14)),
    "sand": ("gravelly_sand", 2048, (1.12, 1.1, 1.08)),
    "fliser": ("rock_tile_floor", 2048, (1.1, 1.0, 0.86)),
    "doer": ("blue_painted_planks", 1024, (1.0, 1.0, 1.0)),
    "planker": ("weathered_planks", 1024, (1.6, 1.42, 1.2)),
    "metal": ("green_metal_rust", 1024, (1.0, 1.0, 1.0)),
    "bark": ("palm_tree_bark", 1024, (0.9, 0.85, 0.78)),
}
KORT = {"farve": ("Diffuse", None), "normal": ("nor_gl", 1024), "arm": ("arm", 1024)}


def hent(url, fil):
    if os.path.exists(fil): return
    req = urllib.request.Request(url, headers={"User-Agent": "Spilkassen-boernespil/1.0"})
    with urllib.request.urlopen(req) as svar, open(fil, "wb") as f: f.write(svar.read())


os.makedirs(KILDE, exist_ok=True); os.makedirs(MÅL, exist_ok=True)
info = {}
for navn, (ph, str_farve, gang) in TEKSTURER.items():
    req = urllib.request.Request(f"https://api.polyhaven.com/files/{ph}", headers={"User-Agent": "Spilkassen-boernespil/1.0"})
    filer = json.load(urllib.request.urlopen(req))
    req = urllib.request.Request(f"https://api.polyhaven.com/info/{ph}", headers={"User-Agent": "Spilkassen-boernespil/1.0"})
    meta = json.load(urllib.request.urlopen(req))
    for kort, (nøgle, str_) in KORT.items():
        url = filer[nøgle]["2k"]["jpg"]["url"]
        kilde = os.path.join(KILDE, os.path.basename(url)); hent(url, kilde)
        im = Image.open(kilde).convert("RGB")
        s = str_ or str_farve
        if im.width != s: im = im.resize((s, s), Image.LANCZOS)
        if kort == "farve" and gang != (1.0, 1.0, 1.0):
            im = Image.merge("RGB", [b.point(lambda v, f=f: min(255, round(v * f))) for b, f in zip(im.split(), gang)])
        im.save(os.path.join(MÅL, f"{navn}_{kort}.webp"), "WEBP", quality=88 if kort == "normal" else 84, method=6)
    snit = Image.open(os.path.join(MÅL, f"{navn}_farve.webp")).resize((1, 1), Image.BOX).getpixel((0, 0))
    info[navn] = {"polyhaven": ph, "meter": round(meta["dimensions"][0] / 1000, 3), "snitfarve": snit}
    print(navn, ph, info[navn])

with open(os.path.join(MÅL, "teksturer.json"), "w", encoding="utf-8") as f: json.dump(info, f, ensure_ascii=False, indent=1)
