// Generering kører uden at blokere kontrolpanel og spillere.
import { generer } from "./generator.js";
self.onmessage = ({ data: meta }) => {
  try {
    const data = generer(meta, procent => self.postMessage({ procent }));
    self.postMessage({ data }, [data.buffer]);
  } catch (fejl) {
    self.postMessage({ fejl: fejl.message });
  }
};
