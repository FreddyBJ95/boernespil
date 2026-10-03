import * as THREE from "../3d-faelles/three.module.js";
import { lås } from "../laas.js";
import {
  aktivOpgave,
  fuldfør,
  gem,
  læsGemning,
  MÆRKER,
  nyTilstand,
  OPGAVER,
  rigtigtSvar,
  samlRav,
  terrænHøjde,
} from "./logik.js";
import { gangHøjde, kanGå, RAVTRÆER, STEDER, ØVerden } from "./verden.js";
import { ØLyd } from "./lyd.js";

const $ = (id) => document.getElementById(id);
const lager = (() => {
  try {
    return localStorage;
  } catch {
    return {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("Gemning ikke tilgængelig");
      },
    };
  }
})();
let tilstand = læsGemning(lager) || nyTilstand();
let verden,
  nærmeste = null,
  tilstandUI = "menu",
  dialogTilbage = "spil",
  galleriet = false,
  vinkel = 0,
  sidst = 0,
  tidsSum = 0,
  gemTid = 0,
  hudTid = 0,
  beskedTid = 0;
const taster = new Set(), touchTaster = new Set(), lyd = new ØLyd();
const retninger = ["Nord", "Øst", "Syd", "Vest"];
const åbningsTekst =
  "Efter efterårsstormen er Lysø stille. Fyret, der altid viste dig hjem, er gået ud. Din søster Elin sejlede til fastlandet for at hente reservedele. På kajen venter hendes sidste brev. Find ud af, hvad hun nåede at opdage.";
const noter = [
  "Elin venter på fastlandet. Hun skrev låsens tre indstillinger: faldende vand, tre mærker, vestenvind.",
  "Nøglen har tre mærker: Ugle → Måne → Bølge. Elin brugte rav fra tre gamle fyrretræer til at holde linsen på plads.",
  "Tre dråber rav ligger nu i tasken. Det lune rav dufter stadig af skov. Linsen gemmer sig i kompasruinen.",
  "Ruinens kompas gav slip på den gamle linse. Den er hel, men dens lys mangler havets klare prisme.",
  "Strømmen er tilbage. Tegningen i fyret siger: Om natten vil vestens sten huske lyset.",
  "Fyrets stråle vækkede en sti af blå havsten. De leder fra ruinen, langs skovens kyst, til havgrotten.",
  "Havgrottens tre spejle gav prismen tilbage. Sol → Øst. Bølge → Vest. Stjerne → Syd.",
  "Et lys er et løfte. Elin så fyret fra fastlandet. I morgen kommer hun hjem.",
];

// Dialogerne bygges af egne faste tekster; kun kendte valg kan ændre spillet.
function dialog(overlinje, titel, indhold, knapper = [], tilbage = tilstandUI) {
  if (tilstandUI !== "dialog") dialogTilbage = tilbage;
  tilstandUI = "dialog";
  taster.clear();
  touchTaster.clear();
  $("dialog-overlinje").textContent = overlinje;
  $("dialog-titel").textContent = titel;
  $("dialog-indhold").innerHTML = indhold;
  $("dialog-knapper").replaceChildren();
  for (const [tekst, handling, primær = false] of knapper) {
    const b = document.createElement("button");
    b.textContent = tekst;
    b.className = primær ? "primær" : "sekundær";
    b.addEventListener("click", handling);
    $("dialog-knapper").append(b);
  }
  $("dialog").classList.remove("skjult");
  $("dialog").querySelector(".dialog-kort").scrollTop = 0;
  $("luk-dialog").focus({ preventScroll: true });
  lyd.sæt(tilstand.lyd, true);
}

function lukDialog() {
  $("dialog").classList.add("skjult");
  tilstandUI = dialogTilbage;
  if (tilstandUI === "spil") $("hud").classList.remove("skjult");
  lyd.sæt(tilstand.lyd, tilstandUI !== "spil");
}

function besked(tekst) {
  $("besked").textContent = tekst;
  $("besked").classList.remove("skjult");
  beskedTid = tidsSum + 5;
}

function gemNu() {
  const sikkerTilstand = galleriet ? { ...tilstand, position: { x: 32, z: -35 } } : tilstand;
  const okay = gem(sikkerTilstand, lager);
  $("gemt").textContent = okay ? "Gemt på denne enhed" : "Denne browser kan ikke gemme · hold fanen åben";
  return okay;
}

