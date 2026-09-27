import { forbind } from "/spil/broekraft/net.js";
const $ = s => document.getElementById(s);
let f;
const log = (navn, b) => { $("log").textContent = `${navn}: ${JSON.stringify(b)}\n${$("log").textContent}`.slice(0, 6000); };
const xyz = () => ["x", "y", "z"].map(k => Number($(k).value));
$("forbind").onclick = async () => {
  try {
    f?.luk(); f = await forbind(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`, { figur: $("figur").value });
    for (const t of ["velkommen", "ind", "ud", "blok", "bum", "emoji", "glem", "lukket", "fejl"]) f.addEventListener(t, e => log(t, e.detail));
    f.addEventListener("klump", e => log("klump", { cx: e.detail.cx, cz: e.detail.cz, blokke: e.detail.data.length }));
    f.addEventListener("pos", e => { $("spillere").textContent = JSON.stringify(e.detail.liste, null, 2); });
    $("verdener").replaceChildren(...(await f.verdener()).map(v => new Option(`${v.navn} (${v.spillere}/${v.maks})`, v.id)));
    log("forbundet", {});
  } catch (fejl) { log("fejl", fejl.message); }
};
$("vælg").onclick = async () => {
  try {
    const info = await f.vælg($("verdener").value), mig = info.spillere.find(s => s.id === info.dig);
    for (const k of ["x", "y", "z"]) $(k).value = Math.floor(mig[k]);
    $("x").value = Math.min(info.verden.bredde - 1, Math.floor(mig.x) + 2);
    log("valgt", info);
  } catch (fejl) { log("fejl", fejl.message); }
};
$("pos").onclick = () => f?.pos(...xyz(), 0, 0);
$("sæt").onclick = () => f?.sæt(...xyz(), Number($("blok").value));
$("fjern").onclick = () => f?.sæt(...xyz(), 0);
$("tænd").onclick = () => f?.tænd(...xyz());
$("emoji").onclick = () => f?.emoji("🎉");
