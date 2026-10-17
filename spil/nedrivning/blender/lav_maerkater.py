# ===== Mærkater og skilte til modellerne (tekst, advarselsrudere og striber) =====
# Køres med almindelig Python (Pillow + numpy) — lav_modeller.py kører den selv først:
#   python lav_maerkater.py
# Billederne er gennemsigtige PNG'er i prøver/mærkater/ (mellemprodukter, de laves igen hver gang).
# I Blender lægges de på modellernes procedurale lak, før slid, rust og snavs kommer ovenpå,
# så mærkaterne slides og bliver beskidte sammen med resten. Alle navne er opdigtede.

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

MAPPE = os.path.dirname(os.path.abspath(__file__))
UD = os.path.join(MAPPE, "prøver", "mærkater")
SKRIFTER = "C:/Windows/Fonts/"
rng = np.random.default_rng(7)

SORT = (18, 18, 18, 255)
GUL = (236, 178, 22, 255)
RØD = (178, 24, 20, 255)
HVID = (240, 238, 230, 255)


def skrift(navn, str_, variant=None):
    """Hent en skrifttype fra Windows (falder tilbage til Pillows egen, hvis den mangler)"""
    try:
        f = ImageFont.truetype(SKRIFTER + navn, str_)
        if variant:
            try: f.set_variation_by_name(variant)
            except Exception: pass
        return f
    except OSError:
        return ImageFont.load_default(str_)


def tekst(d, xy, s, f, fyld, anker="mm"):
    d.text(xy, s, font=f, fill=fyld, anchor=anker)


