# ===== Murstensvæggen: et billede af røde danske mursten, der kan gentages i begge retninger =====
# Køres med almindelig Python (numpy, scipy og Pillow):
#   python lav_mursten.py
# Billedet dækker præcis 1 × 1 meter væg: 4 sten i hvert skifte (løberforbandt, hvert andet skifte
# forskudt en halv sten) og 16 skifter i højden. Stenene er 24 × 5,3 cm med ca. 1 cm fuger, så
# mønsteret går op i hele meter og kan gentages uden synlige samlinger.
# Det giver tre billeder i ../teksturer/:
#   mursten_farve.webp  — farven (sRGB)
#   mursten_normal.webp — buler og fuger (OpenGL: grøn peger op)
#   mursten_arm.webp    — R = skygge i krogene, G = ruhed, B = metal (0)
# og mursten.json med {"meter": 1.0}.

import os, json
import numpy as np
from PIL import Image

MAPPE = os.path.dirname(os.path.abspath(__file__))
UD = os.path.normpath(os.path.join(MAPPE, "..", "teksturer"))

N = 2048                       # vi regner i dobbelt opløsning og skalerer ned til sidst (glatte kanter)
SLUT = 1024
PX = 1.0 / N                   # meter pr. pixel
STEN_L, MODUL_L = 0.240, 0.250  # stenens længde og længden inkl. stødfuge
STEN_H, MODUL_H = 0.053, 0.0625 # stenens højde og højden inkl. liggefuge
PR_SKIFTE, SKIFTER = 4, 16

rng = np.random.default_rng(1954)


# ---------- Støj, der kan gentages (filtreret hvid støj via FFT er altid periodisk) ----------
_k = np.fft.fftfreq(N, d=1.0 / N)            # bølger pr. meter
_KX, _KY = np.meshgrid(_k, _k)
_K2 = _KX ** 2 + _KY ** 2


def støj(skala_m, oktaver=1, ruhed=0.5, lodret=1.0):
    """Glat støj med strukturer på ca. skala_m meter (lodret > 1: aflange, lodrette striber). Middel 0, spredning ca. 1"""
    ud = np.zeros((N, N)); vægt = 1.0; total = 0.0
    for o in range(oktaver):
        s = skala_m / (2 ** o)
        hvid = np.fft.fft2(rng.standard_normal((N, N)))
        filt = np.exp(-(_KX ** 2 + _KY ** 2 * lodret ** 2) * (s ** 2) * 2.0)
        lag = np.real(np.fft.ifft2(hvid * filt))
        lag /= lag.std() + 1e-9
        ud += vægt * lag; total += vægt; vægt *= ruhed
    return ud / total