function hjælp(fuld = false) {
  const opgave = aktivOpgave(tilstand);
  const indhold = `${
    opgave
      ? `<p><strong>${opgave.navn}</strong></p><blockquote>${opgave.hjælp}</blockquote>`
      : "<p>Fyret er tændt. Øen er din at udforske, og du kan besøge galleriet igen.</p>"
  }${
    fuld
      ? `<p>Du kan gennemføre hele eventyret med touch. Gå med pilene nederst til venstre. Træk på landskabet for at se dig omkring. Den store <strong>Undersøg</strong>-knap aktiveres, når du er tæt på en genstand.</p><div class="styring"><strong>Computer</strong><span>WASD eller piletaster: gå. Træk med musen: kig. Q/R: drej.</span><strong>E / tryk</strong><span>Undersøg den nærmeste genstand.</span><strong>Sol / måne</strong><span>Skift mellem skumring og nat. Ingen ventetid.</span><strong>M / Økort</strong><span>Se stederne og gå hurtigt til dem, du allerede har besøgt.</span><strong>Esc / Ⅱ</strong><span>Pause. Fremgangen gemmes automatisk.</span></div><p>Følg de lyse stier og øens landmærker. Den gyldne ring viser dit næste mål. Der er ingen tidsgrænse, kamp eller farlige fald.</p>`
      : ""
  }`;
  dialog(fuld ? "DIT TEMPO, DIT EVENTYR" : "ET LILLE VINK", fuld ? "Sådan finder du vej." : "Næste lille skridt.", indhold, [[
    "Tilbage",
    lukDialog,
    true,
  ]]);
}

function fuldført(id, titel, tekst) {
  const næste = fuldfør(tilstand, id);
  if (næste === tilstand) return;
  tilstand = næste;
  gemNu();
  opdaterHud();
  lyd.fremskridt();
  dialog(
    "ET KAPITEL FALDER PÅ PLADS",
    titel,
    `<p>${tekst}</p><p class="svar-besked">${aktivOpgave(tilstand)?.mål || "Øen lyser igen."}</p>`,
    [["Videre", lukDialog, true]],
    "spil",
  );
}

// Alle gåder bruger store knapper, og ledetrådene kan læses i dagbogen igen.
function valgPuzzle(type, titel, introduktion, rækker, id, succesTitel, succesTekst) {
  const svar = rækker.map((r) => r[1][0]);
  const html = `<p>${introduktion}</p>${
    rækker.map(([label, muligheder], i) =>
      `<div class="puzzle-række"><label>${label}</label><div class="valg" data-række="${i}">${
        muligheder.map((v, j) => `<button data-valg="${j}" class="${j === 0 ? "valgt" : ""}">${v}</button>`).join("")
      }</div></div>`
    ).join("")
  }<p id="svar" class="svar-besked" role="status"></p>`;
  dialog("FYRMESTERENS EFTERLADTE SPOR", titel, html, [["Prøv indstillingen", () => {
    if (rigtigtSvar(type, svar)) fuldført(id, succesTitel, succesTekst);
    else {
      $("svar").textContent = "Der mangler stadig én rigtig indstilling. Kig på ledetråden, og prøv igen.";
      lyd.tone(174.61, 0, .07);
    }
  }, true], ["Luk", lukDialog]]);
  $("dialog-indhold").querySelectorAll("[data-række]").forEach((r, i) =>
    r.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      svar[i] = rækker[i][1][Number(b.dataset.valg)];
      r.querySelectorAll("button").forEach((x) => x.classList.toggle("valgt", x === b));
      $("svar").textContent = "";
      lyd.tone(440, 0, .035);
    })
  );
}

function læsBrev() {
  if (tilstand.færdige.includes("brev")) {
    dialog(
      "ELINS BREV",
      "Jeg lod døren stå åben.",
      `<blockquote>Hvis du er kommet hjem før mig: begynd ved værkstedet. Låsen åbner, når vandet falder — tre mærker på pælen — og vinden kommer fra vest.<br><br>Fyret har husket os hele vores liv. Nu er det vores tur.<br><br>— Elin</blockquote>`,
      [["Tilbage", lukDialog, true]],
    );
    return;
  }
  dialog(
    "ET BREV MED SALT PÅ KANTEN",
    "Jeg vidste, du ville komme.",
    `<blockquote>Hvis du er kommet hjem før mig: begynd ved værkstedet. Låsen åbner, når vandet falder — tre mærker på pælen — og vinden kommer fra vest.<br><br>Fyret har husket os hele vores liv. Nu er det vores tur.<br><br>— Elin</blockquote>`,
    [["Tag brevet", () =>
      fuldført(
        "brev",
        "Hun har vist dig begyndelsen.",
        "Brevet ligger nu i din dagbog. Landsbyens værksted står åbent. Den gamle tidevandslås venter på bordet.",
      ), true]],
  );
}

function værksted() {
  if (!tilstand.færdige.includes("brev")) {
    besked("Et brev på havnen forklarer den gamle lås. Find det først.");
    return;
  }
  if (aktivOpgave(tilstand)?.id === "nøgle") {
    valgPuzzle(
      "tide",
      "Tidevandslåsen.",
      "Elins brev: <strong>Faldende vand. Tre mærker. Vind fra vest.</strong> De tre messinghjul knirker, når du drejer dem.",
      [
        ["Tidevand", ["Stigende", "Faldende", "Stille"]],
        ["Mærker på pælen", ["I", "II", "III"]],
        ["Vindretning", ["Nord", "Øst", "Syd", "Vest"]],
      ],
      "nøgle",
      "En nøgle til skovens hemmelighed.",
      "Låsen åbner. I æsken ligger en kobbernøgle og et brev: “Tre gamle træer holder på ravet. Nøglens mærker læses fra håndtag til spids: Ugle, Måne, Bølge.”",
    );
  } else {
    dialog(
      "FYRMESTERENS VÆRKSTED",
      "Et rum fuldt af hjem.",
      `<p>På hylderne står søkort, en kop uden hank og Elins notesbøger. Den åbne dør lader havluften komme ind.</p><blockquote>Nøglens mærker: Ugle → Måne → Bølge.<br>Tre gamle træer i skoven gemmer det klare rav.</blockquote>`,
      [["Tilbage", lukDialog, true]],
    );
  }
}

