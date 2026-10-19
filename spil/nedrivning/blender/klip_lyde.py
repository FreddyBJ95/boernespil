# ===== Klip optagelserne til, gør dem lige kraftige og gem dem som mp3 i ../lyde/ =====
# Kør i Blender (den har en mp3-koder indbygget):  blender --background --factory-startup --python klip_lyde.py
import aud, numpy as np, os, json
mappe = os.path.dirname(os.path.abspath(__file__))
KLIP = {  # navn: (freesound-id, start, slut, fade ud)
  "tnt": (165808, 1.95, 12.5, 1.5),
  "bjerg": (251401, 0.0, 13.0, 3.0),
  "mine": (475780, 0.0, 16.0, 4.0),
  "minesprengning": (127943, 0.3, 9.0, 2.0),
  "dynamit": (160798, 0.0, 6.5, 2.0),
  "knald": (752629, 0.0, 5.0, 1.5),
  "fjern": (324277, 0.0, 6.5, 2.0),
  "stor": (741173, 0.0, 7.5, 2.0),
  "kontrolleret": (698400, 4.85, 9.8, 1.5),
  "styrt_kort": (712918, 0.0, 3.0, 0.6),
  "styrt": (845932, 0.0, 7.9, 1.5),
  "traehus": (487142, 0.0, 8.1, 1.0),
  "nedrivning": (35888, 0.0, 10.0, 2.0),
  "brokker_stor": (703247, 0.0, 4.7, 1.0),
  "brokker": (703248, 0.0, 3.9, 1.0),
  "stenskred": (389303, 0.1, 8.5, 1.5),
  "beton": (843339, 1.2, 8.8, 0.5),
  "slag": (321478, 0.35, 0.8, 0.1),
  "glas_fald": (336425, 0.6, 3.7, 0.5),
  "glas": (221528, 0.25, 1.9, 0.4),
  "glas2": (758207, 0.0, 1.9, 0.4),
  "metal_fald": (587443, 0.0, 3.2, 0.8),
  "metal": (471192, 0.0, 1.5, 0.4),
  "trae_knaek": (109359, 0.25, 2.4, 0.4),
  "ild": (414767, 20.0, 36.0, 0.0),
  "gas": (615668, 0.0, 7.9, 0.0),
  "horn": (131930, 0.0, 2.6, 0.3),
  "plask": (442773, 0.0, 2.2, 0.5),
  "raket": (587173, 0.0, 2.3, 0.4),
  "floejt": (588199, 0.0, 3.0, 0.6),
  "fyrvaerkeri": (569846, 0.0, 11.0, 1.0),
  "lavine": (702903, 0.0, 14.0, 0.0),
  "sneskred": (162674, 0.6, 6.1, 1.5),
  "jordskred": (675736, 16.0, 28.0, 2.0),
  "gnist": (461085, 0.0, 7.9, 0.0),
}
ud = os.path.normpath(os.path.join(mappe, "..", "lyde")); os.makedirs(ud, exist_ok=True)
for navn, (i, a, b, fade) in KLIP.items():
    s = aud.Sound(os.path.join(mappe, "ud", "lyd", f"{i}.mp3"))
    rate, kanaler = int(s.specs[0]), int(s.specs[1])
    x = s.data()[int(a * rate):int(b * rate)].astype(np.float32)
    if x.ndim == 1: x = x[:, None]
    n = len(x)
    ind = int(0.004 * rate); x[:ind] *= np.linspace(0, 1, ind)[:, None]          # ingen klik i starten
    if fade > 0:
        f = int(fade * rate); x[-f:] *= (np.linspace(1, 0, f) ** 2)[:, None]
    x *= 0.95 / max(1e-4, np.abs(x).max())
    lyd = aud.Sound.buffer(np.ascontiguousarray(x), rate)
    fil = os.path.join(ud, f"{navn}.mp3")
    lyd.write(fil, rate, kanaler, aud.FORMAT_S16, aud.CONTAINER_MP3, aud.CODEC_MP3, 128000 if kanaler == 2 else 96000)
    print(navn, round(n / rate, 2), "s", os.path.getsize(fil) // 1024, "kB")