def glat_trin(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def sløring(a, sigma_px):
    """Gaussisk sløring, der går rundt om kanterne (så billedet stadig kan gentages)"""
    F = np.fft.fft2(a)
    filt = np.exp(-_K2 * (sigma_px * PX) ** 2 * 2 * np.pi ** 2)
    return np.real(np.fft.ifft2(F * filt))


# ---------- Hvor ligger stenene? ----------
y, x = np.mgrid[0:N, 0:N].astype(np.float64) * PX + PX / 2
# fugerne er ikke helt lige: en smule krumning fra murerens hånd
x_bølge = x + støj(0.05) * 0.0006
y_bølge = y + støj(0.05) * 0.0005
skifte = np.floor(y_bølge / MODUL_H).astype(int) % SKIFTER
forskyd = (skifte % 2) * (MODUL_L / 2)
xs = x_bølge + forskyd
nr_i_skifte = np.floor(xs / MODUL_L).astype(int) % PR_SKIFTE
lx = np.mod(xs, MODUL_L)                    # sted inde i modulet
ly = np.mod(y_bølge, MODUL_H)
sten_id = skifte * PR_SKIFTE + nr_i_skifte
ANTAL = SKIFTER * PR_SKIFTE

# hver sten er lidt forskellig i størrelse og placering (± 1 mm)
v0 = rng.uniform(0.000, 0.0015, ANTAL)[sten_id]; v1 = STEN_L - rng.uniform(0.000, 0.0015, ANTAL)[sten_id]
t0 = rng.uniform(0.000, 0.0012, ANTAL)[sten_id]; t1 = STEN_H - rng.uniform(0.000, 0.0012, ANTAL)[sten_id]
afstand = np.minimum.reduce([lx - v0, v1 - lx, ly - t0, t1 - ly])   # > 0 inde i stenen (meter til kanten)
afstand = afstand + støj(0.004) * 0.0005                              # ujævne, lidt slidte kanter
sten = glat_trin(-0.0003, 0.0003, afstand)                            # 1 på stenen, 0 i fugen

# ---------- Afslag: små stykker slået af kanterne og hjørnerne ----------
afslag_støj = støj(0.006, 2)
afslag_lyst = rng.uniform(0, 1, ANTAL)[sten_id]
afslag = glat_trin(1.25, 1.9, afslag_støj + (afslag_lyst > 0.55) * 0.5) * glat_trin(0.007, 0.0015, afstand) * sten

# ---------- Højden (meter): fugerne ligger 3–4 mm inde, kanterne er afrundede ----------
kant_fald = -0.0014 * (1 - glat_trin(0.0, 0.0025, afstand)) ** 2
sten_flade = støj(0.03) * 0.00025 + støj(0.0015, 2) * 0.00008       # bølger og sandkorn i overfladen
huller = glat_trin(2.3, 3.0, støj(0.0008)) * -0.0006                 # små porer
sten_h = kant_fald + sten_flade + huller - afslag * 0.0028
fuge_h = -0.0035 + støj(0.0012, 2) * 0.00018 + støj(0.02) * 0.0004
højde = sten * sten_h + (1 - sten) * fuge_h

# ---------- Farven ----------
def hsv_til_rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    vælg = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]
    r = np.choose(i, [c[0] for c in vælg]); g = np.choose(i, [c[1] for c in vælg]); b = np.choose(i, [c[2] for c in vælg])
    return np.stack([r, g, b], axis=-1)

# hver sten får sin egen nuance: de fleste teglrøde, nogle mørkt brændte, enkelte mere orange
slags = rng.uniform(0, 1, ANTAL)
nuance = np.where(slags < 0.12, 0.022, np.where(slags > 0.94, 0.052, 0.034)) + rng.normal(0, 0.005, ANTAL)
mætning = np.where(slags < 0.12, 0.55, np.where(slags > 0.94, 0.55, 0.60)) + rng.normal(0, 0.035, ANTAL)
lysstyrke = np.where(slags < 0.12, 0.38, np.where(slags > 0.94, 0.66, 0.56)) * rng.uniform(0.88, 1.10, ANTAL)
h_s, s_s, v_s = nuance[sten_id], mætning[sten_id], lysstyrke[sten_id]

# brændingsskyer inde i stenen og en mørkere ende på nogle sten (der lå tættest på ilden i ovnen)
skyer = støj(0.025, 3, 0.55)
ende = rng.uniform(-1, 1, ANTAL)[sten_id] * (lx - STEN_L / 2) / (STEN_L / 2)
v_s = v_s * (1 + 0.09 * skyer) * (1 - 0.12 * np.clip(ende, 0, 1) * (rng.uniform(0, 1, ANTAL)[sten_id] > 0.6))
h_s = h_s + 0.004 * støj(0.04)
sten_rgb = hsv_til_rgb(np.mod(h_s, 1), np.clip(s_s, 0, 1), np.clip(v_s, 0, 1))
# sandkorn: lyse og mørke prikker
korn = støj(0.0007)
sten_rgb *= (1 + 0.12 * np.clip(korn - 1.4, 0, 3))[..., None] * (1 - 0.30 * glat_trin(1.6, 2.4, -korn))[..., None]
sten_rgb *= (1 + 0.04 * støj(0.002))[..., None]
# afslagene er friske brud: lysere og mere orange
sten_rgb = sten_rgb * (1 - afslag[..., None] * 0.35) + afslag[..., None] * 0.35 * np.array([0.72, 0.40, 0.27])
# udblomstring: hvide salt-skjolder på enkelte sten
salt = glat_trin(1.2, 2.6, støj(0.03) + (rng.uniform(0, 1, ANTAL)[sten_id] > 0.9) * 1.0) * glat_trin(0.02, 0.0, ly) * 0.18
sten_rgb = sten_rgb * (1 - salt[..., None]) + salt[..., None] * np.array([0.80, 0.76, 0.70])