function ravtræ(indeks) {
  if (tilstand.rav.includes(indeks)) {
    besked("Du har allerede samlet ravet fra dette træ.");
    return;
  }
  if (aktivOpgave(tilstand)?.id !== "harpiks") {
    besked("Det gamle træ holder en dråbe rav. Måske får du brug for det senere.");
    return;
  }
  tilstand = samlRav(tilstand, indeks);
  gemNu();
  opdaterHud();
  lyd.tone(587.33, 0, .2);
  if (tilstand.rav.length === 3) {
    lyd.fremskridt();
    dialog(
      "SKOVEN GIVER SLIP",
      "Tre lune dråber.",
      `<p>Ravet vil holde linsen på plads. Nu mangler du selve linsen, som ligger i den gamle kompasruin mod nord.</p><blockquote>Nøglens tre mærker: Ugle → Måne → Bølge.</blockquote>`,
      [["Mod ruinen", lukDialog, true]],
      "spil",
    );
  } else besked(`Et stykke varmt rav i tasken. ${tilstand.rav.length} af 3 fundet.`);
}

function ruin() {
  if (aktivOpgave(tilstand)?.id === "linse") {
    valgPuzzle(
      "ringe",
      "Kompasrosens tre ringe.",
      "Kobbernøglen passer i stenen. Tre mærker løber langs nøglens skaft: <strong>Ugle → Måne → Bølge.</strong> Vælg mærket på hver ring.",
      [
        ["Yderste ring", MÆRKER],
        ["Midterste ring", MÆRKER],
        ["Inderste ring", MÆRKER],
      ],
      "linse",
      "Linsen lå endnu og ventede.",
      "En sten glider til side. Den gamle linse fanger skumringens lys, og et øjeblik ser du øen, som den var før stormen. Tag den med til fyrets kontrolbord.",
    );
  } else if (tilstand.færdige.includes("spor")) {
    dialog(
      "STENENE HUSKER LYSET",
      "En sti langs kysten.",
      `<p>${
        tilstand.nat
          ? "Blå havsten gløder mod sydvest. De ligger som en række små stjerner ned langs skoven til havgrotten."
          : "Stenene ser grå ud i skumringen. Om natten viser de vejen til havgrotten."
      }</p>`,
      [["Tilbage", lukDialog, true]],
    );
  } else {besked(
      tilstand.færdige.includes("linse")
        ? "Den gamle kompasrose har givet sin linse tilbage. Fyret venter."
        : "Kompasrosen har brug for kobbernøglen og skovens tre dråber rav.",
    );}
}

function fyr() {
  const opgave = aktivOpgave(tilstand)?.id;
  if (opgave === "strøm") {
    valgPuzzle(
      "ledninger",
      "Lys i de gamle ledninger.",
      "Du sætter linsen fast med ravet. En tegning på indersiden af lågen viser: <strong>Blå → Bølge, Grøn → Blad, Rød → Sol.</strong> Før strømmen hjem.",
      [
        ["Blå ledning", ["Sol", "Bølge", "Blad"]],
        ["Grøn ledning", ["Sol", "Bølge", "Blad"]],
        ["Rød ledning", ["Blad", "Bølge", "Sol"]],
      ],
      "strøm",
      "Fyret trækker vejret igen.",
      "Et varmt lys vågner i lanternen. Men strålen er stadig bleg. Under tegningen står: “Når natten falder, ret prøvelyset mod vest. Kystens sten husker vejen.”",
    );
  } else if (opgave === "spor") {
    dialog(
      "LANTERNENS PRØVELYS",
      "Hvor skal lyset lede?",
      `<p>På kontrollågen står: <strong>“Når natten falder, ret prøvelyset mod vest.”</strong> Kompasruinen ligger mod vest. Vælg en retning, og tænd prøvelyset.</p><div class="puzzle-række"><label>Fyrets retning</label><div class="valg" id="fyr-retninger">${
        retninger.map((r, i) => `<button data-retning="${i}" class="${i === tilstand.retning ? "valgt" : ""}">${r}</button>`)
          .join("")
      }</div></div><p id="svar" class="svar-besked">${
        tilstand.nat
          ? "Natten er faldet. Stenene kan vågne."
          : "Det er endnu skumring. Brug Sol/måne-knappen, når du er klar til nat."
      }</p>`,
      [
        ["Tænd prøvelyset", () => {
          if (!tilstand.nat) {
            $("svar").textContent = "De skjulte spor kan først ses om natten. Tryk på Lad natten falde nedenfor.";
            return;
          }
          if (tilstand.retning !== 3) {
            $("svar").textContent = "Strålen strejfer havet. Drej den mod vest, hvor den gamle ruin ligger.";
            return;
          }
          fuldført(
            "spor",
            "En sti af små stjerner.",
            "Lyset rammer ruinen. Én efter én vågner de blå sten langs kysten. De viser vejen fra ruinen mod sydvest til havgrotten.",
          );
        }, true],
        ["Lad natten falde", () => {
          tilstand.nat = true;
          gemNu();
          opdaterHud();
          $("svar").textContent = "Natten falder. Nu kan du tænde prøvelyset.";
        }],
        ["Op på galleriet", gåOp],
      ],
    );
    $("fyr-retninger").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      tilstand.retning = Number(b.dataset.retning);
      gemNu();
      $("fyr-retninger").querySelectorAll("button").forEach((x) => x.classList.toggle("valgt", x === b));
    });
  } else if (opgave === "lys") {
    dialog(
      "ALLE ØENS SPOR MØDES HER",
      "Den sidste del af lyset.",
      `<p>Rav fra skoven. Linse fra ruinen. Prisme fra havet. Elins tegning er hel igen.</p><blockquote>Et lys er et løfte. Der er altid nogen på vej hjem.</blockquote>`,
      [["Sæt prismen i · tænd fyret", afslut, true], ["Op på galleriet", gåOp]],
    );
  } else {
    dialog(
      "DET GAMLE FYR",
      "Over havets kant.",
      `<p>${
        tilstand.færdige.includes("lys")
          ? "Lanternen drejer langsomt. Strålen holder øje med havet. I morgen kommer Elin hjem."
          : "Fyret hæver sig over hele øen. Fra galleriet kan du se landsbyen, skoven, ruinen og havgrottens klipper."
      }</p>${
        !tilstand.færdige.includes("linse")
          ? "<p>Kontrolbordet mangler den gamle linse og rav fra skoven.</p>"
          : !tilstand.færdige.includes("prisme")
          ? "<p>Havets prisme mangler endnu. Følg de blå sten langs kysten, når natten er faldet.</p>"
          : ""
      }`,
      [["Op på galleriet", gåOp, true], ["Tilbage", lukDialog]],
    );
  }
}

