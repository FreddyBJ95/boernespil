// Spilrum er et postkontor i hukommelsen; spillene bestemmer selv betydningen af data.
const KODER = new TextEncoder();
const ER_OBJEKT = (data) => data !== null && typeof data === "object" && !Array.isArray(data);
const BYTE = (data) => KODER.encode(JSON.stringify(data)).byteLength;
const TEGN = (tekst) => [...tekst];

function nytId() {
  return [...crypto.getRandomValues(new Uint8Array(6))].map((tal) => tal.toString(16).padStart(2, "0")).join("");
}

// Behold kun hændelser i det seneste sekund; en hændelse præcis ét sekund gammel udløber.
function beskær(tider, nu) {
  while (tider.length && tider[0] <= nu - 1000) tider.shift();
}

export class Spilrum {
  // Uret og fristerne kan erstattes i tests; normale forbindelser får ti sekunder til deres hej.
  constructor({ nu = () => performance.now(), lavId = nytId, sætFrist = setTimeout, rydFrist = clearTimeout } = {}) {
    this.rum = new Map();
    this.forbindelser = new Set();
    this.nu = nu;
    this.lavId = lavId;
    this.sætFrist = sætFrist;
    this.rydFrist = rydFrist;
    this.lukket = false;
  }

  // Også forbindelser, der endnu ikke har sagt hej, tæller med i serverens forbindelsesgrænse.
  tilslut(socket) {
    const spiller = {
      id: this.#nytId(),
      socket,
      rum: null,
      hej: false,
      lukket: false,
      tider: [],
      fejlTider: [],
      frist: null,
    };
    if (this.lukket) {
      this.#luk(spiller, 1001, "Serveren lukker");
      return spiller;
    }
    this.forbindelser.add(spiller);
    socket.onmessage = ({ data }) => this.#modtag(spiller, data);
    socket.onclose = () => this.#ryd(spiller);
    socket.onerror = () => this.#luk(spiller, 1011, "Forbindelsesfejl");
    spiller.frist = this.sætFrist(() => this.#luk(spiller, 1008, "Send hej først"), 10000);
    return spiller;
  }

  // Lukning er synkron og gemmer intet på disk, heller ikke når socket.close selv fejler.
  luk() {
    this.lukket = true;
    for (const spiller of [...this.forbindelser]) this.#luk(spiller, 1001, "Serveren lukker");
    this.forbindelser.clear();
    this.rum.clear();
  }

  #nytId() {
    const brugt = new Set([...this.forbindelser].map((spiller) => spiller.id));
    // En indsprøjtet generator kan være dårlig; efter gentagelser bruger vi den normale tilfældighed.
    for (let forsøg = 0;; forsøg++) {
      const id = forsøg < 32 ? this.lavId() : nytId();
      if (typeof id === "string" && /^[a-f0-9]{12}$/.test(id) && !brugt.has(id)) return id;
    }
  }