def sprøjt(im, sløring=1.2, prikker=0.04):
    """Sprøjtemaling gennem en skabelon: bløde kanter og lidt tåge af små prikker rundt om"""
    a = np.asarray(im).astype(np.float32)
    alfa = Image.fromarray(a[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(sløring * 3))
    tåge = np.asarray(alfa).astype(np.float32) / 255
    støj = rng.random(tåge.shape)
    ekstra = (støj < tåge * prikker * 6) * 160
    skarp = np.asarray(Image.fromarray(a[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(sløring))).astype(np.float32)
    a[..., 3] = np.clip(np.maximum(skarp, ekstra) * (0.85 + 0.15 * rng.random(tåge.shape)), 0, 255)
    farve = a[..., :3].max(axis=(0, 1))       # alle synlige pixels får maleriets farve (prikkerne også)
    hvor = a[..., 3] > 0
    for k in range(3):
        kanal = a[..., k]; kanal[hvor & (kanal == 0)] = farve[k]
    return Image.fromarray(a.astype(np.uint8), "RGBA")


FLAMME = [(0.50, 1.00), (0.30, 0.97), (0.17, 0.86), (0.12, 0.70), (0.16, 0.52), (0.27, 0.36), (0.31, 0.50), (0.37, 0.30),
          (0.46, 0.14), (0.56, 0.00), (0.57, 0.18), (0.66, 0.36), (0.73, 0.24), (0.81, 0.42), (0.88, 0.62), (0.85, 0.80),
          (0.74, 0.94), (0.62, 0.99)]
FLAMME_INDE = [(0.50, 0.95), (0.39, 0.90), (0.34, 0.79), (0.38, 0.64), (0.47, 0.52), (0.51, 0.64), (0.58, 0.56), (0.65, 0.69),
               (0.64, 0.83), (0.58, 0.92)]


def flamme(d, x0, y0, h, fyld, bund):
    """En flamme som på advarselsskilte (med et hul forneden) over en streg"""
    d.polygon([(x0 + px * h, y0 + py * h) for px, py in FLAMME], fill=fyld)
    d.polygon([(x0 + px * h, y0 + py * h) for px, py in FLAMME_INDE], fill=bund)
    d.rectangle([x0 + 0.02 * h, y0 + 1.06 * h, x0 + 0.98 * h, y0 + 1.14 * h], fill=fyld)


def rude(str_, bund, kant, symbol, tal=None):
    """En advarselsrude (firkant stillet på spidsen) med kant og en flamme — tegnet 4 gange større og skaleret ned"""
    S = str_ * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = S / 2; r = S / 2 - 8
    d.polygon([(c, c - r), (c + r, c), (c, c + r), (c - r, c)], fill=kant)
    r2 = r * 0.9
    d.polygon([(c, c - r2), (c + r2, c), (c, c + r2), (c - r2, c)], fill=bund)
    h = S * 0.36
    flamme(d, c - h / 2, c - S * 0.31, h, symbol, bund)
    if tal:
        tekst(d, (c, c + S * 0.3), tal, skrift("arialbd.ttf", int(S * 0.12)), symbol)
    return im.resize((str_, str_), Image.LANCZOS)


def gem(im, navn):
    os.makedirs(UD, exist_ok=True)
    im.save(os.path.join(UD, navn + ".png"))
    print("MÆRKAT", navn, im.size)


# ---------- Tønden: gul brandfare-rude ----------
gem(rude(512, GUL, SORT, SORT, "3"), "brandfare")

# ---------- Tønden: sprøjtet stencil-tekst ----------
im = Image.new("RGBA", (1024, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (512, 128), "200 L  OLIE", skrift("STENCIL.TTF", 150), HVID)
gem(sprøjt(im, 1.4), "toende_tekst")

# ---------- Gasflasken: "PROPAN" og vægt ----------
im = Image.new("RGBA", (1024, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (512, 190), "PROPAN", skrift("bahnschrift.ttf", 230, "Bold"), HVID)
tekst(d, (512, 380), "11 kg  ·  TARA 12,4 kg", skrift("bahnschrift.ttf", 90, "SemiBold"), HVID)
gem(im, "propan")
gem(rude(256, (205, 30, 26, 255), HVID, SORT, "2"), "gasrude")

# ---------- Dynamitten: papiret med påtryk ----------
im = Image.new("RGBA", (1024, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
f = skrift("impact.ttf", 120)
tekst(d, (512, 100), "NEDRIVNING", f, SORT)
tekst(d, (512, 200), "FARLIG  ·  HÅNDTERES MED OMHU", skrift("arialbd.ttf", 54), SORT)
gem(im, "dynamit_tryk")

# ---------- Plastikblokken: etiket under filmen ----------
im = Image.new("RGBA", (1024, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rectangle([4, 4, 1019, 251], fill=(205, 196, 150, 255))
d.rectangle([4, 4, 1019, 251], outline=SORT, width=6)
tekst(d, (512, 92), "LADNING  ·  NEDRIVNING", skrift("bahnschrift.ttf", 84, "Bold"), SORT)
tekst(d, (512, 188), "PARTI 26-10  ·  OPBEVARES TØRT", skrift("bahnschrift.ttf", 52, "SemiBold"), SORT)
gem(im, "blok_etiket")

# ---------- Trækassen: stort rødt TNT og sort tekst (sprøjtet gennem skabelon) ----------
im = Image.new("RGBA", (1024, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (512, 230), "TNT", skrift("STENCIL.TTF", 360), RØD)
gem(sprøjt(im, 1.6), "tnt_roed")
im = Image.new("RGBA", (1024, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (512, 70), "SPRÆNGSTOF", skrift("STENCIL.TTF", 96), SORT)
tekst(d, (512, 440), "HÅNDTERES FORSIGTIGT - 25 kg", skrift("STENCIL.TTF", 64), SORT)
gem(sprøjt(im, 1.4), "tnt_sort")

# ---------- Gastanken: PROPAN, BRANDFARLIG og rygning forbudt ----------
im = Image.new("RGBA", (2048, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (1024, 210), "PROPAN", skrift("bahnschrift.ttf", 300, "Bold"), (30, 60, 140, 255))
tekst(d, (1024, 430), "BRANDFARLIG GAS  ·  TANK NR. 4", skrift("bahnschrift.ttf", 110, "SemiBold"), (30, 60, 140, 255))
gem(im, "gastank_tekst")
im = Image.new("RGBA", (512, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.ellipse([16, 16, 496, 496], fill=(200, 28, 24, 255)); d.ellipse([60, 60, 452, 452], fill=HVID)
d.rectangle([110, 230, 370, 282], fill=SORT); d.rectangle([374, 230, 400, 282], fill=(220, 90, 20, 255))  # cigaret
for i in range(3):
    d.arc([380 + i * 6, 150 - i * 20, 420 + i * 6, 230 - i * 20], 200, 340, fill=SORT, width=8)
d.line([(110, 110), (402, 402)], fill=(200, 28, 24, 255), width=44)
gem(im, "rygning_forbudt")

# ---------- Skurvognen: firmaskilt og "KONTOR" ----------
im = Image.new("RGBA", (2048, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 2047, 511], fill=GUL)
for i in range(-4, 60):                       # sort/gule skråstriber langs kanten
    x = i * 64
    d.polygon([(x, 0), (x + 32, 0), (x + 32 - 40, 44), (x - 40, 44)], fill=SORT)
    d.polygon([(x, 467), (x + 32, 467), (x + 32 - 40, 511), (x - 40, 511)], fill=SORT)
d.rectangle([0, 44, 2047, 467], fill=HVID)
tekst(d, (1024, 210), "NEDRIVNINGSFIRMAET", skrift("bahnschrift.ttf", 220, "Bold Condensed"), SORT)
tekst(d, (1024, 380), "Nedrivning  ·  Sprængning  ·  Bortskaffelse", skrift("bahnschrift.ttf", 100, "SemiBold"), (40, 40, 44, 255))
gem(im, "firmaskilt")
im = Image.new("RGBA", (512, 160), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rounded_rectangle([0, 0, 511, 159], 18, fill=(30, 70, 150, 255)); d.rounded_rectangle([10, 10, 501, 149], 12, outline=HVID, width=6)
tekst(d, (256, 82), "KONTOR", skrift("bahnschrift.ttf", 100, "Bold"), HVID)
gem(im, "kontor")

# ---------- Tændingsboksen: messingplade ----------
im = Image.new("RGBA", (512, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rounded_rectangle([0, 0, 511, 255], 20, fill=(176, 138, 62, 255))
d.rounded_rectangle([12, 12, 499, 243], 14, outline=(70, 52, 20, 255), width=5)
tekst(d, (256, 95), "TÆNDING", skrift("bahnschrift.ttf", 92, "Bold"), (52, 36, 12, 255))
tekst(d, (256, 188), "MODEL 10  ·  NR. 0417", skrift("bahnschrift.ttf", 44, "SemiBold"), (52, 36, 12, 255))
for x in (36, 476):
    d.ellipse([x - 12, 116, x + 12, 140], fill=(110, 86, 40, 255))
gem(im, "boks_plade")

# ---------- Gravkoen: advarselsstriber og firmanavn ----------
im = Image.new("RGBA", (2048, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 2047, 511], fill=GUL)
for i in range(-4, 20):
    x = i * 256
    d.polygon([(x, 0), (x + 128, 0), (x + 128 + 256, 511), (x + 256, 511)], fill=SORT)
gem(im.resize((1024, 256), Image.LANCZOS), "striber")
im = Image.new("RGBA", (2048, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (1024, 128), "NEDRIVNINGSFIRMAET", skrift("bahnschrift.ttf", 200, "Bold Condensed"), SORT)
gem(im, "gravko_navn")
im = Image.new("RGBA", (512, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
tekst(d, (256, 128), "G 210", skrift("bahnschrift.ttf", 190, "Bold"), SORT)
gem(im, "gravko_model")