function gåOp() {
  lukDialog();
  tilstandUI = "spil";
  galleriet = true;
  tilstand.position = { x: 38, z: -39.8 };
  tilstand.kurs = Math.PI;
  vinkel = -.15;
  $("ud").classList.remove("skjult");
  besked("På fyrgalleriet · gå langs rækværket, eller se ud over havet.");
}

function gåNed() {
  galleriet = false;
  tilstand.position = { x: 32, z: -35 };
  tilstand.kurs = 0;
  vinkel = 0;
  $("ud").classList.add("skjult");
  gemNu();
}

function grotte() {
  if (!tilstand.færdige.includes("spor")) {
    besked("Grottealteret sover. Fyrets prøvelys kan vække de blå sten først.");
    return;
  }
  if (!tilstand.nat) {
    besked("Spejlene fanger kun nattens lys. Brug Sol/måne-knappen til at lade natten falde.");
    return;
  }
  if (tilstand.færdige.includes("prisme")) {
    dialog(
      "HAVETS STILLE RUM",
      "Et tomt alter.",
      "<p>Vandet synger mod klippen. Prismen ligger trygt i din taske, eller i fyrets lanterne. Grotten har givet øen sit lys tilbage.</p>",
      [["Tilbage", lukDialog, true]],
    );
    return;
  }
  const svar = [0, 0, 0];
  dialog(
    "HAVETS KLARE PRISME",
    "Tre spejle. Én stjerne.",
    `<p>Tre tegn er ridset i klippen: <strong>Sol mod Øst. Bølge mod Vest. Stjerne mod Syd.</strong> Drej spejlene ved at trykke på dem. Prismen vågner, når alle tre fanger samme lys.</p><div class="spejl-række">${
      ["Sol", "Bølge", "Stjerne"].map((s, i) =>
        `<div class="spejl"><strong>${s}</strong><button data-spejl="${i}" aria-label="Drej ${s.toLowerCase()}-spejlet">↑</button><small id="spejl-${i}">Nord</small></div>`
      ).join("")
    }</div><p id="svar" class="svar-besked" role="status"></p>`,
    [["Saml spejlenes lys", () => {
      if (rigtigtSvar("spejle", svar)) {
        fuldført(
          "prisme",
          "Havet giver lyset tilbage.",
          "Spejlene samler en stille stjerne i havglasset. Du tager prismen, som en varm dråbe vand mellem hænderne. Fyret venter på dig én sidste gang.",
        );
      } else {$("svar").textContent =
          "Lyset deler sig endnu. Solen står op i øst, bølgen trækker mod vest, og stjernen peger mod syd.";}
    }, true], ["Tilbage", lukDialog]],
  );
  $("dialog-indhold").querySelectorAll("[data-spejl]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.spejl);
      svar[i] = (svar[i] + 1) % 4;
      b.textContent = ["↑", "→", "↓", "←"][svar[i]];
      $(`spejl-${i}`).textContent = retninger[svar[i]];
      $("svar").textContent = "";
      lyd.tone(330 + svar[i] * 55, 0, .04);
    })
  );
}

