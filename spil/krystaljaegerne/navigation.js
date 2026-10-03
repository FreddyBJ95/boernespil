// Fri sigtelinje bruges af autosigtet, følgesvenden og vejviseren.
export function friLinje(fra, til, erFrit, afstand = .35) {
  const d = Math.hypot(til.x - fra.x, til.z - fra.z), trin = Math.max(1, Math.ceil(d / afstand));
  for (let i = 0; i <= trin; i++) {
    if (!erFrit(fra.x + (til.x - fra.x) * i / trin, fra.z + (til.z - fra.z) * i / trin)) return false;
  }
  return true;
}

// Et gemt layout får en korteste vej gennem eksisterende åbne rum, aldrig gennem vægge.
export function rumRute(grotte, fra, til) {
  const celle = (p) => [Math.floor((p.x + 4) / 8), Math.floor((p.z + 4) / 8)];
  const [fx, fz] = celle(fra), [tx, tz] = celle(til), start = `${fx},${fz}`, slut = `${tx},${tz}`;
  const rum = new Set(grotte.rum.map((r) => `${r.x},${r.z}`));
  if (!rum.has(start) || !rum.has(slut)) return [];
  const kø = [start], forældre = new Map([[start, null]]);
  for (let i = 0; i < kø.length && !forældre.has(slut); i++) {
    const [x, z] = kø[i].split(",").map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = `${x + dx},${z + dz}`;
      if (rum.has(n) && !forældre.has(n)) {
        forældre.set(n, kø[i]);
        kø.push(n);
      }
    }
  }
  if (!forældre.has(slut)) return [];
  const sti = [];
  let nu = slut;
  while (nu && nu !== start) {
    const [x, z] = nu.split(",").map(Number);
    sti.unshift({ x: x * 8, z: z * 8 });
    nu = forældre.get(nu);
  }
  return [{ x: fra.x, z: fra.z }, ...sti, { x: til.x, z: til.z }];
}

// På øen kan den lille vejviser finde en omvej rundt om brønd og huse.
export function øRute(fra, til, erFrit) {
  if (!erFrit(til.x, til.z)) {
    til = nærmesteFriePunkt(til, erFrit, fra, 2.4);
    if (!til) return [];
  }
  if (friLinje(fra, til, erFrit, .05)) return [{ x: fra.x, z: fra.z }, { x: til.x, z: til.z }];
  const trin = 2, start = [Math.round(fra.x / trin), Math.round(fra.z / trin)];
  const nøgle = (x, z) => `${x},${z}`,
    forældre = new Map(),
    priser = new Map(),
    åbne = [],
    kanter = new Map(),
    felter = new Map();
  let fundet = null;
  const skub = (p) => {
    åbne.push(p);
    let i = åbne.length - 1;
    while (i > 0) {
      const j = (i - 1) >> 1;
      if (åbne[j].værdi <= p.værdi) break;
      åbne[i] = åbne[j];
      i = j;
    }
    åbne[i] = p;
  };
  const tag = () => {
    const p = åbne[0], sidste = åbne.pop();
    if (åbne.length) {
      let i = 0;
      while (true) {
        let j = i * 2 + 1;
        if (j >= åbne.length) break;
        if (j + 1 < åbne.length && åbne[j + 1].værdi < åbne[j].værdi) j++;
        if (sidste.værdi <= åbne[j].værdi) break;
        åbne[i] = åbne[j];
        i = j;
      }
      åbne[i] = sidste;
    }
    return p;
  };
  const fritFelt = (x, z) => {
    const n = nøgle(x, z);
    if (!felter.has(n)) felter.set(n, erFrit(x * trin, z * trin));
    return felter.get(n);
  };
  const skøn = (x, z) => Math.hypot(x * trin - til.x, z * trin - til.z) / trin;
  // Flere mulige første punkter gør startforbindelsen korrekt nær et rundt hus/træ.
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const x = start[0] + dx, z = start[1] + dz, n = nøgle(x, z), p = { x: x * trin, z: z * trin };
      if (!fritFelt(x, z) || !friLinje(fra, p, erFrit, .05)) continue;
      const pris = Math.hypot(p.x - fra.x, p.z - fra.z) / trin;
      priser.set(n, pris);
      forældre.set(n, null);
      skub({ x, z, pris, værdi: pris + skøn(x, z) });
    }
  }
  for (let i = 0; åbne.length && i < 10000; i++) {
    const fraFelt = tag(), { x, z, pris } = fraFelt, navn = nøgle(x, z);
    if (pris !== priser.get(navn)) continue;
    if (
      Math.hypot(x * trin - til.x, z * trin - til.z) < 3 && friLinje({ x: x * trin, z: z * trin }, til, erFrit, .05)
    ) {
      fundet = navn;
      break;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = z + dz, n = nøgle(a, b);
      if (Math.abs(a) > 34 || Math.abs(b) > 34 || pris + 1 >= (priser.get(n) ?? Infinity) || !fritFelt(a, b)) continue;
      const kant = navn < n ? `${navn}|${n}` : `${n}|${navn}`;
      if (!kanter.has(kant)) {
        kanter.set(kant, friLinje({ x: x * trin, z: z * trin }, { x: a * trin, z: b * trin }, erFrit, .05));
      }
      if (!kanter.get(kant)) continue;
      forældre.set(n, navn);
      priser.set(n, pris + 1);
      skub({ x: a, z: b, pris: pris + 1, værdi: pris + 1 + skøn(a, b) });
    }
  }
  if (!fundet) return [];
  const sti = [];
  let nu = fundet;
  while (nu) {
    const [x, z] = nu.split(",").map(Number);
    sti.unshift({ x: x * trin, z: z * trin });
    nu = forældre.get(nu);
  }
  return [{ x: fra.x, z: fra.z }, ...sti, { x: til.x, z: til.z }];
}