# mørtlen: lysegrå med sandkorn og lidt mørkere skjolder
fuge_v = 0.63 + 0.04 * støj(0.03) + 0.07 * støj(0.0009) - 0.10 * glat_trin(0.5, 2.0, støj(0.08))
fuge_rgb = np.stack([fuge_v * 1.0, fuge_v * 0.985, fuge_v * 0.945], axis=-1)

farve = sten[..., None] * sten_rgb + (1 - sten[..., None]) * fuge_rgb

# snavs over hele væggen: regnstriber og støv (bredt og lodret aflangt)
skjold = støj(0.18, 2)
striber = støj(0.012, 1, 0.5, 8) * 0.6 + støj(0.05, 1, 0.5, 5) * 0.4
snavs = np.clip(0.06 * skjold + 0.03 * striber, -0.1, 0.12)
farve = farve * (1 - snavs[..., None]) + snavs[..., None] * np.array([0.22, 0.19, 0.16]) * (snavs[..., None] > 0)

# ---------- Skygge i krogene (AO): lavere end omgivelserne = mørkere ----------
dybde = np.clip(sløring(højde, 6) - højde, 0, None) + 0.6 * np.clip(sløring(højde, 2) - højde, 0, None)
ao = np.clip(1 - dybde / 0.0016, 0.25, 1.0)
farve = farve * (0.80 + 0.20 * ao[..., None])             # lidt af skyggen med i farven, som i et foto

# ---------- Ruhed ----------
ruhed = sten * (0.84 + 0.04 * støj(0.02)) + (1 - sten) * 0.95
ruhed = np.clip(ruhed + afslag * 0.04 + salt * 0.05, 0, 1)

# ---------- Normalkort fra højden (OpenGL: +Y = op i billedet) ----------
def normalkort(h, px):
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) / (2 * px)   # mod højre
    dy = (np.roll(h, 1, axis=0) - np.roll(h, -1, axis=0)) / (2 * px)   # op (rækkerne tæller nedad)
    n = np.stack([-dx, -dy, np.ones_like(h)], axis=-1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)


def ned(a):
    """Fra 2048 til 1024: gennemsnit af 2 × 2 pixels"""
    return a.reshape(SLUT, 2, SLUT, 2, *a.shape[2:]).mean(axis=(1, 3))


n = normalkort(højde, PX)
n_lille = ned(n); n_lille /= np.linalg.norm(n_lille, axis=-1, keepdims=True)

os.makedirs(UD, exist_ok=True)
# farverne ovenfor er tænkt som sRGB-værdier (som i et foto)
farve8 = (np.clip(ned(farve), 0, 1) * 255 + 0.5).astype(np.uint8)
normal8 = (np.clip(n_lille * 0.5 + 0.5, 0, 1) * 255 + 0.5).astype(np.uint8)
arm8 = (np.clip(np.stack([ned(ao), ned(ruhed), np.zeros((SLUT, SLUT))], axis=-1), 0, 1) * 255 + 0.5).astype(np.uint8)
Image.fromarray(farve8, "RGB").save(os.path.join(UD, "mursten_farve.webp"), quality=90, method=6)
Image.fromarray(normal8, "RGB").save(os.path.join(UD, "mursten_normal.webp"), quality=92, method=6)
Image.fromarray(arm8, "RGB").save(os.path.join(UD, "mursten_arm.webp"), quality=90, method=6)
with open(os.path.join(UD, "mursten.json"), "w", encoding="utf-8") as f:
    json.dump({"meter": 1.0}, f)

# en prøve med 2 × 2 gentagelser, så man kan se, om samlingerne er usynlige
prøve = np.tile(farve8, (2, 2, 1))
os.makedirs(os.path.join(MAPPE, "prøver"), exist_ok=True)
Image.fromarray(prøve).resize((1024, 1024), Image.LANCZOS).save(os.path.join(MAPPE, "prøver", "mursten_2x2.png"))
for fil in ("mursten_farve.webp", "mursten_normal.webp", "mursten_arm.webp"):
    print(fil, os.path.getsize(os.path.join(UD, fil)) // 1024, "kB")