// Slutningen tænder hele lanternen og lader kameraet sejle stille omkring øen.
function afslut() {
  const næste = fuldfør(tilstand, "lys");
  if (næste === tilstand) return;
  tilstand = næste;
  tilstand.nat = true;
  galleriet = false;
  tilstand.position = { x: 32, z: -35 };
  gemNu();
  opdaterHud();
  lyd.fremskridt();
  $("dialog").classList.add("skjult");
  tilstandUI = "slut";
  $("hud").classList.add("skjult");
  lyd.sæt(tilstand.lyd);
  const startTid = tidsSum;
  const vent = () => {
    if (tilstandUI !== "slut") return;
    if (tidsSum - startTid < 6) {
      requestAnimationFrame(vent);
      return;
    }
    dialog(
      "DET SIDSTE LYS",
      "Der er altid nogen på vej hjem.",
      `<p>Strålen løber hen over havet. På fastlandets kaj standser Elin og vender sig mod øen.</p><blockquote>“Jeg så dit lys. Jeg kommer hjem i morgen.”</blockquote><p>Du har samlet øens otte kapitler. Skoven, ruinen og havet har hver givet deres del. Fyret vil huske resten.</p><p class="svar-besked">Eventyret er gennemført · ${
        Math.max(1, Math.round(tilstand.spilletid / 60))
      } minutter på øen</p>`,
      [["Bliv lidt på øen", () => {
        dialogTilbage = "spil";
        lukDialog();
        $("hud").classList.remove("skjult");
        tilstandUI = "spil";
      }, true], ["Tilbage til spillene", () => {
        location.href = "../../index.html";
      }]],
      "spil",
    );
  };
  requestAnimationFrame(vent);
}

function dagbog() {
  const indhold = `<p>${
    tilstand.færdige.length
      ? "Elins spor, og det du har fundet på øen."
      : "Dagbogen er endnu tom. Begynd ved postkassen på kajen."
  }</p>${
    tilstand.færdige.map((id, i) =>
      `<article class="dagbog-ide"><h3>${String(i + 1).padStart(2, "0")} · ${OPGAVER[i].navn}</h3><p>${noter[i]}</p></article>`
    ).join("")
  }${
    aktivOpgave(tilstand)
      ? `<article class="dagbog-ide"><h3>Næste: ${aktivOpgave(tilstand).navn}</h3><p>${aktivOpgave(tilstand).mål}</p></article>`
      : ""
  }`;
  dialog("FRA EN VINDSTILLE Ø", "Din dagbog.", indhold, [["Tilbage", lukDialog, true]]);
}

function kort() {
  const opgave = aktivOpgave(tilstand), mål = opgave?.sted;
  const steder = Object.entries(STEDER);
  const px = (x) => 150 + x * 1.12, pz = (z) => 145 + z * 1.1;
  const svg =
    `<svg viewBox="0 0 300 290" role="img" aria-label="Økort med havn i syd, landsby i midten, skov mod nordvest, ruin mod nord, fyr mod nordøst og havgrotte mod vest"><defs><radialGradient id="øfarve"><stop stop-color="#52654f"/><stop offset="1" stop-color="#2a4949"/></radialGradient></defs><ellipse cx="150" cy="145" rx="94" ry="115" fill="url(#øfarve)" stroke="#b0b391" stroke-width="1"/><path d="M122 225L125 196L158 177L186 102M125 196L99 148L96 111L137 77M99 148L77 193" fill="none" stroke="#abb49366" stroke-width="3"/>${
      steder.map(([id, s]) =>
        `<circle cx="${px(s.x)}" cy="${pz(s.z)}" r="${id === mål ? 9 : 6}" fill="${
          id === mål ? "#edc27b" : "#aec9b8"
        }"/><text x="${px(s.x)}" y="${pz(s.z) + 19}" text-anchor="middle" fill="#e4ead6" font-size="8">${
          { havn: "Havn", værksted: "Værksted", skov: "Ravskov", ruin: "Ruin", fyr: "Fyr", grotte: "Grotte" }[id]
        }</text>`
      ).join("")
    }<circle cx="${px(tilstand.position.x)}" cy="${
      pz(tilstand.position.z)
    }" r="4" fill="#fff" stroke="#163539" stroke-width="2"/><text x="260" y="25" fill="#d8bc82" font-size="12">N ↑</text><text x="13" y="279" fill="#abc5bd" font-size="8">● Du · gylden markering: næste mål</text></svg>`;
  dialog(
    "LYSØ · DIT HJEM I HAVET",
    "Et kort over øen.",
    `<p>Følg de lyse stier til nye steder. Steder, du allerede har besøgt, kan du gå direkte tilbage til.</p><div class="kort-ramme">${svg}</div><div class="kort-liste">${
      steder.map(([id, s]) =>
        `<button data-rejse="${id}" ${!tilstand.besøgte.includes(id) ? "disabled" : ""}>${s.ikon} ${s.navn}<small>${
          tilstand.besøgte.includes(id) ? "Gå tilbage hertil" : "Udforsk stedet først"
        }${id === mål ? " · Næste mål" : ""}</small></button>`
      ).join("")
    }</div>`,
    [["Tilbage", lukDialog, true]],
  );
  $("dialog-indhold").querySelectorAll("[data-rejse]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.rejse;
      if (!tilstand.besøgte.includes(id)) return;
      const p = { havn: [-25, 78], værksted: [7, 30], skov: [-44, -27], ruin: [-12, -57], fyr: [32, -35], grotte: [-66, 49] }[id];
      galleriet = false;
      $("ud").classList.add("skjult");
      tilstand.position = { x: p[0], z: p[1] };
      tilstand.kurs = 0;
      vinkel = 0;
      gemNu();
      lukDialog();
      besked(`Tilbage ved ${STEDER[id].navn.toLowerCase()}.`);
    })
  );
}

