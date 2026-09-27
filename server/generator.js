// Samme rækkefølge og tilfældige tal som tabletternes generator.
import { rng, lavStøj } from "../spil/broekraft/verden.js";
import { ID } from "../spil/broekraft/blokke.js";
import { VERDENER } from "../spil/broekraft/verdener.js";

export function generer({ type, frø, bredde: BX, højde: BY, dybde: BZ }, fremgang = () => {}) {
  const opskrift = VERDENER.find(v => v.id === type);
  if (!opskrift) throw new Error("Ukendt verdenstype");
  const data = new Uint8Array(BX * BY * BZ), top = new Int16Array(BX * BZ);
  const R = rng(frø), støj = lavStøj(frø);
  const inde = (x, y, z) => x >= 0 && x < BX && y >= 0 && y < BY && z >= 0 && z < BZ;
  const a = {
    R, støj, ID, BX, BY, BZ, top,
    antal: n => Math.round(n * BX * BZ / 4096),
    sæt: (x, y, z, id) => { if (inde(x, y, z)) data[x + z * BX + y * BX * BZ] = id; },
    hent: (x, y, z) => y < 0 ? ID.Bundsten : inde(x, y, z) ? data[x + z * BX + y * BX * BZ] : 0,
    nærStart: (x, z, r) => Math.abs(x - BX / 2) < r && Math.abs(z - BZ / 2) < r,
    terræn(højde, lag) {
      for (let x = 0; x < BX; x++) {
        for (let z = 0; z < BZ; z++) {
          const h = Math.max(1, Math.min(BY - 6, højde(x, z)));
          for (let y = 0; y <= h; y++) a.sæt(x, y, z, lag(x, z, y, h));
          top[x + z * BX] = h;
        }
        if (x % 16 === 0) fremgang(Math.round(85 * x / BX));
      }
    },
    pynt(n, vælg, på) {
      for (let k = 0; k < n; k++) {
        const x = Math.floor(R() * BX), z = Math.floor(R() * BZ), h = top[x + z * BX];
        if (på.includes(a.hent(x, h, z)) && a.hent(x, h + 1, z) === 0) a.sæt(x, h + 1, z, typeof vælg === "function" ? vælg() : vælg);
      }
    },
  };
  opskrift.generer(a);
  fremgang(100);
  return data;
}
