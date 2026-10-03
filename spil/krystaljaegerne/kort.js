// Det samme nordvendte kort bruges både i hjørnet og som et stort rejsekort.
export function tegnRejsekort(canvas, { s, verden, fjender, ting, mål, rute = [], tid = 0, stort = false }) {
  const g = canvas.getContext("2d"), w = canvas.width, h = canvas.height, cx = w / 2, cz = h / 2;
  g.clearRect(0, 0, w, h);
  g.save();
  if (!stort) {
    g.beginPath();
    g.arc(cx, cz, w / 2 - 2, 0, Math.PI * 2);
    g.clip();
  }
  g.fillStyle = "#102837";
  g.fillRect(0, 0, w, h);
  const radius = s.grotte
    ? Math.max(12, ...verden.grotte.rum.map((r) => Math.max(Math.abs(r.x * 8), Math.abs(r.z * 8)) + 6))
    : 74;
  const skala = (Math.min(w, h) / 2 - 18) / radius;
  const punkt = (x, z) => [cx + x * skala, cz + z * skala];
  if (s.grotte) {
    g.fillStyle = ["#3f756a", "#72658b", "#886951"][s.grotte.id];
    for (const r of verden.grotte.rum) {
      const p = punkt(r.x * 8 - 3.8, r.z * 8 - 3.8);
      g.fillRect(p[0], p[1], 7.6 * skala, 7.6 * skala);
    }
  } else {
    g.fillStyle = "#426e62";
    g.beginPath();
    g.arc(cx, cz, 70 * skala, 0, Math.PI * 2);
    g.fill();
    for (
      const [x, z, r, f] of [[-36, 10, 22, "#31584f"], [34, 0, 22, "#70817a"], [10, -43, 22, "#5b657c"], [
        0,
        0,
        15,
        "#919c82",
      ]]
    ) {
      g.fillStyle = f;
      g.beginPath();
      g.arc(...punkt(x, z), r * skala, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = "#afa07877";
    g.lineWidth = stort ? 3 : 1;
    for (const t of verden.steder) {
      g.beginPath();
      g.moveTo(cx, cz);
      g.lineTo(...punkt(t.x, t.z));
      g.stroke();
    }
    if (stort) {
      g.fillStyle = "#c6dad1";
      g.font = "13px system-ui";
      g.textAlign = "center";
      for (const [navn, x, z] of [["Mosskoven", -37, 34], ["Kobberruinerne", 38, 21], ["Havnen", 0, 61]]) {
        g.fillText(navn, ...punkt(x, z));
      }
    }
  }
  if (rute.length > 1) {
    g.strokeStyle = "#edd899";
    g.lineWidth = stort ? 3 : 2;
    g.setLineDash(stort ? [7, 5] : [3, 3]);
    g.beginPath();
    rute.forEach((p, i) => i ? g.lineTo(...punkt(p.x, p.z)) : g.moveTo(...punkt(p.x, p.z)));
    g.stroke();
    g.setLineDash([]);
  }
  const prik = (x, z, farve, r) => {
    g.fillStyle = farve;
    g.beginPath();
    g.arc(...punkt(x, z), r, 0, Math.PI * 2);
    g.fill();
  };
  for (const t of ting) {
    if (stort) prik(t.x, t.z, t.type === "kiste" ? "#f1c589" : "#76ebdc", t.type === "kiste" ? 3.5 : 2.5);
  }
  for (const t of verden.steder) {
    prik(t.x, t.z, "#ead7af", stort ? 5 : 3);
    if (stort) {
      const p = punkt(t.x, t.z);
      g.fillStyle = "#eff0dc";
      g.font = "bold 12px system-ui";
      g.textAlign = t.x > 10 ? "right" : t.x < -10 ? "left" : "center";
      g.fillText(t.navn, p[0] + (t.x > 10 ? -8 : t.x < -10 ? 8 : 0), p[1] - 10);
    }
  }
  for (const f of fjender) {
    if (f.hp > 0) {
      prik(
        f.obj.position.x,
        f.obj.position.z,
        f.boss ? "#d49bdc" : "#d38a80",
        f.boss ? stort ? 6 : 3 : stort ? 3 : 1.5,
      );
    }
  }
  if (mål) {
    g.strokeStyle = "#ffe3a0";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(...punkt(mål.x, mål.z), (stort ? 10 : 6) + (s.valg?.roligeEffekter ? 0 : Math.sin(tid * 4)), 0, Math.PI * 2);
    g.stroke();
  }
  prik(s.x, s.z, "#80ffdf", stort ? 6 : 3.5);
  g.strokeStyle = "#16372f";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(...punkt(s.x, s.z), stort ? 6 : 3.5, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#c4ddd5";
  g.font = `${stort ? 14 : 10}px system-ui`;
  g.textAlign = "center";
  g.fillText("N ↑", cx, stort ? 20 : 14);
  g.restore();
}