function opdaterHud() {
  const opgave = aktivOpgave(tilstand);
  $("kapitel").textContent = opgave
    ? `KAPITEL ${String(tilstand.færdige.length + 1).padStart(2, "0")} / 08`
    : "EVENTYRET ER GENNEMFØRT";
  $("mål-titel").textContent = opgave?.navn || "Lyset viser vej hjem";
  $("mål-tekst").textContent = opgave?.mål || "Øen er din. Besøg fyrgalleriet, og se lyset over havet.";
  $("fremgang").style.width = `${tilstand.færdige.length / 8 * 100}%`;
  $("vejr").textContent = tilstand.nat ? "Nat" : "Skumring";
  $("tid").textContent = tilstand.nat ? "☼" : "☾";
  $("lyd").textContent = tilstand.lyd ? "♪" : "♪̸";
  $("lyd").setAttribute("aria-label", tilstand.lyd ? "Slå lyd fra" : "Slå lyd til");
  const genstande = [];
  if (tilstand.færdige.includes("brev")) genstande.push("Brev");
  if (tilstand.færdige.includes("nøgle")) genstande.push("Kobbernøgle");
  if (tilstand.rav.length) genstande.push(`Rav ${tilstand.rav.length}/3`);
  if (tilstand.færdige.includes("linse")) genstande.push("Linse");
  if (tilstand.færdige.includes("prisme")) genstande.push("Prisme");
  $("inventar").textContent = genstande.join(" · ") || "Ingen genstande endnu";
  let sted = opgave ? STEDER[opgave.sted] : null;
  if (opgave?.id === "harpiks") sted = RAVTRÆER.find((_, i) => !tilstand.rav.includes(i)) || sted;
  verden?.sætMål(sted);
}

