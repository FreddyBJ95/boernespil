# ===== Hent optagelserne fra Freesound (forhåndslyttefilerne i god kvalitet) og tjek, at licensen er CC0 =====
# Kør med almindelig Python:  python hent_lyde.py   → ud/lyd/<id>.mp3 og ud/lyd/info.json
# Bagefter klippes de til af klip_lyde.py (i Blender), som gemmer dem i ../lyde/.
import re, sys, json, urllib.request, html, os
os.chdir(os.path.dirname(os.path.abspath(__file__))); os.makedirs("ud/lyd", exist_ok=True)
IDS = [165808,251401,475780,127943,160798,752629,324277,741173,698400,712918,845932,487142,35888,703247,703248,389303,843339,321478,336425,221528,758207,587443,471192,109359,414767,615668,131930,442773,587173,588199,569846,702903,162674,675736,461085]
UA = {"User-Agent": "Mozilla/5.0"}
info = {}
for i in IDS:
    req = urllib.request.Request(f"https://freesound.org/s/{i}/", headers=UA)
    t = urllib.request.urlopen(req).read().decode("utf8", "replace")
    lic = "zero" in t and "publicdomain/zero" in t
    m = re.search(r'https://cdn\.freesound\.org/previews/\d+/\d+_\d+-hq\.mp3', t)
    titel = html.unescape(re.search(r'<title>(.*?)</title>', t, re.S).group(1).strip())
    url = m.group(0) if m else None
    if url and lic:
        fil = f"ud/lyd/{i}.mp3"
        if not os.path.exists(fil):
            open(fil, "wb").write(urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read())
        info[i] = {"titel": titel, "url": f"https://freesound.org/s/{i}/", "kb": os.path.getsize(fil)//1024}
    print(i, "CC0" if lic else "IKKE CC0", titel[:70], info.get(i, {}).get("kb"))
json.dump(info, open("ud/lyd/info.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
