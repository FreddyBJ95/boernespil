// Node-krog: når bane.js beder om "./three.js", får den three-stub.mjs i stedet
export async function resolve(navn, ctx, næste) {
  if (navn === "./three.js" && ctx.parentURL?.includes("/sigtekorn/")) return { url: new URL("./three-stub.mjs", import.meta.url).href, shortCircuit: true };
  return næste(navn, ctx);
}