// Interaktion er afstandsbaseret, så den også fungerer uden et præcist musesigte.
function findInteraktion() {
  const p = tilstand.position;
  const genstande = [
    { x: -25, z: 73, navn: "Elins brev · rød postkasse", handling: "Læs brevet", gør: læsBrev, radius: 5 },
    { x: 7, z: 24, navn: "Tidevandslås · inde i værkstedet", handling: "Undersøg låsen", gør: værksted, radius: 3.3 },
    {
      x: 7,
      z: 29,
      navn: "Det åbne værksted",
      handling: "Gå ind",
      gør: () => {
        tilstand.position = { x: 7, z: 25.3 };
        tilstand.kurs = 0;
        vinkel = .05;
        besked("Et varmt rum · undersøg messingæsken på bordet.");
      },
      radius: 3.0,
    },
    { x: -12, z: -62, navn: "Ruinens kompasrose", handling: "Undersøg ringene", gør: ruin, radius: 6 },
    { x: 32, z: -38, navn: "Fyrets kontrolbord", handling: "Undersøg fyret", gør: fyr, radius: 6 },
    { x: -66, z: 46, navn: "Havgrottens spejlalter", handling: "Undersøg spejlene", gør: grotte, radius: 6 },
    ...RAVTRÆER.map((r, i) => ({
      ...r,
      navn: tilstand.rav.includes(i) ? "Gammelt fyrretræ" : "Varmt rav · gammelt fyrretræ",
      handling: "Saml rav",
      gør: () => ravtræ(i),
      radius: 4.8,
    })),
  ];
  if (galleriet) nærmeste = { navn: "Fyrets lanterne · oppe på galleriet", handling: "Undersøg lyset", gør: fyr };
  else {nærmeste = genstande.map((g) => ({ ...g, afstand: Math.hypot(g.x - p.x, g.z - p.z) })).filter((g) =>
      g.afstand < g.radius
    ).sort((a, b) =>
      a.afstand - b.afstand
    )[0] || null;}
  $("undersøg").disabled = !nærmeste;
  $("genstand").textContent = nærmeste?.navn || "Følg øens stier. Undersøg noget, når du er tæt på.";
  $("handlingsnavn").textContent = nærmeste?.handling || "Undersøg";
  const opgave = aktivOpgave(tilstand), sted = opgave ? STEDER[opgave.sted] : null;
  if (sted) $("afstand").textContent = `${Math.round(Math.hypot(sted.x - p.x, sted.z - p.z))} m til målet`;
  else $("afstand").textContent = "Lyset er tændt";
  const nærSted =
    Object.entries(STEDER).sort(([, a], [, b]) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
  $("sted-navn").textContent = galleriet
    ? "Fyrgalleriet"
    : Math.hypot(nærSted[1].x - p.x, nærSted[1].z - p.z) < 24
    ? nærSted[1].navn
    : "På øens stier";
  if (!tilstand.besøgte.includes(nærSted[0]) && Math.hypot(nærSted[1].x - p.x, nærSted[1].z - p.z) < 13) {
    tilstand.besøgte.push(nærSted[0]);
    gemNu();
    besked(`${nærSted[1].navn} · stedet er nu på dit økort.`);
  }
  const grader = (((-tilstand.kurs * 180 / Math.PI) % 360) + 360) % 360;
  $("kurs").textContent = `${["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"][Math.round(grader / 45) % 8]} · ${Math.round(grader)}°`;
}

function undersøg() {
  if (tilstandUI === "spil" && nærmeste) nærmeste.gør();
}

function pause() {
  if (tilstandUI !== "spil") return;
  tilstandUI = "pause";
  taster.clear();
  touchTaster.clear();
  $("pause-status").textContent = gemNu()
    ? "Dit eventyr er gemt på denne enhed."
    : "Gemning er ikke tilgængelig i denne browser. Hold fanen åben.";
  $("pause-lag").classList.remove("skjult");
  lyd.sæt(tilstand.lyd, true);
  $("fortsæt").focus();
}

function genoptag() {
  $("pause-lag").classList.add("skjult");
  tilstandUI = "spil";
  lyd.sæt(tilstand.lyd);
}

function begyndForfra() {
  dialog(
    "ET NYT BESØG PÅ ØEN",
    "Begynde forfra?",
    "<p>Den gemte fremgang på denne enhed bliver erstattet af et nyt eventyr. Du begynder igen ved havnen.</p>",
    [
      ["Ja, begynd forfra", () => {
        tilstand = nyTilstand();
        galleriet = false;
        vinkel = 0;
        $("ud").classList.add("skjult");
        gemNu();
        opdaterHud();
        dialogTilbage = "spil";
        lukDialog();
        $("pause-lag").classList.add("skjult");
        $("menu").classList.add("skjult");
        $("hud").classList.remove("skjult");
        lyd.start();
        tilstandUI = "spil";
        besked("Et nyt brev venter ved den røde postkasse.");
      }, true],
      ["Behold mit eventyr", lukDialog],
    ],
  );
}

// Mus og touch deler drag-kameraet; Pointer Lock er aldrig nødvendigt.
function styring() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (tilstandUI === "dialog") lukDialog();
      else if (tilstandUI === "pause") genoptag();
      else pause();
      return;
    }
    if (tilstandUI !== "spil") return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (!e.repeat && k === "e") undersøg();
    if (!e.repeat && k === "m") kort();
    if (!e.repeat && k === "j") dagbog();
    taster.add(k);
  });
  window.addEventListener("keyup", (e) => taster.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => {
    taster.clear();
    touchTaster.clear();
    if (tilstandUI === "spil") pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && tilstandUI === "spil") pause();
  });
  const canvas = verden.renderer.domElement;
  let drag = null;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (tilstandUI !== "spil") return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId || tilstandUI !== "spil") return;
    tilstand.kurs -= (e.clientX - drag.x) * .004;
    vinkel = Math.max(-1.1, Math.min(1.1, vinkel - (e.clientY - drag.y) * .003));
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  const slip = (e) => {
    if (drag?.id === e.pointerId) drag = null;
  };
  canvas.addEventListener("pointerup", slip);
  canvas.addEventListener("pointercancel", slip);
  $("touch").querySelectorAll("button").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      touchTaster.add(b.dataset.gå);
    });
    const stop = (e) => {
      e.preventDefault();
      touchTaster.delete(b.dataset.gå);
    };
    b.addEventListener("pointerup", stop);
    b.addEventListener("pointercancel", stop);
    b.addEventListener("lostpointercapture", stop);
  });
  $("dialog").addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const knapper = [...$("dialog").querySelectorAll("button:not(:disabled),a")];
    const først = knapper[0], sidste = knapper.at(-1);
    if (e.shiftKey && document.activeElement === først) {
      e.preventDefault();
      sidste.focus();
    } else if (!e.shiftKey && document.activeElement === sidste) {
      e.preventDefault();
      først.focus();
    }
  });
}

// Gang følger terrænet, med glidning langs vægge og et sikkert fyrgalleri.
function gå(delta) {
  let frem = 0, side = 0;
  if (taster.has("w") || taster.has("arrowup") || touchTaster.has("frem")) frem++;
  if (taster.has("s") || taster.has("arrowdown") || touchTaster.has("tilbage")) frem--;
  if (taster.has("a") || taster.has("arrowleft") || touchTaster.has("venstre")) side--;
  if (taster.has("d") || taster.has("arrowright") || touchTaster.has("højre")) side++;
  if (taster.has("q")) tilstand.kurs += delta * 1.6;
  if (taster.has("r")) tilstand.kurs -= delta * 1.6;
  const længde = Math.hypot(frem, side) || 1, hastighed = (galleriet ? 3.5 : taster.has("shift") ? 10 : 6.5) * delta;
  const dx = (-Math.sin(tilstand.kurs) * frem + Math.cos(tilstand.kurs) * side) / længde * hastighed;
  const dz = (-Math.cos(tilstand.kurs) * frem - Math.sin(tilstand.kurs) * side) / længde * hastighed;
  const p = tilstand.position;
  if (galleriet) {
    const x = p.x + dx, z = p.z + dz, r = Math.hypot(x - 38, z + 44);
    if (r > 3.5 && r < 4.7) {
      p.x = x;
      p.z = z;
    }
  } else {
    if (kanGå(p.x + dx, p.z)) p.x += dx;
    if (kanGå(p.x, p.z + dz)) p.z += dz;
  }
  const y = (galleriet ? terrænHøjde(38, -44) + 21.04 : gangHøjde(p.x, p.z)) + 1.68;
  const gang = Math.hypot(frem, side) > 0 ? Math.sin(tidsSum * 8) * .035 : 0;
  verden.kamera.position.set(p.x, y + gang, p.z);
  verden.kamera.rotation.set(vinkel, tilstand.kurs, 0);
}

