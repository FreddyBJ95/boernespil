// Landet laves i en worker, så mange nye søjler ikke stopper spillernes beskeder.
import { lavLand } from "../spil/broekraft/uendelig.js";
import { lavStøj } from "../spil/broekraft/verden.js";
import { ID } from "../spil/broekraft/blokke.js";

let land;
self.onmessage = ({ data: besked }) => {
  try {
    if (!land) land = lavLand({ støj: lavStøj(besked.frø), ID, BY: 64, frø: besked.frø });
    const data = land.søjle(besked.cx, besked.cz);
    self.postMessage({ nr: besked.nr, data }, [data.buffer]);
  } catch (fejl) {
    self.postMessage({ nr: besked.nr, fejl: fejl.message });
  }
};