// Autosigte vælger kun en levende fjende, som våbnet kan nå uden en væg imellem.
export function vælgMål(fra, fjender, rækkevidde, erFrit, forrige = null) {
  const position = (f) => f.obj?.position || f.position || f;
  const kandidater = fjender.filter((f) =>
    f.hp > 0 && Math.hypot(position(f).x - fra.x, position(f).z - fra.z) <= rækkevidde &&
    friLinje(fra, position(f), erFrit)
  );
  kandidater.sort((a, b) =>
    Math.hypot(position(a).x - fra.x, position(a).z - fra.z) - Math.hypot(position(b).x - fra.x, position(b).z - fra.z)
  );
  if (forrige && kandidater.includes(forrige)) {
    const nærmest = kandidater[0];
    if (
      Math.hypot(position(forrige).x - fra.x, position(forrige).z - fra.z) <
        Math.hypot(position(nærmest).x - fra.x, position(nærmest).z - fra.z) + 2
    ) return forrige;
  }
  return kandidater[0] || null;
}

export function ruteLængde(rute) {
  return rute.reduce((n, p, i) => i ? n + Math.hypot(p.x - rute[i - 1].x, p.z - rute[i - 1].z) : 0, 0);
}

// Den gemte rute bliver en aktuel rute: pilen må springe et nået punkt over, når næste ben er frit.
export function fortsætSpor(fra, rute, erFrit) {
  if (rute.length < 2) return [];
  let næste = 1;
  for (let i = 1; i < Math.min(rute.length, 8); i++) {
    if (i > 1 && Math.hypot(rute[i].x - fra.x, rute[i].z - fra.z) > 10) break;
    if (!friLinje(fra, rute[i], erFrit, .05)) break;
    næste = i;
  }
  return [{ x: fra.x, z: fra.z }, ...rute.slice(næste)];
}

// Gamle skattekister beholder deres sted; figuren og vejviseren finder en fri plads tæt ved.
export function nærmesteFriePunkt(punkt, erFrit, mod = { x: 0, z: 0 }, afstand = 3) {
  if (erFrit(punkt.x, punkt.z)) return { x: punkt.x, z: punkt.z };
  const retning = Math.atan2(mod.x - punkt.x, mod.z - punkt.z);
  for (let r = .2; r <= afstand + .001; r += .2) {
    for (let i = 0; i < 24; i++) {
      const vinkel = retning + i * Math.PI / 12;
      const p = { x: punkt.x + Math.sin(vinkel) * r, z: punkt.z + Math.cos(vinkel) * r };
      if (erFrit(p.x, p.z)) return p;
    }
  }
  return null;
}