  // Rå størrelse kontrolleres før JSON.parse, så store kuverter aldrig behandles.
  #modtag(spiller, rå) {
    if (spiller.lukket || !this.forbindelser.has(spiller)) return;
    if (typeof rå !== "string") {
      this.#luk(spiller, 1003, "Kun JSON-tekst");
      return;
    }
    if (KODER.encode(rå).byteLength > 4096) return;
    let besked;
    try {
      besked = JSON.parse(rå);
    } catch {
      this.#fejl(spiller, "Ugyldig JSON");
      return;
    }
    if (!ER_OBJEKT(besked) || typeof besked.t !== "string") {
      this.#fejl(spiller, "Ugyldig besked");
      return;
    }
    if (besked.t === "hej") {
      this.#hej(spiller, besked);
      return;
    }
    if (besked.t !== "til" && besked.t !== "tilstand") return;
    if (!spiller.hej) {
      this.#fejl(spiller, "Send hej først");
      return;
    }
    // Kun værten kan ændre fælles tilstand; øvrige tilstande ignoreres helt.
    if (besked.t === "tilstand" && spiller.rum.vært !== spiller.id) return;
    if (!ER_OBJEKT(besked.data)) {
      this.#fejl(spiller, "Data skal være et objekt");
      return;
    }
    const rum = spiller.rum;
    if (besked.t === "tilstand") {
      if (BYTE(besked.data) > 512 || !this.#plads(spiller)) return;
      rum.tilstand = besked.data;
      this.#alle(rum, { t: "tilstand", data: besked.data }, spiller);
      return;
    }
    if (BYTE(besked.data) > 1500) return;
    const mål = besked.til === undefined ? null : rum.spillere.get(besked.til);
    if (besked.til !== undefined && (!mål || mål === spiller)) return;
    if (!this.#plads(spiller)) return;
    const ud = { t: "fra", id: spiller.id, data: besked.data };
    if (mål) this.#send(mål, ud);
    else this.#alle(rum, ud, spiller);
  }

  // Navne og rumnavne normaliseres én gang, før der laves en nøgle eller vælges et ledigt navn.
  #hej(spiller, besked) {
    if (spiller.hej) {
      this.#fejl(spiller, "Du er allerede i et rum");
      return;
    }
    const navn = typeof besked.navn === "string" ? besked.navn.trim().normalize("NFC") : "";
    const rumNavn = typeof besked.rum === "string" ? besked.rum.trim().normalize("NFC").toLowerCase() : "";
    if (typeof besked.spil !== "string" || !/^[a-z]{2,16}$/.test(besked.spil) || !Number.isInteger(besked.version)) {
      this.#fejl(spiller, "Ugyldigt spil eller versionsnummer");
      return;
    }
    if (!navn || TEGN(navn).length > 16 || !/^[\p{L}\p{N} -]+$/u.test(navn)) {
      this.#fejl(spiller, "Navnet skal have 1–16 bogstaver, tal, mellemrum eller bindestreg");
      return;
    }
    if (!/^[a-z0-9æøå-]{1,20}$/u.test(rumNavn)) {
      this.#fejl(spiller, "Rumnavnet skal have 1–20 bogstaver, tal eller bindestreger");
      return;
    }
    const nøgle = `${besked.spil}/${rumNavn}`;
    let rum = this.rum.get(nøgle);
    if (rum?.spillere.size >= 8) {
      this.#send(spiller, { t: "fuld" });
      this.#luk(spiller, 1008, "Rummet er fuldt");
      return;
    }
    if (!rum) {
      rum = { nøgle, spillere: new Map(), vært: spiller.id, tilstand: null, tider: [] };
      this.rum.set(nøgle, rum);
    }
    const optaget = new Set([...rum.spillere.values()].map((anden) => anden.navn.toLowerCase()));
    let ledigt = navn;
    for (let nr = 2; optaget.has(ledigt.toLowerCase()); nr++) {
      const slut = ` ${nr}`;
      ledigt = TEGN(navn).slice(0, 16 - TEGN(slut).length).join("").trimEnd() + slut;
    }
    spiller.navn = ledigt;
    spiller.version = besked.version;
    spiller.hej = true;
    spiller.rum = rum;
    this.#rydFrist(spiller);
    const andre = [...rum.spillere.values()].map(({ id, navn }) => ({ id, navn }));
    rum.spillere.set(spiller.id, spiller);
    if (
      this.#send(spiller, {
        t: "velkommen",
        dig: spiller.id,
        navn: ledigt,
        vært: rum.vært,
        spillere: andre,
        tilstand: rum.tilstand,
      })
    ) {
      this.#alle(rum, { t: "ind", id: spiller.id, navn: ledigt }, spiller);
    }
  }

  // Begge data-typer deler datakvoten. Et fuldt rum bruger ikke spillerens sidste plads.
  #plads(spiller) {
    const nu = this.nu(), rum = spiller.rum;
    beskær(spiller.tider, nu);
    beskær(rum.tider, nu);
    if (spiller.tider.length >= 40 || rum.tider.length >= 240) return false;
    spiller.tider.push(nu);
    rum.tider.push(nu);
    return true;
  }

  // Fejlbeskeder har deres egen lille kvote, også før hej, så fejlspam ikke giver ubegrænsede svar.
  #fejl(spiller, tekst) {
    const nu = this.nu();
    beskær(spiller.fejlTider, nu);
    if (spiller.fejlTider.length >= 40) return;
    spiller.fejlTider.push(nu);
    this.#send(spiller, { t: "fejl", tekst });
  }

  #send(spiller, besked) {
    if (spiller.lukket) return false;
    // En langsom modtager må ikke samle en stadig større kø af udgående spildata.
    if (spiller.socket.bufferedAmount > 4 * 1024 * 1024) {
      this.#luk(spiller, 1013, "Modtageren er for langsom");
      return false;
    }
    try {
      if (spiller.socket.readyState !== 1) throw new Error("Forbindelsen er lukket");
      spiller.socket.send(JSON.stringify(besked));
      return true;
    } catch {
      this.#luk(spiller, 1011, "Kunne ikke sende");
      return false;
    }
  }

  #alle(rum, besked, undtagen = null) {
    for (const spiller of [...rum.spillere.values()]) {
      // En sendefejl kan vælge en ny vært midt i udsendelsen; dens nyere valg gælder.
      if (besked.t === "vært" && besked.id !== rum.vært) return;
      if (spiller !== undtagen) this.#send(spiller, besked);
    }
  }

  #rydFrist(spiller) {
    if (spiller.frist !== null) this.rydFrist(spiller.frist);
    spiller.frist = null;
  }

  #luk(spiller, kode, tekst) {
    if (spiller.lukket) return;
    this.#ryd(spiller);
    try {
      spiller.socket.close(kode, tekst);
    } catch { /* Oprydningen er allerede gennemført. */ }
  }

  // Fjern før vi sender ud; en sendefejl hos næste vært kan dermed opryddes uden dobbelte ud-beskeder.
  #ryd(spiller) {
    if (spiller.lukket) return;
    spiller.lukket = true;
    this.#rydFrist(spiller);
    this.forbindelser.delete(spiller);
    spiller.socket.onmessage = null;
    spiller.socket.onclose = null;
    spiller.socket.onerror = null;
    const rum = spiller.rum;
    spiller.rum = null;
    if (!rum || !rum.spillere.delete(spiller.id)) return;
    if (rum.vært === spiller.id) rum.vært = null;
    if (this.lukket) return;
    this.#alle(rum, { t: "ud", id: spiller.id });
    if (!rum.spillere.size) this.rum.delete(rum.nøgle);
    else if (!rum.spillere.has(rum.vært)) {
      rum.vært = rum.spillere.keys().next().value;
      this.#alle(rum, { t: "vært", id: rum.vært });
    }
  }
}