function billede(nu) {
  requestAnimationFrame(billede);
  const delta = Math.min(.045, (nu - sidst) / 1000 || .016);
  sidst = nu;
  tidsSum += delta;
  if (tilstandUI === "spil") {
    gå(delta);
    tilstand.spilletid += delta;
    lyd.opdater(tidsSum, tilstand.nat);
    if (tidsSum - hudTid > .15) {
      hudTid = tidsSum;
      findInteraktion();
    }
    if (tidsSum - gemTid > 7) {
      gemTid = tidsSum;
      if (!galleriet) gemNu();
    }
  } else if (tilstandUI === "menu" || tilstandUI === "slut") {
    const a = tilstandUI === "menu" ? .15 + Math.sin(tidsSum * .045) * .09 : tidsSum * .055;
    verden.kamera.position.set(38 + Math.sin(a) * 115, 68, -44 + Math.cos(a) * 130);
    verden.kamera.lookAt(5, 13, -18);
  }
  if (tidsSum > beskedTid) $("besked").classList.add("skjult");
  verden.opdater(tidsSum, delta, tilstand, tilstandUI === "menu" || tilstandUI === "slut");
}

// Voksenlåsen gennemføres før øen indlæses, og fejl giver en brugbar besked.
async function begynd() {
  await lås($("lås"), "../../index.html");
  try {
    verden = new ØVerden($("verden"), (procent) => {
      $("indlæsning").textContent = `Øens huse, skov og fyr · ${procent}%`;
    });
    await verden.indlæs();
    if (!kanGå(tilstand.position.x, tilstand.position.z)) tilstand.position = { x: -25, z: 80 };
    $("start").disabled = false;
    $("start").textContent = tilstand.færdige.length ? "Fortsæt på øen" : "Gå i land";
    $("indlæsning").textContent = "Øen er klar. Din fremgang gemmes på denne enhed.";
    $("nyt").classList.toggle("skjult", !tilstand.færdige.length);
    opdaterHud();
    styring();
    requestAnimationFrame(billede);
  } catch (fejl) {
    $("start").disabled = false;
    $("start").textContent = "Prøv at indlæse øen igen";
    $("indlæsning").textContent = "Øen kunne ikke indlæses. Prøv igen i en browser med 3D-grafik.";
    $("start").onclick = () => location.reload();
    console.error("Det Sidste Lys kunne ikke indlæses:", fejl);
  }
}

$("start").addEventListener("click", () => {
  if (!verden?.model) return;
  $("menu").classList.add("skjult");
  $("hud").classList.remove("skjult");
  tilstandUI = "spil";
  lyd.start().then(() => lyd.sæt(tilstand.lyd));
  if (!tilstand.færdige.length) {
    dialog(
      "VELKOMMEN HJEM",
      "Øen har ventet på dig.",
      `<p>${åbningsTekst}</p><p>Du står på havnens kaj. Postkassen er rød. Gå hen til den, og undersøg brevet.</p>`,
      [["Gå i land", lukDialog, true]],
      "spil",
    );
  }
});
$("undersøg").addEventListener("click", undersøg);
$("luk-dialog").addEventListener("click", lukDialog);
$("hjælp").addEventListener("click", () => hjælp());
$("menu-hjælp").addEventListener("click", () => hjælp(true));
$("pause-hjælp").addEventListener("click", () => hjælp(true));
$("kort").addEventListener("click", kort);
$("bog").addEventListener("click", dagbog);
$("pause").addEventListener("click", pause);
$("fortsæt").addEventListener("click", genoptag);
$("nyt").addEventListener("click", begyndForfra);
$("pause-nyt").addEventListener("click", begyndForfra);
$("ud").addEventListener("click", gåNed);
$("tid").addEventListener("click", () => {
  tilstand.nat = !tilstand.nat;
  gemNu();
  opdaterHud();
  besked(tilstand.nat ? "Natten falder. Øens skjulte spor kan vågne." : "Skumringen vender tilbage. Havet holder på sit lys.");
});
$("lyd").addEventListener("click", () => {
  tilstand.lyd = !tilstand.lyd;
  lyd.start().then(() => lyd.sæt(tilstand.lyd));
  gemNu();
  opdaterHud();
});
window.addEventListener("pagehide", () => {
  if (galleriet) tilstand.position = { x: 32, z: -35 };
  gemNu();
});
begynd();
