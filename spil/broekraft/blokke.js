// ===== Blokkene i Broekraft =====
// Tilføj en ny blok: skriv en ny linje i BLOKKE (id = pladsen i listen).
//  tekstur:      navnet på et mønster i MØNSTRE — eller { top, side, bund } med tre forskellige.
//                "uld:#farve", "blomst:#farve", "prikker:#farve:#prik" og "lilleSvamp:#farve" kan få valgfri farver.
//  gennemsigtig: man kan se igennem (glas) · kryds: tynd plante man kan gå igennem (blomster)
//  lyser:        altid fuldt oplyst · uknuselig: kan ikke hakkes · skjult: vises ikke i inventaret
//  hopper:       man hopper højt når man lander på den (som en trampolin) · superhop: man hopper SUPER højt
//  tnt:          kan tændes med hammeren og sprænger så et hul (se spil.js)
//  væske:        "vand" eller "lava" · niveau: 0 = kilde, højere = tyndere strøm
//  ild:          flammer styret af simulering.js
//  skive:        skydeskive — bliver til konfetti, når den bliver skudt, og kommer igen (skyd.js)
//  fyrværkeri:   tændes med 🔥 tænderen eller 🔨 hammeren: true = kasse (12 raketter), "show" = stort show, "fontæne" = fontæne
//  glat:         man glider på den (is) · afgrøde: høstes med 🔨 og giver ⭐ (en spire gror til en afgrøde)
//  portal:       lilla portal man kan gå igennem — tændes i en ramme af obsidian med 🔥 tænderen (spil.js)
//  skat:         en skattekiste — slå den op med 🔨, så springer guldet ud · kanon: tryk med 🔨 eller 🔥, så skyder den
//  dinoæg:       slå på det med 🔨, så kommer der en dino-unge ud
//  atom:         en atombombe — tændes med 🔥 eller 🔨 og giver en kæmpe sprængning med en svampesky (atom.js)
//                "kæmpe" = endnu større (Kæmpebomben)
//  missil:       en del af et missil (true = kroppen, "spids" = toppen) — tænd det med 🔥 eller 🔨, så flyver det
//  knap:         den røde Affyringsknap — tryk på den, så flyver alle missiler i nærheden efter en nedtælling
//  ur:           nytårsuret — tryk på det, så tæller det ned til nytår med en stor finale (nytaar.js)
//  raketTur:     kæmperaketten — tryk på den, så flyver man selv op med den og daler ned i faldskærm (nytaar.js)
//  droner:       dronekassen — tænd den med 🔥 eller 🔨, så letter dronerne og tegner figurer på himlen
//  kiste:        guldkisten derhjemme i Den uendelige verden — tryk på den og se alt dit guld (eventyr.js)
//  sokkel:       en sokkel i stenringen — de seks magiske sten sættes i her (sten.js)
//  butik:        købes for guld i butikken i Den uendelige verden og vises så i inventaret (eventyr.js)
//  Nye blokke skal altid tilføjes NEDERST, så gemte verdener stadig passer.
//  lyd:          "græs" | "sten" | "træ" | "sand" | "glas" | "uld" | "metal" | "vand" | "lava" | "ild"
// Et nyt mønster er en funktion i MØNSTRE der tegner 16×16 pixels med set(x, y, farve).

import * as THREE from "./three.js";

export const BLOKKE = [
  null,                                                                                   // 0 = luft
  { navn: "Græs", tekstur: { top: "græsTop", side: "græsSide", bund: "jord" }, lyd: "græs" },
  { navn: "Jord", tekstur: "jord", lyd: "græs" },
  { navn: "Sten", tekstur: "sten", lyd: "sten" },
  { navn: "Sand", tekstur: "sand", lyd: "sand" },
  { navn: "Træstamme", tekstur: { top: "stammeTop", side: "stamme", bund: "stammeTop" }, lyd: "træ" },
  { navn: "Blade", tekstur: "blade", lyd: "græs" },
  { navn: "Planker", tekstur: "planker", lyd: "træ" },
  { navn: "Glas", tekstur: "glas", gennemsigtig: true, lyd: "glas" },
  { navn: "Mursten", tekstur: "mursten", lyd: "sten" },
  { navn: "Rød uld", tekstur: "uld:#e03a3a", lyd: "uld" },
  { navn: "Orange uld", tekstur: "uld:#f28a1e", lyd: "uld" },
  { navn: "Gul uld", tekstur: "uld:#f5d02a", lyd: "uld" },
  { navn: "Grøn uld", tekstur: "uld:#4cb748", lyd: "uld" },
  { navn: "Blå uld", tekstur: "uld:#3a6fe0", lyd: "uld" },
  { navn: "Lilla uld", tekstur: "uld:#9b4de0", lyd: "uld" },
  { navn: "Lyserød uld", tekstur: "uld:#f28ac8", lyd: "uld" },
  { navn: "Hvid uld", tekstur: "uld:#f2f2f2", lyd: "uld" },
  { navn: "Regnbue", tekstur: "regnbue", lyd: "glas" },
  { navn: "Guld", tekstur: "guld", lyd: "metal" },
  { navn: "Diamant", tekstur: "diamant", lyd: "glas" },
  { navn: "Lampe", tekstur: "lampe", lyser: true, lyd: "glas" },
  { navn: "Kage", tekstur: { top: "kageTop", side: "kageSide", bund: "kageBund" }, lyd: "uld" },
  { navn: "Græskar", tekstur: { top: "græskarTop", side: "græskarSide", bund: "græskarTop" }, lyd: "træ" },
  { navn: "Rød blomst", tekstur: "blomst:#e8283c", kryds: true, lyd: "græs" },
  { navn: "Gul blomst", tekstur: "blomst:#f7d51d", kryds: true, lyd: "græs" },
  { navn: "Bundsten", tekstur: "bundsten", uknuselig: true, skjult: true, lyd: "sten" },
  // --- Zombieverdenen ---
  { navn: "Mørkt græs", tekstur: { top: "mørkGræsTop", side: "mørkGræsSide", bund: "jord" }, lyd: "græs" },
  { navn: "Gravsten", tekstur: "gravsten", lyd: "sten" },
  { navn: "Død stamme", tekstur: { top: "stammeTop", side: "dødStamme", bund: "stammeTop" }, lyd: "træ" },
  { navn: "Lygtemand", tekstur: { top: "græskarTop", side: "lygtemand", bund: "græskarTop" }, lyser: true, lyd: "træ" },
  { navn: "Spindelvæv", tekstur: "spindelvæv", kryds: true, lyd: "uld" },
  // --- Svampeverdenen ---
  { navn: "Svampejord", tekstur: { top: "svampejordTop", side: "svampejordSide", bund: "jord" }, lyd: "græs" },
  { navn: "Rød svamp", tekstur: "prikker:#d9232e:#ffffff", hopper: true, lyd: "uld" },
  { navn: "Blå svamp", tekstur: "prikker:#3a7be0:#ffe066", hopper: true, lyd: "uld" },
  { navn: "Svampestok", tekstur: { top: "svampestokTop", side: "svampestok", bund: "svampestokTop" }, lyd: "træ" },
  { navn: "Lille svamp", tekstur: "lilleSvamp:#e8283c", kryds: true, lyd: "græs" },
  { navn: "Glødesvamp", tekstur: "lilleSvamp:#5ff0ff", kryds: true, lyser: true, lyd: "glas" },
  // --- Ostemånen ---
  { navn: "Ost", tekstur: "ost", lyd: "uld" },
  { navn: "Månesten", tekstur: "månesten", lyd: "sten" },
  { navn: "Stjerneblok", tekstur: "stjerner", lyser: true, lyd: "glas" },
  { navn: "Krystal", tekstur: "krystal", kryds: true, lyser: true, lyd: "glas" },
  // --- TNT ---
  { navn: "TNT", tekstur: { top: "tntTop", side: "tntSide", bund: "tntBund" }, tnt: true, lyd: "græs" },
  // --- Vand, lava og ild: flyder og brænder via simulering.js. Man hælder dem ud med spandene og tænderen (vaerktoej.js) ---
  { navn: "Vand", tekstur: "vand", væske: "vand", niveau: 0, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 1", tekstur: "vand", væske: "vand", niveau: 1, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 2", tekstur: "vand", væske: "vand", niveau: 2, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 3", tekstur: "vand", væske: "vand", niveau: 3, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 4", tekstur: "vand", væske: "vand", niveau: 4, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 5", tekstur: "vand", væske: "vand", niveau: 5, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 6", tekstur: "vand", væske: "vand", niveau: 6, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Vand 7", tekstur: "vand", væske: "vand", niveau: 7, gennemsigtig: true, skjult: true, lyd: "vand" },
  { navn: "Lava", tekstur: "lava", væske: "lava", niveau: 0, lyser: true, skjult: true, lyd: "lava" },
  { navn: "Lava 1", tekstur: "lava", væske: "lava", niveau: 1, lyser: true, skjult: true, lyd: "lava" },
  { navn: "Lava 2", tekstur: "lava", væske: "lava", niveau: 2, lyser: true, skjult: true, lyd: "lava" },
  { navn: "Lava 3", tekstur: "lava", væske: "lava", niveau: 3, lyser: true, skjult: true, lyd: "lava" },
  { navn: "Ild", tekstur: "ild", ild: true, kryds: true, lyser: true, skjult: true, lyd: "ild" },
  { navn: "Obsidian", tekstur: "obsidian", lyd: "sten" },
  // --- Skydebanen (skive: bliver til konfetti, når den bliver ramt — og kommer igen lidt efter) ---
  { navn: "Skydeskive", tekstur: { top: "planker", side: "skydeskive", bund: "planker" }, skive: true, lyd: "træ" },
  { navn: "Sandsæk", tekstur: "sandsæk", lyd: "sand" },
  { navn: "Trækasse", tekstur: { top: "kasseTop", side: "kasse", bund: "kasseTop" }, lyd: "træ" },
  { navn: "Camouflage", tekstur: "camouflage", lyd: "uld" },
  // --- Fyrværkeri (fyrværkeri: tænd den med 🔥 eller 🔨, så skyder den raketter op) ---
  { navn: "Fyrværkeri", tekstur: { top: "fyrTop", side: "fyrSide", bund: "fyrBund" }, fyrværkeri: true, lyd: "græs" },
  { navn: "Sne", tekstur: "sne", lyd: "sand" },
  // --- Mere fyrværkeri og vinter (glat: man glider på den) ---
  { navn: "Is", tekstur: "is", glat: true, lyd: "glas" },
  { navn: "Show-kasse", tekstur: { top: "showTop", side: "showSide", bund: "fyrBund" }, fyrværkeri: "show", lyd: "græs" },
  { navn: "Fontæne", tekstur: { top: "fontæneTop", side: "fontæneSide", bund: "fyrBund" }, fyrværkeri: "fontæne", lyd: "metal" },
  { navn: "Lyskæde", tekstur: "lyskæde", lyser: true, lyd: "glas" },
  { navn: "Gave", tekstur: { top: "gaveTop", side: "gaveSide", bund: "gaveBund" }, lyd: "uld" },
  // --- Portalen (som i Minecraft: byg en ramme af obsidian og tænd den med 🔥) ---
  { navn: "Portal", tekstur: "portal", portal: true, gennemsigtig: true, lyser: true, skjult: true, lyd: "glas" },
  // --- Underverdenen ---
  { navn: "Rødsten", tekstur: "rødsten", lyd: "sten" },
  { navn: "Glødesten", tekstur: "glødesten", lyser: true, lyd: "glas" },
  { navn: "Sjælesand", tekstur: "sjælesand", lyd: "sand" },
  { navn: "Borgsten", tekstur: "borgsten", lyd: "sten" },
  { navn: "Basalt", tekstur: { top: "basaltTop", side: "basalt", bund: "basaltTop" }, lyd: "sten" },
  { navn: "Rødt mos", tekstur: { top: "rødtMos", side: "rødtMosSide", bund: "rødsten" }, lyd: "græs" },
  { navn: "Rødstilk", tekstur: { top: "rødstilkTop", side: "rødstilk", bund: "rødstilkTop" }, lyd: "træ" },
  { navn: "Vortesvamp", tekstur: "vortesvamp", lyd: "uld" },
  // --- Brandmandsbyen (ingen af dem kan brænde) ---
  { navn: "Asfalt", tekstur: "asfalt", lyd: "sten" },
  { navn: "Vejstribe", tekstur: "vejstribe", lyd: "sten" },
  { navn: "Fliser", tekstur: "fliser", lyd: "sten" },
  { navn: "Tagsten", tekstur: "tagsten", lyd: "sten" },
  { navn: "Brandhane", tekstur: "brandhane", kryds: true, lyd: "metal" },
  { navn: "Garageport", tekstur: "garageport", lyd: "metal" },
  { navn: "Gul puds", tekstur: "puds:#f2d37a", lyd: "sten" },
  { navn: "Hvid puds", tekstur: "puds:#f4f1ea", lyd: "sten" },
  { navn: "Blå puds", tekstur: "puds:#a8c8ec", lyd: "sten" },
  // --- Piratøen ---
  { navn: "Palmestamme", tekstur: { top: "palmeTop", side: "palmestamme", bund: "palmeTop" }, lyd: "træ" },
  { navn: "Palmeblade", tekstur: "palmeblade", lyd: "græs" },
  { navn: "Skattekiste", tekstur: { top: "kisteTop", side: "kisteSide", bund: "skibsplanker" }, skat: true, lyd: "træ" },
  { navn: "Skattekryds", tekstur: { top: "skattekryds", side: "sand", bund: "sand" }, lyd: "sand" },
  { navn: "Skibsplanker", tekstur: "skibsplanker", lyd: "træ" },
  { navn: "Sejl", tekstur: "sejl", lyd: "uld" },
  { navn: "Piratflag", tekstur: "piratflag", lyd: "uld" },
  { navn: "Kanon", tekstur: { top: "kanonTop", side: "kanonSide", bund: "skibsplanker" }, kanon: true, lyd: "metal" },
  // --- Havbunden ---
  { navn: "Koralblok", tekstur: "koralblok", lyd: "sten" },
  { navn: "Rød koral", tekstur: "koral:#ff4a6a", kryds: true, lyd: "græs" },
  { navn: "Gul koral", tekstur: "koral:#ffc83a", kryds: true, lyd: "græs" },
  { navn: "Lilla koral", tekstur: "koral:#b45aff", kryds: true, lyd: "græs" },
  { navn: "Tang", tekstur: "tang", kryds: true, lyd: "græs" },
  { navn: "Havlygte", tekstur: "havlygte", lyser: true, lyd: "glas" },
  { navn: "Prismarin", tekstur: "prismarin", lyd: "sten" },
  // --- Slikland ---
  { navn: "Glasur", tekstur: { top: "glasurTop", side: "glasurSide", bund: "kagebund" }, lyd: "uld" },
  { navn: "Kagebund", tekstur: "kagebund", lyd: "uld" },
  { navn: "Chokolade", tekstur: "chokolade", lyd: "træ" },
  { navn: "Slikstok", tekstur: "slikstok", lyd: "glas" },
  { navn: "Slikkepind", tekstur: "slikkepind", lyd: "glas" },
  { navn: "Skumfidus", tekstur: "skumfidus", hopper: true, lyd: "uld" },
  { navn: "Honningkage", tekstur: "honningkage", lyd: "træ" },
  { navn: "Vingummi", tekstur: "vingummi", lyd: "uld" },
  { navn: "Slikblomst", tekstur: "slikblomst", kryds: true, lyd: "glas" },
  // --- Skyøerne ---
  { navn: "Sky", tekstur: "sky", hopper: true, lyd: "uld" },
  { navn: "Trampolin", tekstur: { top: "trampolinTop", side: "trampolinSide", bund: "trampolinSide" }, hopper: true, superhop: true, lyd: "uld" },
  { navn: "Himmelsten", tekstur: "himmelsten", lyd: "sten" },
  // --- Bondegården (en spire gror af sig selv til en afgrøde — se spil.js) ---
  { navn: "Muld", tekstur: { top: "muld", side: "jord", bund: "jord" }, lyd: "græs" },
  { navn: "Spire", tekstur: "spire", kryds: true, lyd: "græs" },
  { navn: "Hvede", tekstur: "hvede", kryds: true, afgrøde: true, lyd: "græs" },
  { navn: "Gulerod", tekstur: "gulerod", kryds: true, afgrøde: true, lyd: "græs" },
  { navn: "Solsikke", tekstur: "solsikke", kryds: true, afgrøde: true, lyd: "græs" },
  { navn: "Høballe", tekstur: { top: "høballeTop", side: "høballe", bund: "høballeTop" }, lyd: "græs" },
  { navn: "Hegn", tekstur: "hegn", gennemsigtig: true, lyd: "træ" },
  { navn: "Ladetræ", tekstur: "ladetræ", lyd: "træ" },
  // --- Dinodalen ---
  { navn: "Junglestamme", tekstur: { top: "jungleTop", side: "junglestamme", bund: "jungleTop" }, lyd: "træ" },
  { navn: "Jungleblade", tekstur: "jungleblade", lyd: "græs" },
  { navn: "Bregne", tekstur: "bregne", kryds: true, lyd: "græs" },
  { navn: "Lian", tekstur: "lian", kryds: true, lyd: "græs" },
  { navn: "Dinoæg", tekstur: "dinoæg", dinoæg: true, lyd: "uld" },
  { navn: "Rede", tekstur: { top: "redeTop", side: "rede", bund: "rede" }, lyd: "græs" },
  { navn: "Vulkansten", tekstur: "vulkansten", lyd: "sten" },
  // --- NUKE-banen ---
  { navn: "Atombombe", tekstur: { top: "atombombeTop", side: "atombombe", bund: "atombombeTop" }, atom: true, lyd: "metal" },
  { navn: "Atomtønde", tekstur: { top: "atomtøndeTop", side: "atomtønde", bund: "atomtøndeTop" }, tnt: true, lyd: "metal" },
  { navn: "Beton", tekstur: "beton", lyd: "sten" },
  { navn: "Aske", tekstur: "aske", lyd: "sand" },
  { navn: "Atomslim", tekstur: "atomslim", lyser: true, hopper: true, lyd: "vand" },
  // --- NUKE-banen: kæmpebomben, missiler og den røde knap ---
  { navn: "Kæmpebombe", tekstur: { top: "kæmpebombeTop", side: "kæmpebombe", bund: "kæmpebombeTop" }, atom: "kæmpe", lyd: "metal" },
  { navn: "Missil", tekstur: { top: "missilTop", side: "missil", bund: "missilTop" }, missil: true, lyd: "metal" },
  { navn: "Missilspids", tekstur: { top: "tom", side: "missilspids", bund: "missilTop" }, missil: "spids", gennemsigtig: true, lyd: "metal" },
  { navn: "Affyringsknap", tekstur: { top: "knapTop", side: "knapSide", bund: "stål" }, knap: true, lyd: "metal" },
  { navn: "Advarselsstriber", tekstur: "advarsel", lyd: "metal" },
  { navn: "Kontrolpult", tekstur: { top: "pultTop", side: "pultSide", bund: "stål" }, lyser: true, lyd: "metal" },
  { navn: "Stålplade", tekstur: "stål", lyd: "metal" },
  // --- Ildtornadoerne ---
  { navn: "Tørt græs", tekstur: { top: "tørtGræsTop", side: "tørtGræsSide", bund: "jord" }, lyd: "græs" },
  { navn: "Rødsandsten", tekstur: "rødsandsten", lyd: "sten" },
  { navn: "Kaktus", tekstur: { top: "kaktusTop", side: "kaktus", bund: "kaktusTop" }, lyd: "græs" },
  { navn: "Tør busk", tekstur: "tørBusk", kryds: true, lyd: "græs" },
  { navn: "Brændt jord", tekstur: { top: "brændtJord", side: "brændtJordSide", bund: "jord" }, lyd: "sand" },
  { navn: "Magma", tekstur: "magma", lyser: true, lyd: "sten" },
  // --- Fyrværkeri: nytårsuret, kæmperaketten og dronekassen ---
  { navn: "Ur", tekstur: { top: "sten", side: "ur", bund: "sten" }, ur: true, lyser: true, lyd: "sten" },
  { navn: "Kæmperaket", tekstur: { top: "kæmperaketTop", side: "kæmperaket", bund: "fyrBund" }, raketTur: true, lyd: "metal" },
  { navn: "Dronekasse", tekstur: { top: "dronekasseTop", side: "dronekasse", bund: "fyrBund" }, droner: true, lyd: "metal" },
  // --- Uendelighedsverdenen: årstidernes træer og blomster ---
  { navn: "Granblade", tekstur: "granblade", lyd: "græs" },
  { navn: "Snegran", tekstur: { top: "sne", side: "snegranSide", bund: "granblade" }, lyd: "græs" },
  { navn: "Birkestamme", tekstur: { top: "stammeTop", side: "birk", bund: "stammeTop" }, lyd: "træ" },
  { navn: "Kirsebærblade", tekstur: "løv:#f4a6c8", lyd: "græs" },
  { navn: "Orange blade", tekstur: "løv:#e8862a", lyd: "græs" },
  { navn: "Røde blade", tekstur: "løv:#c8322a", lyd: "græs" },
  { navn: "Gule blade", tekstur: "løv:#e8c42a", lyd: "græs" },
  { navn: "Tulipan", tekstur: "blomst:#ff5fa2", kryds: true, lyd: "græs" },
  { navn: "Blå blomst", tekstur: "blomst:#4a7cf0", kryds: true, lyd: "græs" },
  { navn: "Hvid blomst", tekstur: "blomst:#ffffff", kryds: true, lyd: "græs" },
  { navn: "Højt græs", tekstur: "højtGræs", kryds: true, lyd: "græs" },
  // --- Den uendelige verden: togbanen, guldkisten derhjemme og stenringens sokler ---
  { navn: "Skinner", tekstur: { top: "skinnerNS", side: "planker", bund: "planker" }, lyd: "metal" },
  { navn: "Skinner øst-vest", tekstur: { top: "skinnerØV", side: "planker", bund: "planker" }, skjult: true, lyd: "metal" },
  { navn: "Guldkiste", tekstur: { top: "guldkisteTop", side: "guldkiste", bund: "guld" }, kiste: true, uknuselig: true, skjult: true, lyser: true, lyd: "metal" },
  { navn: "Stensokkel", tekstur: { top: "sokkelTop", side: "borgsten", bund: "borgsten" }, sokkel: true, uknuselig: true, skjult: true, lyd: "sten" },
  // --- Den uendelige verden: jordbær i sommerlandet, is i isboderne og butikkens særlige blokke ---
  { navn: "Jordbær", tekstur: "jordbær", kryds: true, lyd: "græs" },
  { navn: "Is i vaffel", tekstur: "isvaffel", kryds: true, lyd: "uld" },
  { navn: "Glimmerguld", tekstur: "glimmerguld", lyser: true, skjult: true, butik: true, lyd: "metal" },
  { navn: "Regnbuelys", tekstur: "regnbuelys", lyser: true, skjult: true, butik: true, lyd: "glas" },
  { navn: "Hjerteblok", tekstur: "hjerter", lyser: true, skjult: true, butik: true, lyd: "uld" },
];

export const ID = {};
BLOKKE.forEach((b, i) => { if (b) ID[b.navn] = i; });

// ---------- Pixel-mønstre (16×16) ----------
const T = 16;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lys = (c, f) => c.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
function rng(frø) {
  let a = frø >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const navnFrø = s => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
const alle = fn => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) fn(x, y); };
function fyld(set, r, farve, v = 0.2) { const c = hex(farve); alle((x, y) => set(x, y, lys(c, 1 + (r() - 0.5) * v))); }
function prik(set, r, farver, n) { for (let i = 0; i < n; i++) set(Math.floor(r() * T), Math.floor(r() * T), hex(farver[i % farver.length])); }

const MØNSTRE = {
  jord: (set, r) => { fyld(set, r, "#8b5a2b", 0.25); prik(set, r, ["#6b4220", "#a8763f"], 22); },
  græsTop: (set, r) => { fyld(set, r, "#5fb33a", 0.28); prik(set, r, ["#4a9a2c", "#79cc4f"], 26); },
  græsSide: (set, r) => {
    MØNSTRE.jord(set, r);
    const g = hex("#5fb33a");
    for (let x = 0; x < T; x++) {
      const h = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.15 ? 1 : 0);
      for (let y = 0; y < h; y++) set(x, y, lys(g, 1 + (r() - 0.5) * 0.3));
    }
  },
  sten: (set, r) => { fyld(set, r, "#8c8c8c", 0.18); prik(set, r, ["#6f6f6f", "#a3a3a3", "#7a7a7a"], 30); },
  sand: (set, r) => { fyld(set, r, "#e3d59d", 0.12); prik(set, r, ["#d2c386", "#efe4b5"], 20); },
  stamme: (set, r) => { const c = hex("#6b4a2b"); alle((x, y) => set(x, y, lys(c, (x % 4 === 0 ? 0.75 : 1) * (1 + (r() - 0.5) * 0.2)))); },
  stammeTop: (set, r) => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const c = d > 6.5 ? hex("#6b4a2b") : Math.floor(d) % 2 ? hex("#b8905a") : hex("#9c7545");
    set(x, y, lys(c, 1 + (r() - 0.5) * 0.12));
  }),
  blade: (set, r) => { fyld(set, r, "#3f9b35", 0.4); prik(set, r, ["#2d7a26", "#56b54a", "#23661e"], 44); },
  planker: (set, r) => {
    const c = hex("#b8894f"), m = hex("#8a6232");
    alle((x, y) => {
      const søm = x === (Math.floor(y / 4) % 2 ? 3 : 11);
      set(x, y, y % 4 === 3 || søm ? lys(m, 1 + (r() - 0.5) * 0.1) : lys(c, 1 + (r() - 0.5) * 0.14));
    });
  },
  glas: set => alle((x, y) => {
    const kant = x === 0 || y === 0 || x === 15 || y === 15, glans = (x - y === 2 || x - y === 3) && x > 2 && x < 9;
    if (kant) set(x, y, hex("#dff4ff")); else if (glans) set(x, y, hex("#ffffff")); else set(x, y, [200, 230, 255], 0);
  }),
  mursten: (set, r) => {
    const sten = hex("#b5523b"), mørtel = hex("#d4c9bc");
    alle((x, y) => {
      const skel = y % 4 === 3 || x === (Math.floor(y / 4) % 2 ? 0 : 8);
      set(x, y, skel ? lys(mørtel, 1 + (r() - 0.5) * 0.1) : lys(sten, 1 + (r() - 0.5) * 0.22));
    });
  },
  regnbue: (set, r) => {
    const f = ["#e8283c", "#f28a1e", "#f7d51d", "#4cb748", "#3a9ad9", "#3a4fd9", "#9b4de0", "#e84fb0"];
    alle((x, y) => set(x, y, lys(hex(f[Math.floor(y / 2)]), 1 + (r() - 0.5) * 0.1)));
  },
  guld: (set, r) => {
    fyld(set, r, "#f5c542", 0.12);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#c9971e")); });
    prik(set, r, ["#fff3b0", "#ffe27a"], 14);
  },
  diamant: (set, r) => {
    fyld(set, r, "#7fe7f0", 0.14);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#3fb8c4")); });
    prik(set, r, ["#ffffff", "#c8fbff"], 16);
  },
  lampe: (set, r) => alle((x, y) => {
    const kant = x === 0 || y === 0 || x === 15 || y === 15, klat = (x % 5 < 3) && (y % 5 < 3);
    set(x, y, kant ? hex("#c98f2a") : klat ? lys(hex("#fff7c2"), 1 + (r() - 0.5) * 0.05) : lys(hex("#f7c95b"), 1 + (r() - 0.5) * 0.1));
  }),
  kageTop: (set, r) => { fyld(set, r, "#f7f3ee", 0.05); prik(set, r, ["#e03a3a"], 7); },
  kageSide: (set, r) => alle((x, y) => {
    const glasur = y < 3 || (y === 3 && (x * 7) % 5 < 2);
    const c = glasur ? "#f7f3ee" : y === 9 || y === 10 ? "#f5e6c8" : y > 13 ? "#6e4530" : "#8a5a3c";
    set(x, y, lys(hex(c), 1 + (r() - 0.5) * 0.1));
  }),
  kageBund: (set, r) => fyld(set, r, "#6e4530", 0.1),
  græskarTop: (set, r) => alle((x, y) => {
    const stilk = x >= 6 && x <= 9 && y >= 6 && y <= 9;
    set(x, y, stilk ? hex("#5a7a2a") : lys(hex("#e8891c"), (x % 4 === 0 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.12)));
  }),
  græskarSide: (set, r) => alle((x, y) => {
    const øje = y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) && !(y === 4 && (x === 3 || x === 12));
    const mund = (y === 10 && x >= 3 && x <= 12) || (y === 11 && x >= 4 && x <= 11 && x !== 6 && x !== 9);
    set(x, y, øje || mund ? hex("#3a2410") : lys(hex("#e8891c"), (x % 4 === 0 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.12)));
  }),
  bundsten: (set, r) => { fyld(set, r, "#3a3a3a", 0.3); prik(set, r, ["#555555", "#222222"], 40); },

  // --- Zombieverdenen ---
  mørkGræsTop: (set, r) => { fyld(set, r, "#2f5d4a", 0.3); prik(set, r, ["#6b3f8c", "#3f7a5a", "#24483a"], 30); },
  mørkGræsSide: (set, r) => {
    fyld(set, r, "#5a3a22", 0.25); prik(set, r, ["#442a18", "#6e4a2c"], 20);
    const g = hex("#2f5d4a");
    for (let x = 0; x < T; x++) { const h = 3 + (r() < 0.5 ? 1 : 0); for (let y = 0; y < h; y++) set(x, y, lys(g, 1 + (r() - 0.5) * 0.3)); }
  },
  gravsten: (set, r) => {
    fyld(set, r, "#9a9aa2", 0.15);
    alle((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, hex("#6f6f78")); });
    for (let y = 3; y <= 12; y++) { set(7, y, hex("#55555c")); set(8, y, hex("#55555c")); }
    for (let x = 4; x <= 11; x++) { set(x, 5, hex("#55555c")); set(x, 6, hex("#55555c")); }
    for (let i = 0; i < 10; i++) set(Math.floor(r() * T), 13 + Math.floor(r() * 3), hex("#4f7a3a"));
  },
  dødStamme: (set, r) => { const c = hex("#6e6259"); alle((x, y) => set(x, y, lys(c, (x % 5 === 0 ? 0.72 : 1) * (1 + (r() - 0.5) * 0.18)))); },
  lygtemand: (set, r) => alle((x, y) => {
    const øje = y >= 4 && y <= 6 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) && !(y === 4 && (x === 3 || x === 12));
    const mund = (y === 10 && x >= 3 && x <= 12) || (y === 11 && x >= 4 && x <= 11 && x !== 6 && x !== 9);
    set(x, y, øje || mund ? lys(hex("#ffe066"), 1 + (r() - 0.5) * 0.15) : lys(hex("#e8891c"), (x % 4 === 0 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.12)));
  }),
  spindelvæv: set => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const tråd = x === y || x + y === 15 || x === 7 || y === 8 || Math.abs(d - 3.5) < 0.5 || Math.abs(d - 6.5) < 0.5;
    set(x, y, [240, 240, 245], tråd ? 255 : 0);
  }),

  // --- Svampeverdenen ---
  svampejordTop: (set, r) => { fyld(set, r, "#8a6f9e", 0.25); prik(set, r, ["#b89ad0", "#6a5280", "#c9b0e0"], 30); },
  svampejordSide: (set, r) => {
    MØNSTRE.jord(set, r);
    const g = hex("#8a6f9e");
    for (let x = 0; x < T; x++) { const h = 2 + (r() < 0.5 ? 1 : 0); for (let y = 0; y < h; y++) set(x, y, lys(g, 1 + (r() - 0.5) * 0.3)); }
  },
  svampestok: (set, r) => { const c = hex("#efe6d2"); alle((x, y) => set(x, y, lys(c, (x % 3 === 0 ? 0.93 : 1) * (1 + (r() - 0.5) * 0.06)))); },
  svampestokTop: (set, r) => alle((x, y) => set(x, y, lys(hex(Math.hypot(x - 7.5, y - 7.5) < 3 ? "#d9cdb0" : "#efe6d2"), 1 + (r() - 0.5) * 0.06))),

  // --- Ostemånen ---
  ost: (set, r) => {
    fyld(set, r, "#ffcf3f", 0.08);
    const huller = [[4, 4, 2.2], [11, 6, 1.6], [6, 11, 1.8], [12, 12, 1.3], [1, 9, 1]];
    alle((x, y) => { for (const [hx, hy, hr] of huller) { const d = Math.hypot(x - hx, y - hy); if (d < hr) set(x, y, hex(d < hr - 0.8 ? "#c98f1e" : "#e0a82a")); } });
  },
  månesten: (set, r) => {
    fyld(set, r, "#a9a9b8", 0.18);
    for (const [hx, hy, hr] of [[5, 5, 2.5], [11, 11, 2], [12, 3, 1.3]]) alle((x, y) => {
      const d = Math.hypot(x - hx, y - hy);
      if (d < hr - 0.7) set(x, y, hex("#8a8a99")); else if (d < hr + 0.3) set(x, y, hex("#c8c8d4"));
    });
  },
  stjerner: (set, r) => {
    fyld(set, r, "#141438", 0.25); prik(set, r, ["#ffffff", "#fff3a0", "#b0c8ff"], 14);
    for (const [cx, cy] of [[4, 11], [11, 4]]) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + dx, cy + dy, hex("#ffffff"));
  },
  tntSide: (set, r) => {
    alle((x, y) => set(x, y, lys(hex("#d62d20"), (x % 4 === 1 ? 0.8 : 1) * (y < 2 || y > 13 ? 0.85 : 1) * (1 + (r() - 0.5) * 0.1))));
    for (let x = 0; x < T; x++) for (let y = 5; y <= 10; y++) set(x, y, hex(y === 5 || y === 10 ? "#c8c8c8" : "#f2f2f2"));
    const bogstaver = { T: ["###", ".#.", ".#.", ".#."], N: ["#..#", "##.#", "#.##", "#..#"] };
    let x0 = 2;
    for (const b of "TNT") {
      bogstaver[b].forEach((række, dy) => [...række].forEach((c, dx) => { if (c === "#") set(x0 + dx, 6 + dy, hex("#1a1a1a")); }));
      x0 += bogstaver[b][0].length + 1;
    }
  },
  tntTop: (set, r) => {
    fyld(set, r, "#9a9a9a", 0.15);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#d62d20")); });
    alle((x, y) => { if (x >= 6 && x <= 9 && y >= 6 && y <= 9) set(x, y, hex(x >= 7 && x <= 8 && y >= 7 && y <= 8 ? "#1a1a1a" : "#555555")); });
  },
  tntBund: (set, r) => fyld(set, r, "#8a8a8a", 0.15),
  krystal: set => alle((x, y) => {
    const a = y >= 4 && Math.abs(x - 4.5) <= (y - 4) * 0.28, b = y >= 7 && Math.abs(x - 11) <= (y - 7) * 0.3, c = y >= 1 && Math.abs(x - 7.5) <= (y - 1) * 0.2;
    if (c) set(x, y, hex(x < 7.5 ? "#e2d0ff" : "#c9a8ff")); else if (a || b) set(x, y, hex(x % 2 ? "#b98cff" : "#9b6ae8")); else set(x, y, [0, 0, 0], 0);
  }),

  // --- Vand, lava og ild (mønstrene går i ét, så de kan glide hen over fladerne) ---
  vand: (set, r) => {
    fyld(set, r, "#3b7fe0", 0.1);
    for (let y = 1; y < T; y += 4) {                                     // små bølger
      const x0 = (y * 5 + Math.floor(r() * 4)) % T;
      for (let i = 0; i < 5; i++) set((x0 + i) % T, y, lys(hex("#79b4ff"), 1 + (r() - 0.5) * 0.08));
      set((x0 + 5) % T, (y + 1) % T, hex("#5a98f0"));
    }
    prik(set, r, ["#d8ecff"], 5);
  },
  lava: (set, r) => {
    fyld(set, r, "#f2661b", 0.12);
    const om = (a, b) => Math.min(Math.abs(a - b), T - Math.abs(a - b));  // afstand hele vejen rundt
    for (const [cx, cy, rr, f] of [[4, 4, 3.2, "#ffc93a"], [12, 9, 2.6, "#ffb02e"], [7, 13, 2.2, "#ffd84f"], [13, 2, 1.6, "#ffe27a"]]) {
      alle((x, y) => { const d = Math.hypot(om(x, cx), om(y, cy)); if (d < rr) set(x, y, lys(hex(d < rr * 0.5 ? "#fff1a8" : f), 1 + (r() - 0.5) * 0.08)); });
    }
    for (const [cx, cy] of [[10, 5], [2, 10], [15, 13]]) alle((x, y) => { if (Math.hypot(om(x, cx), om(y, cy)) < 1.3) set(x, y, hex("#b8360f")); });
  },
  ild: (set, r) => ildRamme(set, r),
  portal: (set, r) => portalRamme(set, 0, r),
  obsidian: (set, r) => { fyld(set, r, "#1f1433", 0.3); prik(set, r, ["#3b2566", "#5a3d8f", "#0f0a1a", "#6e4fb0"], 34); },

  // --- Skydebanen ---
  skydeskive: set => alle((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5), kant = x === 0 || y === 0 || x === 15 || y === 15;
    set(x, y, hex(kant ? "#8a6232" : d < 1.9 ? "#ffd23f" : Math.floor(d / 1.9) % 2 ? "#ffffff" : "#e03a3a"));
  }),
  sandsæk: (set, r) => alle((x, y) => {
    const række = Math.floor(y / 5), fx = (x + (række % 2) * 4) % 8;
    const søm = y % 5 === 4 || fx === 7, lyst = y % 5 === 0 || fx === 0;
    set(x, y, lys(hex(søm ? "#9c8452" : lyst ? "#e8d6a4" : "#cdb57c"), 1 + (r() - 0.5) * 0.12));
  }),
  kasse: (set, r) => alle((x, y) => {
    const ramme = x < 2 || y < 2 || x > 13 || y > 13, skrå = Math.abs(x - y) < 1.5;
    set(x, y, lys(hex(ramme || skrå ? "#7a5228" : Math.floor(y / 4) % 2 ? "#b8894f" : "#a8793f"), 1 + (r() - 0.5) * 0.14));
  }),
  kasseTop: (set, r) => alle((x, y) => set(x, y, lys(hex(x < 2 || y < 2 || x > 13 || y > 13 ? "#7a5228" : x % 5 === 2 ? "#a8793f" : "#b8894f"), 1 + (r() - 0.5) * 0.14))),
  camouflage: (set, r) => {
    fyld(set, r, "#5f7f3a", 0.1);
    const om = (a, b) => Math.min(Math.abs(a - b), T - Math.abs(a - b));
    for (const [f, n] of [["#3f5a28", 5], ["#8a7a4a", 4], ["#2e3f22", 3]]) for (let i = 0; i < n; i++) {
      const cx = r() * T, cy = r() * T, rr = 1.6 + r() * 2.4;
      alle((x, y) => { if (om(x, cx) ** 2 + om(y, cy) ** 2 < rr * rr) set(x, y, lys(hex(f), 1 + (r() - 0.5) * 0.08)); });
    }
  },
  // --- Fyrværkeri ---
  fyrSide: (set, r) => {
    alle((x, y) => set(x, y, lys(hex(y < 2 || y > 13 ? "#f5c542" : x % 5 === 0 ? "#b8241a" : "#d62d20"), 1 + (r() - 0.5) * 0.1)));
    for (const [cx, cy] of [[4, 5], [11, 8], [6, 11]]) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + dx, cy + dy, hex("#ffe066"));
  },
  fyrTop: (set, r) => {
    fyld(set, r, "#c9971e", 0.1);
    alle((x, y) => { if (x % 4 !== 0 && x % 4 !== 3 && y % 4 !== 0 && y % 4 !== 3) set(x, y, hex("#2a1a10")); });
    for (let y = 3; y <= 8; y++) set(8, y, hex(y < 5 ? "#ff8c1a" : "#e8e8e8"));                  // lunten
  },
  fyrBund: (set, r) => fyld(set, r, "#8a1a14", 0.1),
  sne: (set, r) => { fyld(set, r, "#f4f8ff", 0.05); prik(set, r, ["#dfe9fb", "#ffffff", "#cfdcf5"], 26); },
  is: (set, r) => {
    fyld(set, r, "#bfe3ff", 0.06);
    alle((x, y) => { if ((x + y) % 9 === 0 || (x + y + 4) % 13 === 0) set(x, y, hex(x % 3 ? "#e8f6ff" : "#ffffff")); });
    prik(set, r, ["#9fd0f5"], 10);
  },
  showSide: (set, r) => {
    alle((x, y) => set(x, y, lys(hex(y < 2 || y > 13 ? "#f5c542" : "#6b3fb8"), 1 + (r() - 0.5) * 0.1)));
    for (const [cx, cy, f] of [[4, 5, "#ffe066"], [11, 7, "#ff6fd0"], [6, 11, "#5ff0ff"], [12, 12, "#ffe066"]]) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + dx, cy + dy, hex(f));
  },
  showTop: (set, r) => {
    fyld(set, r, "#f5c542", 0.08);
    alle((x, y) => { if (x % 3 !== 0 && y % 3 !== 0) set(x, y, hex("#2a1a40")); });
    for (let y = 2; y <= 8; y++) set(8, y, hex(y < 4 ? "#ff8c1a" : "#e8e8e8"));
  },
  fontæneSide: (set, r) => alle((x, y) => {
    const kegle = Math.abs(x - 7.5) < 3 + y * 0.3;
    set(x, y, lys(hex(!kegle ? "#3a6fe0" : y % 4 === 1 ? "#ffd23f" : "#c8d0d8"), 1 + (r() - 0.5) * 0.1));
  }),
  fontæneTop: (set, r) => alle((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    set(x, y, hex(d < 2 ? "#2a2a2a" : d < 3 ? "#ffd23f" : d < 7 ? "#c8d0d8" : "#3a6fe0"));
  }),
  lyskæde: (set, r) => {
    fyld(set, r, "#1f4a2a", 0.2);
    alle((x, y) => { if (Math.abs(y - (4 + Math.sin(x / 2.5) * 1.5)) < 0.8 || Math.abs(y - (11 + Math.sin(x / 2.5 + 2) * 1.5)) < 0.8) set(x, y, hex("#0f2a16")); });
    const pærer = ["#ff3b5c", "#ffd23f", "#3aa8ff", "#4cd964", "#ff8c1a", "#c86bff"];
    [[2, 5], [6, 3], [10, 5], [14, 4], [3, 12], [7, 10], [11, 12], [15, 11]].forEach(([x, y], i) => {
      set(x, y, hex(pærer[i % pærer.length])); set(x, y + 1, hex(pærer[i % pærer.length])); set(x + 1 > 15 ? x - 1 : x + 1, y, hex("#ffffff"));
    });
  },
  gaveSide: (set, r) => alle((x, y) => set(x, y, lys(hex(x === 7 || x === 8 ? "#f5c542" : "#e03a3a"), 1 + (r() - 0.5) * 0.1))),
  gaveTop: (set, r) => alle((x, y) => {
    const bånd = x === 7 || x === 8 || y === 7 || y === 8, sløjfe = Math.hypot(x - 5, y - 5) < 2.2 || Math.hypot(x - 10, y - 5) < 2.2;
    set(x, y, lys(hex(sløjfe || bånd ? "#f5c542" : "#e03a3a"), 1 + (r() - 0.5) * 0.1));
  }),
  gaveBund: (set, r) => fyld(set, r, "#b82a2a", 0.1),

  // --- Underverdenen ---
  rødsten: (set, r) => { fyld(set, r, "#7a2a2a", 0.3); prik(set, r, ["#5a1a1a", "#9a3a36", "#6a2020", "#8a3030"], 44); },
  glødesten: (set, r) => {
    fyld(set, r, "#e8a83a", 0.2);
    prik(set, r, ["#fff3b0", "#ffe27a", "#fff8d8"], 30);
    prik(set, r, ["#a8641e", "#c98f2a"], 16);
  },
  sjælesand: (set, r) => {
    fyld(set, r, "#5a4232", 0.25); prik(set, r, ["#3f2e22", "#6e5242", "#4a3628"], 30);
    for (const [fx, fy] of [[3, 3], [10, 9]]) {                   // svage, søde ansigter i sandet
      set(fx, fy, hex("#2a1e16")); set(fx + 3, fy, hex("#2a1e16"));
      set(fx + 1, fy + 3, hex("#2a1e16")); set(fx + 2, fy + 3, hex("#2a1e16"));
    }
  },
  borgsten: (set, r) => {
    const sten = hex("#4a1c26"), mørtel = hex("#240c12");
    alle((x, y) => {
      const skel = y % 5 === 4 || x === (Math.floor(y / 5) % 2 ? 3 : 11);
      set(x, y, skel ? lys(mørtel, 1 + (r() - 0.5) * 0.1) : lys(sten, (y % 5 === 0 ? 1.18 : 1) * (1 + (r() - 0.5) * 0.18)));
    });
  },
  basalt: (set, r) => alle((x, y) => set(x, y, lys(hex(x % 4 === 0 ? "#34343a" : x % 4 === 2 ? "#55555e" : "#46464e"), 1 + (r() - 0.5) * 0.14))),
  basaltTop: (set, r) => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    set(x, y, lys(hex(Math.floor(d) % 3 === 0 ? "#3a3a42" : "#50505a"), 1 + (r() - 0.5) * 0.12));
  }),
  rødtMos: (set, r) => { fyld(set, r, "#b0243a", 0.3); prik(set, r, ["#d8405a", "#8a1a2a", "#ff6a7a"], 30); },
  rødtMosSide: (set, r) => {
    MØNSTRE.rødsten(set, r);
    for (let x = 0; x < T; x++) {
      const h = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.2 ? 2 : 0);
      for (let y = 0; y < h; y++) set(x, y, lys(hex("#b0243a"), 1 + (r() - 0.5) * 0.3));
    }
  },
  rødstilk: (set, r) => alle((x, y) => set(x, y, lys(hex((x + Math.floor(y / 3)) % 5 === 0 ? "#5a1a4a" : "#8a2a5a"), 1 + (r() - 0.5) * 0.2))),
  rødstilkTop: (set, r) => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    set(x, y, lys(hex(d > 6.5 ? "#8a2a5a" : Math.floor(d) % 2 ? "#c8506a" : "#a83a5a"), 1 + (r() - 0.5) * 0.12));
  }),
  vortesvamp: (set, r) => { fyld(set, r, "#9a1420", 0.3); prik(set, r, ["#6a0a14", "#c82a36", "#ff5a4a"], 36); },

  // --- Brandmandsbyen ---
  asfalt: (set, r) => { fyld(set, r, "#3c3c42", 0.14); prik(set, r, ["#2e2e32", "#4a4a52", "#56565c"], 34); },
  vejstribe: (set, r) => {
    MØNSTRE.asfalt(set, r);
    alle((x, y) => { if (x >= 4 && x <= 11 && y >= 4 && y <= 11) set(x, y, lys(hex("#f2f2ea"), 1 + (r() - 0.5) * 0.08)); });
  },
  fliser: (set, r) => alle((x, y) => set(x, y, x % 8 === 0 || y % 8 === 0 ? lys(hex("#9a9a92"), 1 + (r() - 0.5) * 0.1) : lys(hex("#cfcfc6"), 1 + (r() - 0.5) * 0.1))),
  tagsten: (set, r) => alle((x, y) => {
    const række = Math.floor(y / 4), bue = (x + (række % 2) * 4) % 8, kant = y % 4 === 3 || (bue === 0 && y % 4 > 0);
    set(x, y, lys(hex(kant ? "#7a2418" : y % 4 === 0 ? "#d85a40" : "#b8402a"), 1 + (r() - 0.5) * 0.12));
  }),
  brandhane: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 5; y < T; y++) for (let x = 5; x <= 10; x++) set(x, y, lys(hex(x === 5 ? "#ff6b5e" : x === 10 ? "#a81e16" : "#e0302a"), 1 + (r() - 0.5) * 0.08));
    for (let y = 2; y <= 4; y++) for (let x = 6; x <= 9; x++) set(x, y, hex(y === 2 ? "#ff6b5e" : "#e0302a"));
    set(7, 1, hex("#ffd23f")); set(8, 1, hex("#ffd23f"));
    for (let y = 7; y <= 9; y++) { set(3, y, hex("#c8c8c8")); set(4, y, hex("#e0302a")); set(11, y, hex("#e0302a")); set(12, y, hex("#c8c8c8")); }
    for (let x = 4; x <= 11; x++) set(x, 14, hex("#a81e16"));
    set(7, 11, hex("#ffd23f")); set(8, 11, hex("#ffd23f"));
  },
  // --- NUKE-banen ---
  atombombe: (set, r) => {
    fyld(set, r, "#f5d02a", 0.06);
    alle((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, hex("#1a1a1a")); });
    strålingstegn(set, 8, 8, 1, "#1a1a1a");
  },
  atombombeTop: set => alle((x, y) => set(x, y, hex(((x + y) >> 2) % 2 ? "#1a1a1a" : "#f5d02a"))),
  atomtønde: (set, r) => {
    alle((x, y) => set(x, y, lys(hex(y === 2 || y === 13 ? "#8a7a1a" : x < 2 || x > 13 ? "#c8a820" : "#f2d030"), 1 + (r() - 0.5) * 0.08)));
    strålingstegn(set, 8, 8, 0.62, "#1a1a1a");
  },
  atomtøndeTop: (set, r) => alle((x, y) => {
    const kant = Math.hypot(x - 7.5, y - 7.5) > 6.5, boble = (x * 7 + y * 3) % 11 === 0;
    set(x, y, lys(hex(kant ? "#c8a820" : boble ? "#d8ffb0" : "#6aff3a"), 1 + (r() - 0.5) * 0.1));
  }),
  beton: (set, r) => {
    fyld(set, r, "#a8a8a0", 0.1); prik(set, r, ["#909088", "#bcbcb4"], 26);
    let x = Math.floor(r() * 16), y = 0;
    while (y < T) { set(x, y, hex("#6a6a64")); y++; x = Math.max(0, Math.min(15, x + Math.round((r() - 0.5) * 2))); if (r() < 0.25) break; }
  },
  aske: (set, r) => { fyld(set, r, "#5e5e5a", 0.18); prik(set, r, ["#46464a", "#7a7a74", "#8a8a80"], 40); },
  atomslim: (set, r) => {
    fyld(set, r, "#4ae02a", 0.14);
    for (let i = 0; i < 7; i++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 14); set(x, y, hex("#d8ffb0")); set(x + 1, y, hex("#a8ff7a")); set(x, y + 1, hex("#a8ff7a")); }
    prik(set, r, ["#2aa81a"], 10);
  },
  kæmpebombe: (set, r) => {
    fyld(set, r, "#d42a2a", 0.06);
    alle((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, hex("#2a0a0a")); else if (y === 2 || y === 13) set(x, y, hex("#f5d02a")); });
    alle((x, y) => { if (Math.hypot(x - 7.5, y - 7.5) < 5.4) set(x, y, hex("#f5d02a")); });
    strålingstegn(set, 8, 8, 0.74, "#1a1a1a");
  },
  kæmpebombeTop: set => alle((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    set(x, y, hex(d < 3 ? "#f5d02a" : d < 4 ? "#1a1a1a" : ((x + y) >> 2) % 2 ? "#1a1a1a" : "#d42a2a"));
  }),
  // Missilet: hvid krop med et rødt bånd — spidsen er en rød kegle (resten af blokken er gennemsigtig)
  missil: (set, r) => alle((x, y) => {
    let f = y >= 6 && y <= 9 ? "#d8262a" : x < 2 || x > 13 ? "#c8ccd2" : "#f2f2ee";
    if ((y === 2 || y === 13) && x >= 6 && x <= 9) f = "#2a2a2a";
    set(x, y, lys(hex(f), 1 + (r() - 0.5) * 0.05));
  }),
  missilTop: (set, r) => alle((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    set(x, y, lys(hex(d > 6.5 ? "#c8ccd2" : d > 5 ? "#f2f2ee" : "#a8acb2"), 1 + (r() - 0.5) * 0.05));
  }),
  missilspids: (set, r) => alle((x, y) => {
    const halv = (y + 1) / 2;                                    // hvor bred spidsen er i denne højde
    if (Math.abs(x - 7.5) > halv) { set(x, y, [0, 0, 0], 0); return; }
    set(x, y, lys(hex(y < 3 ? "#f2f2ee" : x - 7.5 < 2 - halv ? "#ff6a5e" : "#d8262a"), 1 + (r() - 0.5) * 0.06));
  }),
  tom: set => alle((x, y) => set(x, y, [0, 0, 0], 0)),
  knapTop: (set, r) => alle((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d < 4.6) set(x, y, lys(hex(Math.hypot(x - 6, y - 6) < 1.6 ? "#ff9a8a" : "#e0201a"), 1 + (r() - 0.5) * 0.05));
    else if (d < 5.6) set(x, y, hex("#6a0a0a"));
    else set(x, y, hex(((x + y) >> 1) % 2 ? "#1a1a1a" : "#f5d02a"));
  }),
  knapSide: (set, r) => alle((x, y) => set(x, y, y < 4 ? hex(y === 0 ? "#ff6a5e" : "#e0201a")
    : lys(hex(((x + y) >> 1) % 2 ? "#1a1a1a" : "#f5d02a"), 1 + (r() - 0.5) * 0.05))),
  advarsel: (set, r) => alle((x, y) => set(x, y, lys(hex(((x + y) >> 2) % 2 ? "#1a1a1a" : "#f5c518"), 1 + (r() - 0.5) * 0.08))),
  // Kontrolpulten: en grøn radarskærm og farvede knapper
  pultSide: (set, r) => alle((x, y) => {
    let f = "#3a4048";
    if (x >= 2 && x <= 13 && y >= 2 && y <= 8) {
      const d = Math.hypot(x - 7.5, y - 5);
      f = d < 0.8 ? "#c8ffb0" : Math.abs(d - 2) < 0.5 || Math.abs(d - 4) < 0.5 ? "#3ad02a" : "#0a2a0a";
      if (x > 7.5 && Math.abs(y - 5 + (x - 7.5) * 0.6) < 0.6 && d < 5) f = "#8aff6a";      // radarstrålen
    } else if (y === 11 && x % 3 === 1) f = ["#ff3b30", "#ffd23f", "#4cd964", "#3aa8ff"][Math.floor(x / 3) % 4];
    else if (y === 13 && x >= 3 && x <= 12) f = "#5a626c";
    set(x, y, lys(hex(f), 1 + (r() - 0.5) * 0.05));
  }),
  pultTop: (set, r) => alle((x, y) => set(x, y, lys(hex(x % 4 === 1 && y % 4 === 1 ? ["#ff3b30", "#ffd23f", "#4cd964", "#3aa8ff"][((x + y) >> 2) % 4] : "#4a5058"), 1 + (r() - 0.5) * 0.06))),
  stål: (set, r) => {
    fyld(set, r, "#8a929c", 0.08);
    alle((x, y) => { if (x === 0 || y === 0) set(x, y, hex("#a8b0ba")); else if (x === 15 || y === 15) set(x, y, hex("#5a626c")); });
    for (const [x, y] of [[2, 2], [12, 2], [2, 12], [12, 12]]) { set(x, y, hex("#d0d8e2")); set(x + 1, y + 1, hex("#4a525c")); }
  },
  // --- Ildtornadoerne ---
  // Uendelighedsverdenen: grannåle, sne på granerne, birkebark og højt græs
  granblade: (set, r) => { fyld(set, r, "#2d6b4a", 0.35); prik(set, r, ["#1f5238", "#3f8a5c", "#24593d"], 46); },
  snegranSide: (set, r) => {
    MØNSTRE.granblade(set, r);
    const s = hex("#f4f8ff");
    for (let x = 0; x < T; x++) {
      const h = 2 + (r() < 0.5 ? 1 : 0) + (r() < 0.3 ? 2 : 0);
      for (let y = 0; y < h; y++) set(x, y, lys(s, 1 + (r() - 0.5) * 0.08));
    }
    prik(set, r, ["#ffffff", "#e6eefc"], 10);
  },
  birk: (set, r) => {
    fyld(set, r, "#ece8dc", 0.08);
    for (let i = 0; i < 9; i++) {                      // sorte streger i barken
      const y = Math.floor(r() * T), x0 = Math.floor(r() * 12), l = 2 + Math.floor(r() * 4);
      for (let x = x0; x < x0 + l; x++) set(x, y, hex(r() < 0.7 ? "#2b2b2b" : "#5a5a5a"));
    }
  },
  højtGræs: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let i = 0; i < 9; i++) {                      // strå i forskellig højde
      const x = 1 + Math.floor(r() * 14), h = 6 + Math.floor(r() * 9), c = hex(r() < 0.5 ? "#5fb33a" : "#4a9a2c");
      for (let y = T - 1; y >= T - h; y--) set(Math.min(15, x + (y < T - h / 2 && r() < 0.3 ? 1 : 0)), y, lys(c, 1 + (r() - 0.5) * 0.25));
    }
  },
  // Den uendelige verden: skinner på træsveller (to retninger), guldkisten og stenringens sokler
  skinnerNS: (set, r) => {
    MØNSTRE.planker(set, r);
    for (let y = 0; y < T; y += 4) for (let x = 0; x < T; x++) set(x, y, lys(hex("#6b4a2b"), 1 + (r() - 0.5) * 0.1));   // sveller
    for (let y = 0; y < T; y++) for (const x of [3, 4, 11, 12]) set(x, y, lys(hex(x === 3 || x === 11 ? "#c8ccd4" : "#8a9099"), 1 + (r() - 0.5) * 0.06));
  },
  skinnerØV: (set, r) => {
    MØNSTRE.planker(set, r);
    for (let x = 0; x < T; x += 4) for (let y = 0; y < T; y++) set(x, y, lys(hex("#6b4a2b"), 1 + (r() - 0.5) * 0.1));
    for (let x = 0; x < T; x++) for (const y of [3, 4, 11, 12]) set(x, y, lys(hex(y === 3 || y === 11 ? "#c8ccd4" : "#8a9099"), 1 + (r() - 0.5) * 0.06));
  },
  guldkiste: (set, r) => alle((x, y) => {
    const bånd = x <= 1 || x >= 14 || y === 5 || y === 6 || (x >= 6 && x <= 9 && y >= 7 && y <= 10);
    set(x, y, lys(hex(bånd ? "#ffd84d" : "#b8862a"), 1 + (r() - 0.5) * 0.15));
  }),
  guldkisteTop: (set, r) => alle((x, y) => set(x, y, lys(hex(x <= 1 || x >= 14 || y <= 1 || y >= 14 ? "#ffd84d" : "#c8962e"), 1 + (r() - 0.5) * 0.12))),
  sokkelTop: (set, r) => {
    MØNSTRE.borgsten(set, r);
    alle((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 5) set(x, y, lys(hex(d < 3.5 ? "#2a2440" : "#d9b24a"), 1 + (r() - 0.5) * 0.1)); });
  },
  // En lille jordbærplante: grønne blade og røde bær med gule prikker
  jordbær: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (const [x0, y0] of [[3, 9], [8, 7], [11, 10], [5, 12]]) alle((x, y) => { if ((x - x0) ** 2 + ((y - y0) * 1.4) ** 2 < 6) set(x, y, lys(hex("#3f9b35"), 1 + (r() - 0.5) * 0.3)); });
    for (const [x0, y0] of [[4, 12], [9, 11], [12, 13], [7, 14]]) {
      alle((x, y) => { if ((x - x0) ** 2 + (y - y0) ** 2 < 3.2 && y >= y0 - 1) set(x, y, lys(hex("#e8283c"), 1 + (r() - 0.5) * 0.15)); });
      set(x0, y0 - 2, hex("#2d7a26")); set(x0 - 1, y0, hex("#ffe27a")); set(x0 + 1, y0 + 1, hex("#ffe27a"));
    }
  },
  // En is i vaffel: to kugler (jordbær og vanilje) på en sprød vaffel
  isvaffel: set => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 8; y < T; y++) { const b = Math.max(0, Math.round((T - y) * 0.45)); for (let x = 8 - b; x <= 7 + b; x++) set(x, y, hex((x + y) % 3 ? "#d9a05a" : "#a8743a")); }
    alle((x, y) => { if ((x - 7.5) ** 2 + (y - 7) ** 2 < 14) set(x, y, hex(y < 5 ? "#fff6e0" : "#ffe9c8")); });
    alle((x, y) => { if ((x - 7.5) ** 2 + (y - 3.5) ** 2 < 9) set(x, y, hex(x < 7 && y < 3 ? "#ffc8dc" : "#ff8ab8")); });
    for (const [x, y] of [[6, 2], [9, 3], [7, 5], [5, 7], [10, 7]]) set(x, y, hex(["#3a9ad9", "#ffd23f", "#4cb748"][(x + y) % 3]));   // krymmel
  },
  // Butikkens blokke: glimtende guld, lysende regnbue og lyserøde hjerter
  glimmerguld: (set, r) => {
    fyld(set, r, "#ffcf3a", 0.1);
    alle((x, y) => { if (x === 0 || y === 0 || x === 15 || y === 15) set(x, y, hex("#ffe98a")); });
    for (const [cx, cy, s] of [[4, 4, 2], [11, 10, 2], [11, 3, 1], [4, 12, 1], [8, 7, 1]]) for (let i = -s; i <= s; i++) { set(cx + i, cy, hex("#ffffff")); set(cx, cy + i, hex("#ffffff")); }
  },
  regnbuelys: (set, r) => {
    const f = ["#ff4d5e", "#ffa13a", "#ffe14a", "#5fe36a", "#4ab8ff", "#8a7cff", "#e06bff"];
    alle((x, y) => set(x, y, lys(hex(f[Math.floor((x + y) / 2.3) % f.length]), 1.05 + (r() - 0.5) * 0.08)));
    prik(set, r, ["#ffffff"], 6);
  },
  hjerter: (set, r) => {
    fyld(set, r, "#ffb3d1", 0.08);
    const hjerte = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
    for (const [x0, y0, f] of [[1, 1, "#ff3b7a"], [8, 8, "#e8283c"], [9, 1, "#ff6fa8"], [1, 9, "#ff6fa8"]]) {
      hjerte.forEach((række, dy) => [...række].forEach((c, dx) => { if (c === "#" && x0 + dx < T && y0 + dy < T) set(x0 + dx, y0 + dy, hex(f)); }));
    }
  },
  tørtGræsTop: (set, r) => { fyld(set, r, "#c8a84a", 0.22); prik(set, r, ["#a88a3a", "#dcc070", "#b89a42"], 30); },
  tørtGræsSide: (set, r) => {
    MØNSTRE.jord(set, r);
    for (let x = 0; x < T; x++) {
      const h = 3 + (r() < 0.5 ? 1 : 0) + (r() < 0.15 ? 1 : 0);
      for (let y = 0; y < h; y++) set(x, y, lys(hex("#c8a84a"), 1 + (r() - 0.5) * 0.3));
    }
  },
  rødsandsten: (set, r) => {
    const bånd = ["#c8582a", "#d86a36", "#b84a24", "#e08a52"];
    alle((x, y) => set(x, y, lys(hex(bånd[((y + (x > 9 ? 1 : 0)) >> 2) % 4]), 1 + (r() - 0.5) * 0.14)));
    prik(set, r, ["#a04020", "#f0a070"], 10);
  },
  kaktus: (set, r) => alle((x, y) => {
    const f = x % 4 === 2 && y % 4 === 1 ? "#f4f0c0" : x % 4 === 0 ? "#2a7a2a" : x % 4 === 2 ? "#5ac04a" : "#3fa03a";
    set(x, y, lys(hex(f), 1 + (r() - 0.5) * 0.1));
  }),
  kaktusTop: (set, r) => alle((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);                      // en lille lyserød blomst på toppen
    set(x, y, lys(hex(d < 2 ? "#ff6fb5" : d < 2.8 ? "#ffd23f" : Math.floor(d) % 2 ? "#3fa03a" : "#5ac04a"), 1 + (r() - 0.5) * 0.1));
  }),
  tørBusk: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    const grene = [[7.5, 15, 7.5, 7], [7.5, 12, 3, 5], [7.5, 11, 12.5, 4], [5, 8, 2, 2], [10, 7, 13, 1], [7.5, 9, 6, 1], [7.5, 9, 9.5, 2]];
    for (const [x0, y0, x1, y1] of grene) for (let i = 0; i <= 10; i++) {
      set(Math.round(x0 + (x1 - x0) * i / 10), Math.round(y0 + (y1 - y0) * i / 10), lys(hex("#8a6a3a"), 1 + (r() - 0.5) * 0.35));
    }
  },
  brændtJord: (set, r) => { fyld(set, r, "#2a2624", 0.25); prik(set, r, ["#1a1818", "#3a3430", "#4a4440"], 26); prik(set, r, ["#ff8c1a", "#ffd23f"], 4); },
  brændtJordSide: (set, r) => {
    MØNSTRE.jord(set, r);
    for (let x = 0; x < T; x++) for (let y = 0; y < 2 + (r() < 0.5 ? 1 : 0); y++) set(x, y, lys(hex("#2a2624"), 1 + (r() - 0.5) * 0.3));
  },
  magma: (set, r) => {
    fyld(set, r, "#4a1a0e", 0.3);
    for (let n = 0; n < 4; n++) {                                 // glødende sprækker
      let x = Math.floor(r() * T), y = Math.floor(r() * T);
      for (let i = 0; i < 9; i++) {
        set(x, y, hex(i % 3 ? "#ff7a1a" : "#ffd23f"));
        x = (x + (r() < 0.5 ? 1 : 0)) % T; y = (y + (r() < 0.6 ? 1 : T - 1)) % T;
      }
    }
  },
  // --- Fyrværkeri: uret, kæmperaketten og dronekassen ---
  ur: (set, r) => {
    fyld(set, r, "#6a6a70", 0.1);
    alle((x, y) => {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 6.6) set(x, y, hex(d > 5.8 ? "#d8b040" : "#fffbe8"));                   // gul kant og hvid skive
    });
    for (const [x, y] of [[7, 2], [8, 2], [13, 7], [13, 8], [7, 13], [8, 13], [2, 7], [2, 8]]) set(x, y, hex("#1a1a1a"));   // 12, 3, 6 og 9
    for (let y = 3; y <= 8; y++) set(7, y, hex("#1a1a1a"));                          // viserne står næsten på 12
    for (let x = 7; x <= 10; x++) set(x, 8, hex("#1a1a1a"));
    set(8, 3, hex("#e0302a")); set(8, 4, hex("#e0302a"));
  },
  kæmperaket: (set, r) => alle((x, y) => {
    let f = (y >> 2) % 2 ? "#f4f4f0" : "#e0302a";
    if (x < 2 || x > 13) f = y % 4 === 0 ? "#b8bec6" : "#8a929c";
    if (Math.hypot(x - 7.5, y - 6.5) < 2.4) f = Math.hypot(x - 7, y - 6) < 1 ? "#ffffff" : "#5fb0ff";   // et rundt vindue
    set(x, y, lys(hex(f), 1 + (r() - 0.5) * 0.05));
  }),
  kæmperaketTop: set => alle((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, hex(d < 2.5 ? "#ffd23f" : d < 5 ? "#e0302a" : "#f4f4f0")); }),
  dronekasse: (set, r) => {
    fyld(set, r, "#2a2e3a", 0.1);
    alle((x, y) => { if (x === 0 || x === 15 || y === 0 || y === 15) set(x, y, hex("#5ff0ff")); });
    for (const [x, y, f] of [[4, 5, "#ff3b5c"], [8, 4, "#ffd23f"], [11, 6, "#4cd964"], [6, 9, "#3aa8ff"], [10, 10, "#c86bff"], [5, 12, "#ff8c1a"]]) { set(x, y, hex(f)); set(x + 1, y, hex(f)); }
  },
  dronekasseTop: (set, r) => alle((x, y) => set(x, y, lys(hex((x % 5 === 2 && y % 5 === 2) ? "#5ff0ff" : "#3a3e4a"), 1 + (r() - 0.5) * 0.08))),
  // --- Dinodalen ---
  junglestamme: (set, r) => alle((x, y) => set(x, y, lys(hex(x % 4 === 0 ? "#4a3a1e" : (x + y * 3) % 11 === 0 ? "#5a7a2a" : "#6e5230"), 1 + (r() - 0.5) * 0.18))),
  jungleTop: (set, r) => alle((x, y) => { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); set(x, y, lys(hex(d > 6.5 ? "#4a3a1e" : Math.floor(d) % 2 ? "#a88a58" : "#8a6e44"), 1 + (r() - 0.5) * 0.1)); }),
  jungleblade: (set, r) => { fyld(set, r, "#2a7a2a", 0.4); prik(set, r, ["#1a5a1e", "#3fa03a", "#5ac04a", "#185018"], 50); },
  bregne: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (const [x0, v] of [[7, -0.35], [8, 0.35], [7, 0], [8, 0.7], [7, -0.7]]) for (let i = 0; i < 12; i++) {
      const x = Math.round(x0 + Math.sin(v) * i), y = 15 - Math.round(Math.cos(v) * i);
      if (x < 0 || x > 15 || y < 0) continue;
      set(x, y, lys(hex("#3f9b35"), 1 + (r() - 0.5) * 0.15));
      if (i > 2 && i % 2 === 0) { if (x > 0) set(x - 1, y, hex("#5ac04a")); if (x < 15) set(x + 1, y, hex("#5ac04a")); }
    }
  },
  lian: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (const x0 of [3, 8, 12]) for (let y = 0; y < T; y++) {
      const x = x0 + Math.round(Math.sin(y * 0.6 + x0) * 1);
      set(x, y, lys(hex("#3a7a2a"), 1 + (r() - 0.5) * 0.2));
      if (y % 4 === 1) { set(Math.min(15, x + 1), y, hex("#5ac04a")); set(Math.max(0, x - 1), y + 1 < T ? y + 1 : y, hex("#5ac04a")); }
    }
  },
  dinoæg: (set, r) => {
    fyld(set, r, "#f4ecd0", 0.06);
    for (const [px, py, pr] of [[4, 4, 2], [11, 3, 1.5], [7, 9, 2.2], [12, 11, 1.8], [3, 12, 1.4]]) alle((x, y) => { if (Math.hypot(x - px, y - py) < pr) set(x, y, lys(hex("#5aa84a"), 1 + (r() - 0.5) * 0.1)); });
  },
  rede: (set, r) => alle((x, y) => set(x, y, lys(hex((x * 2 + y) % 5 === 0 ? "#6e4a24" : (x + y * 2) % 7 === 0 ? "#d8b870" : "#a8803e"), 1 + (r() - 0.5) * 0.2))),
  redeTop: (set, r) => alle((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, lys(hex(d < 4 ? "#6e4a24" : (x + y) % 3 ? "#a8803e" : "#d8b870"), 1 + (r() - 0.5) * 0.2)); }),
  vulkansten: (set, r) => { fyld(set, r, "#3a302c", 0.25); prik(set, r, ["#2a2220", "#4a3e38", "#8a2a1a", "#5a4a42"], 40); },
  // --- Bondegården ---
  muld: (set, r) => alle((x, y) => set(x, y, lys(hex(y % 4 === 0 ? "#3a2412" : y % 4 === 1 ? "#6e4424" : "#5a3a1e"), 1 + (r() - 0.5) * 0.18))),
  spire: set => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 10; y < T; y++) set(7, y, hex("#4cb748"));
    for (const [x, y] of [[5, 10], [4, 9], [6, 10], [9, 10], [10, 9], [11, 9], [8, 10], [5, 9], [10, 10]]) set(x, y, hex("#6ad05a"));
  },
  hvede: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (const x of [2, 5, 8, 11, 14]) {
      const top = 1 + Math.floor(r() * 3);
      for (let y = top + 4; y < T; y++) set(x, y, lys(hex("#c8a040"), 1 + (r() - 0.5) * 0.1));
      for (let y = top; y < top + 5; y++) { set(x, y, lys(hex("#f0c858"), 1 + (r() - 0.5) * 0.1)); set(x + (y % 2 ? 1 : -1), y, hex("#e0b040")); }
    }
  },
  gulerod: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (const x of [3, 7, 11]) {
      for (let y = 4; y < 13; y++) { set(x + ((y >> 1) % 2), y, lys(hex("#4cb748"), 1 + (r() - 0.5) * 0.2)); if (y % 3 === 0) { set(x - 1, y, hex("#6ad05a")); set(x + 2, y, hex("#6ad05a")); } }
      for (let y = 13; y < T; y++) for (let dx = 0; dx < 2; dx++) set(x + dx, y, hex(y === 13 ? "#ff9a3a" : "#f27a1a"));
    }
  },
  solsikke: set => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 7; y < T; y++) { set(7, y, hex("#3f9b35")); set(8, y, hex("#2d7a26")); }
    for (const [x, y] of [[5, 11], [4, 10], [10, 12], [11, 11]]) set(x, y, hex("#4cb748"));
    alle((x, y) => { const d = Math.hypot(x - 7.5, y - 4); if (d < 4.5) set(x, y, hex(d < 2.2 ? (x + y) % 2 ? "#5a3a1e" : "#7a4a24" : "#ffd23f")); });
  },
  høballe: (set, r) => alle((x, y) => set(x, y, lys(hex(x === 4 || x === 11 ? "#c83a2a" : y % 3 === 0 ? "#c8a040" : "#e8c860"), 1 + (r() - 0.5) * 0.14))),
  høballeTop: (set, r) => alle((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, lys(hex(Math.floor(d) % 2 ? "#e8c860" : "#c8a040"), 1 + (r() - 0.5) * 0.12)); }),
  hegn: (set, r) => alle((x, y) => {
    const stolpe = (x >= 1 && x <= 3) || (x >= 12 && x <= 14), lægte = (y >= 3 && y <= 5) || (y >= 9 && y <= 11);
    if (stolpe || lægte) set(x, y, lys(hex(stolpe ? "#8a6232" : "#b8894f"), 1 + (r() - 0.5) * 0.14)); else set(x, y, [0, 0, 0], 0);
  }),
  ladetræ: (set, r) => alle((x, y) => set(x, y, lys(hex(x % 4 === 3 ? "#7a1a14" : "#b8322a"), (y % 7 === 0 ? 0.9 : 1) * (1 + (r() - 0.5) * 0.14)))),
  // --- Skyøerne ---
  sky: (set, r) => alle((x, y) => {
    const b = Math.sin(x * 0.8) + Math.cos(y * 0.9) + Math.sin((x + y) * 0.5);
    set(x, y, lys(hex(b > 1.2 ? "#ffffff" : b > -0.5 ? "#f4f8ff" : "#dfe8f6"), 1 + (r() - 0.5) * 0.03));
  }),
  trampolinTop: (set, r) => alle((x, y) => {
    const kant = x <= 1 || y <= 1 || x >= 14 || y >= 14, midt = Math.hypot(x - 7.5, y - 7.5) < 2.5;
    set(x, y, lys(hex(kant ? "#e8283c" : midt ? "#5fb0ff" : "#2a6fe0"), 1 + (r() - 0.5) * 0.06));
  }),
  trampolinSide: (set, r) => alle((x, y) => {
    const fjeder = y >= 4 && y <= 11 && x % 4 === 1, ben = y >= 12 && (x <= 1 || x >= 14);
    set(x, y, y < 4 ? lys(hex("#e8283c"), 1 + (r() - 0.5) * 0.06) : fjeder ? hex("#c8c8d0") : ben ? hex("#5a5a62") : [0, 0, 0], y < 4 || fjeder || ben ? 255 : 0);
  }),
  himmelsten: (set, r) => { fyld(set, r, "#a8b8d0", 0.16); prik(set, r, ["#8a9ab8", "#c8d4e6", "#9aaccc"], 36); },
  // --- Slikland ---
  glasurTop: (set, r) => {
    fyld(set, r, "#ff9ad0", 0.08);
    const drys = ["#ffffff", "#ffe066", "#5fd3ff", "#8aff7a", "#c86bff", "#ff5f5f"];
    for (let i = 0; i < 18; i++) { const x = Math.floor(r() * 15), y = Math.floor(r() * 15), c = hex(drys[i % drys.length]); set(x, y, c); if (r() < 0.5) set(x + 1, y, c); else set(x, y + 1, c); }
  },
  glasurSide: (set, r) => {
    MØNSTRE.kagebund(set, r);
    for (let x = 0; x < T; x++) {
      const h = 3 + Math.round(Math.sin(x * 0.9) * 1.2 + 1) + (x % 5 === 2 ? 3 : 0);          // glasur, der drypper ned
      for (let y = 0; y < h; y++) set(x, y, lys(hex("#ff9ad0"), 1 + (r() - 0.5) * 0.08));
    }
  },
  kagebund: (set, r) => { fyld(set, r, "#f2d08a", 0.12); prik(set, r, ["#e0b868", "#fff0c0", "#d8a858"], 34); },
  chokolade: (set, r) => alle((x, y) => {
    const fuge = x % 8 === 0 || y % 8 === 0, glans = x % 8 === 1 || y % 8 === 1;
    set(x, y, lys(hex(fuge ? "#3a200e" : glans ? "#8a5a32" : "#6a3f1e"), 1 + (r() - 0.5) * 0.08));
  }),
  slikstok: (set, r) => alle((x, y) => set(x, y, lys(hex(((x + y) >> 2) % 2 ? "#ffffff" : "#e8283c"), 1 + (r() - 0.5) * 0.05))),
  slikkepind: set => {
    const F = ["#ff3b5c", "#ffd23f", "#4cd964", "#3aa8ff", "#c86bff", "#ff8c1a"];
    alle((x, y) => { const v = Math.atan2(y - 7.5, x - 7.5), d = Math.hypot(x - 7.5, y - 7.5); set(x, y, hex(F[Math.floor(((v / (Math.PI * 2) + 1) * 6 + d * 0.55)) % 6])); });
  },
  skumfidus: (set, r) => alle((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    set(x, y, lys(hex(d > 6.5 ? "#f0c8dc" : d > 5 ? "#ffe0ee" : "#fff6fa"), 1 + (r() - 0.5) * 0.04));
  }),
  honningkage: (set, r) => {
    fyld(set, r, "#a8642a", 0.14); prik(set, r, ["#8a4e1e", "#c07a3a"], 20);
    alle((x, y) => { if ((y === 2 || y === 13) && x % 3 !== 1) set(x, y, hex("#ffffff")); if ((x === 2 || x === 13) && y > 2 && y < 13 && y % 3 === 0) set(x, y, hex("#ffffff")); });
  },
  vingummi: (set, r) => alle((x, y) => {
    const glans = (x - y === 3 || x - y === 4) && x < 10, kant = x === 0 || y === 0 || x === 15 || y === 15;
    set(x, y, lys(hex(glans ? "#b8ffb0" : kant ? "#1f9a3a" : "#3fd35a"), 1 + (r() - 0.5) * 0.06));
  }),
  slikblomst: set => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 7; y < T; y++) set(7, y, hex("#ffffff")), set(8, y, hex("#e8e8e8"));
    const F = ["#ff3b5c", "#ffffff"];
    alle((x, y) => { const d = Math.hypot(x - 7.5, y - 4); if (d < 4) set(x, y, hex(F[Math.floor(Math.atan2(y - 4, x - 7.5) * 1.3 + d) & 1])); });
  },
  chokoladeflod: (set, r) => {
    fyld(set, r, "#6a3a18", 0.08);
    for (let y = 1; y < T; y += 4) {
      const x0 = (y * 5 + Math.floor(r() * 4)) % T;
      for (let i = 0; i < 5; i++) set((x0 + i) % T, y, lys(hex("#9a6034"), 1 + (r() - 0.5) * 0.08));
      set((x0 + 5) % T, (y + 1) % T, hex("#80481e"));
    }
    prik(set, r, ["#b87a48"], 5);
  },
  // --- Havbunden ---
  koralblok: (set, r) => { fyld(set, r, "#f06a9a", 0.18); prik(set, r, ["#ff9ac0", "#c84a7a", "#ffd0e0"], 40); },
  tang: (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 0; y < T; y++) {
      const m = 7.5 + Math.sin(y * 0.7) * 2;
      for (let x = Math.floor(m - 1.5); x <= Math.ceil(m + 1.5); x++) set(x, y, lys(hex(x === Math.round(m) ? "#3a8a3a" : "#4cb04a"), 1 + (r() - 0.5) * 0.15));
      if (y % 5 === 2) { set(Math.round(m) + 3, y, hex("#5fc05a")); set(Math.round(m) - 3, y + 1 < T ? y + 1 : y, hex("#5fc05a")); }
    }
  },
  havlygte: (set, r) => alle((x, y) => {
    const kant = x === 0 || y === 0 || x === 15 || y === 15, kors = (x >= 6 && x <= 9) || (y >= 6 && y <= 9);
    set(x, y, lys(hex(kant ? "#6ab0a8" : kors ? "#f0fffc" : "#bdf0e6"), 1 + (r() - 0.5) * 0.06));
  }),
  prismarin: (set, r) => { fyld(set, r, "#4aa89a", 0.22); prik(set, r, ["#2f7a70", "#6ac8b8", "#3a9088", "#8ad8c8"], 44); },
  // --- Piratøen ---
  palmestamme: (set, r) => alle((x, y) => set(x, y, lys(hex(y % 5 === 4 ? "#8a6a3a" : x % 5 === 0 ? "#b89060" : "#c8a070"), 1 + (r() - 0.5) * 0.14))),
  palmeTop: (set, r) => alle((x, y) => { const d = Math.hypot(x - 7.5, y - 7.5); set(x, y, lys(hex(d > 6.5 ? "#8a6a3a" : Math.floor(d) % 2 ? "#d8b888" : "#c8a070"), 1 + (r() - 0.5) * 0.1)); }),
  palmeblade: (set, r) => alle((x, y) => {
    const ribbe = (x + y) % 8 === 0 || (x - y + 16) % 8 === 0;
    set(x, y, lys(hex(ribbe ? "#2f8a2a" : (x * 3 + y) % 5 === 0 ? "#6ad04a" : "#4cb43a"), 1 + (r() - 0.5) * 0.2));
  }),
  skibsplanker: (set, r) => alle((x, y) => set(x, y, lys(hex(y % 4 === 3 ? "#3a2210" : x === (Math.floor(y / 4) % 2 ? 5 : 12) ? "#44280f" : "#5e3a1c"), 1 + (r() - 0.5) * 0.16))),
  kisteSide: (set, r) => alle((x, y) => {
    const bånd = x <= 1 || x >= 14 || y === 5 || y === 6, lås = x >= 6 && x <= 9 && y >= 4 && y <= 8;
    set(x, y, lys(hex(lås ? (x === 7 || x === 8) && y === 7 ? "#3a2a10" : "#ffd23f" : bånd ? "#d9a520" : y < 5 ? "#8a5a2b" : "#6e4520"), 1 + (r() - 0.5) * 0.12));
  }),
  kisteTop: (set, r) => alle((x, y) => set(x, y, lys(hex(x <= 1 || x >= 14 || y <= 1 || y >= 14 ? "#d9a520" : "#8a5a2b"), 1 + (r() - 0.5) * 0.12))),
  skattekryds: (set, r) => {
    MØNSTRE.sand(set, r);
    alle((x, y) => { if (x > 1 && x < 14 && (Math.abs(x - y) <= 1 || Math.abs(x + y - 15) <= 1)) set(x, y, lys(hex("#d9232e"), 1 + (r() - 0.5) * 0.1)); });
  },
  sejl: (set, r) => alle((x, y) => set(x, y, lys(hex(x % 8 === 0 ? "#d8cfb8" : y % 8 === 0 ? "#e2d9c2" : "#f4ecd8"), 1 + (r() - 0.5) * 0.06))),
  piratflag: set => alle((x, y) => {
    const kranie = Math.hypot(x - 7.5, y - 6) < 3.6 && y < 9, øje = (Math.hypot(x - 6, y - 6) < 1.1 || Math.hypot(x - 9, y - 6) < 1.1);
    const kæbe = y >= 8 && y <= 9 && x >= 6 && x <= 9, knogle = (Math.abs(x - y) <= 0.5 || Math.abs(x + y - 15) <= 0.5) && y >= 10 && y <= 15 && x >= 2 && x <= 13;
    set(x, y, hex(øje ? "#1a1a1a" : kranie || kæbe || knogle ? "#f2f2f2" : "#1a1a1a"));
  }),
  kanonSide: (set, r) => alle((x, y) => {
    const løb = y >= 3 && y <= 9, glans = y === 4 && x > 1, vogn = y >= 11;
    set(x, y, lys(hex(vogn ? (y === 11 ? "#3a2210" : "#6e4520") : løb ? (glans ? "#6a6a72" : x === 15 && y >= 5 && y <= 7 ? "#0a0a0c" : "#2a2a30") : "#6e4520"), 1 + (r() - 0.5) * 0.1));
  }),
  kanonTop: (set, r) => alle((x, y) => { const løb = x >= 4 && x <= 11; set(x, y, lys(hex(løb ? (x === 5 ? "#5a5a62" : "#2a2a30") : "#6e4520"), 1 + (r() - 0.5) * 0.1)); }),
  garageport: (set, r) => alle((x, y) => {
    const kant = x === 0 || x === 15, fuge = y % 3 === 2;
    set(x, y, lys(hex(kant ? "#6a1a10" : fuge ? "#9a2a1c" : "#d83a2a"), 1 + (r() - 0.5) * 0.08));
  }),
};

// Portalens lilla hvirvler. fase 0–2π flytter mønstret blødt, og det går i ét fra blok til blok.
const PORTALFARVER = ["#2a0660", "#4a12a0", "#7128d0", "#9c52ff", "#caa0ff"].map(hex);
function portalRamme(set, fase, r) {
  const k = Math.PI * 2 / T;
  alle((x, y) => {
    const u = x * k, v = y * k;
    const s = Math.sin(u + v + fase) + Math.sin(2 * u - v - fase) * 0.7 + Math.sin(u - 2 * v + 2 * fase) * 0.5 + Math.cos(u + 3 * v - fase) * 0.3;
    const t = Math.max(0, Math.min(0.999, (s + 2.3) / 4.6));
    set(x, y, PORTALFARVER[Math.floor(t * PORTALFARVER.length)], 185 + Math.round(t * 65));
  });
  for (let i = 0; i < 4; i++) set(Math.floor(r() * T), Math.floor(r() * T), hex("#f4e4ff"), 255);   // små stjerneglimt
}

// Strålingstegnet: en prik i midten og tre vinger (s = størrelse, 1 = hele blokken)
function strålingstegn(set, cx, cy, s, farve) {
  alle((x, y) => {
    const dx = (x + 0.5 - cx) / s, dy = (y + 0.5 - cy) / s, r = Math.hypot(dx, dy);
    const v = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
    const vinge = r > 2.3 && r < 6.4 && [90, 210, 330].some(m => Math.abs(((v - m + 540) % 360) - 180) < 30);
    if (r < 1.5 || vinge) set(x, y, hex(farve));
  });
}

// Én flamme-tegning (16×16). Hver ramme får sin egen tilfældighed, så ilden blafrer.
function ildRamme(set, r) {
  alle((x, y) => set(x, y, [0, 0, 0], 0));
  for (let x = 1; x < T - 1; x++) {
    const h = Math.max(2, Math.round(12.5 - Math.abs(x - 7.5) * 1.25 + (r() - 0.5) * 5));
    for (let i = 0; i < h; i++) {
      const t = i / h, midt = Math.abs(x - 7.5) < 3.5;
      const c = t < 0.4 ? (midt ? "#fff3a0" : "#ffd23f") : t < 0.75 ? "#ff9a1f" : "#ff4d2e";
      set(x, T - 1 - i, lys(hex(c), 1 + (r() - 0.5) * 0.1));
    }
  }
  for (let i = 0; i < 3; i++) set(2 + Math.floor(r() * 12), Math.floor(r() * 4), hex("#ffb02e"));   // gnister
}

function maler(navn) {
  const [type, farve] = navn.split(":");
  if (type === "uld") return (set, r) => {
    const c = hex(farve);
    alle((x, y) => set(x, y, lys(c, ((x + y) % 4 === 0 ? 0.9 : 1) * (1 + (r() - 0.5) * 0.1))));
  };
  if (type === "blomst") return (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 7; y < T; y++) { set(7, y, hex("#3f9b35")); set(8, y, hex("#2d7a26")); }
    for (const [x, y] of [[6, 11], [5, 12], [9, 12], [10, 11]]) set(x, y, hex("#3f9b35"));
    alle((x, y) => { if ((x - 7.5) ** 2 + (y - 4.5) ** 2 < 11) set(x, y, lys(hex(farve), 1 + (r() - 0.5) * 0.25)); });
    for (const [x, y] of [[7, 4], [8, 4], [7, 5], [8, 5]]) set(x, y, hex("#fff3a0"));
  };
  if (type === "koral") return (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    const c = hex(farve), grene = [[7.5, 15, 7.5, 5], [7.5, 11, 3.5, 3], [7.5, 10, 12, 2], [5, 7, 2.5, 1], [10.5, 6, 13, 1.5]];
    for (const [x0, y0, x1, y1] of grene) for (let i = 0; i <= 12; i++) {
      const x = Math.round(x0 + (x1 - x0) * i / 12), y = Math.round(y0 + (y1 - y0) * i / 12);
      set(x, y, lys(c, 1 + (r() - 0.5) * 0.2)); set(x + 1, y, lys(c, 0.85));
    }
    for (const [x, y] of [[7, 5], [3, 3], [12, 2], [2, 1], [13, 1]]) { set(x, y, lys(c, 1.25)); set(x + 1, y - 1 < 0 ? 0 : y - 1, lys(c, 1.2)); }
  };
  if (type === "løv") return (set, r) => {           // blade i alle farver (efterår og kirsebær)
    const c = hex(farve);
    alle((x, y) => set(x, y, lys(c, 1 + (r() - 0.5) * 0.4)));
    for (let i = 0; i < 44; i++) set(Math.floor(r() * T), Math.floor(r() * T), lys(c, i % 3 ? 0.72 : 1.18));
  };
  if (type === "puds") return (set, r) => {
    fyld(set, r, farve, 0.1);
    prik(set, r, [lys(hex(farve), 0.9), lys(hex(farve), 1.06)].map(c => "#" + c.map(v => v.toString(16).padStart(2, "0")).join("")), 26);
  };
  if (type === "prikker") return (set, r) => {
    const prikFarve = navn.split(":")[2];
    fyld(set, r, farve, 0.12);
    const prikker = [[3, 3], [10, 2], [6, 8], [13, 9], [2, 12], [9, 13]];
    alle((x, y) => { for (const [px, py] of prikker) if ((x - px) ** 2 + (y - py) ** 2 < 2.6) set(x, y, lys(hex(prikFarve), 1 + (r() - 0.5) * 0.08)); });
  };
  if (type === "lilleSvamp") return (set, r) => {
    alle((x, y) => set(x, y, [0, 0, 0], 0));
    for (let y = 9; y < T; y++) { set(7, y, hex("#efe6d2")); set(8, y, hex("#d9cdb0")); }
    alle((x, y) => { if (y <= 9 && (x - 7.5) ** 2 / 30 + (y - 9.5) ** 2 / 26 < 1) set(x, y, lys(hex(farve), 1 + (r() - 0.5) * 0.15)); });
    for (const [x, y] of [[5, 6], [9, 5], [11, 8], [7, 7]]) set(x, y, hex("#ffffff"));
  };
  return MØNSTRE[type] || MØNSTRE.jord;
}

// ---------- Tekstur-atlas, ikoner og små blok-modeller ----------
const lin = l => Math.pow(l, 2.2);                 // lysstyrke → lineær farve (så skyggerne ser rigtige ud)

export function lavAtlas() {
  const navne = [];
  const brug = n => { if (!navne.includes(n)) navne.push(n); return navne.indexOf(n); };
  const tab = BLOKKE.map(b => {
    if (!b) return null;
    const t = typeof b.tekstur === "string" ? { top: b.tekstur, side: b.tekstur, bund: b.tekstur } : b.tekstur;
    return { top: brug(t.top), side: brug(t.side), bund: brug(t.bund) };
  });
  const KOL = 8, W = KOL * T, H = Math.ceil(navne.length / KOL) * T;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g2 = c.getContext("2d"), img = g2.createImageData(W, H);
  navne.forEach((n, i) => {
    const ox = (i % KOL) * T, oy = Math.floor(i / KOL) * T;
    maler(n)((x, y, col, a = 255) => {
      const k = ((oy + y) * W + ox + x) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = a;
    }, rng(navnFrø(n)));
  });
  g2.putImageData(img, 0, 0);

  const tekstur = new THREE.CanvasTexture(c);
  tekstur.magFilter = tekstur.minFilter = THREE.NearestFilter;
  tekstur.generateMipmaps = false;
  tekstur.colorSpace = THREE.SRGBColorSpace;

  const e = 0.0005, felt = i => [(i % KOL) * T, Math.floor(i / KOL) * T];
  const uvAf = i => { const [ox, oy] = felt(i); return [ox / W + e, 1 - (oy + T) / H + e, (ox + T) / W - e, 1 - oy / H - e]; };
  const uvTab = tab.map(t => t && { top: uvAf(t.top), side: uvAf(t.side), bund: uvAf(t.bund) });

  // gennemsnitsfarve pr. blok (til småstykker når en blok går i stykker)
  const farver = tab.map(t => {
    if (!t) return null;
    const [ox, oy] = felt(t.side);
    let r = 0, g = 0, b = 0, n = 0;
    alle((x, y) => { const k = ((oy + y) * W + ox + x) * 4; if (img.data[k + 3] > 128) { r += img.data[k]; g += img.data[k + 1]; b += img.data[k + 2]; n++; } });
    return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
  });

  // Ikon til hotbaren: en lille skrå terning tegnet med de rigtige pixels
  const ikoner = {};
  function ikon(id) {
    if (ikoner[id]) return ikoner[id];
    const k = document.createElement("canvas"); k.width = k.height = 64;
    const g = k.getContext("2d");
    g.imageSmoothingEnabled = false;
    const t = tab[id];
    if (BLOKKE[id].kryds) {
      const [sx, sy] = felt(t.side);
      g.drawImage(c, sx, sy, T, T, 8, 8, 48, 48);
    } else {
      const flade = (i, a, b, cc, d, ee, f, skygge) => {
        const [sx, sy] = felt(i);
        g.setTransform(a, b, cc, d, ee, f);
        g.drawImage(c, sx, sy, T, T, 0, 0, T, T);
        if (skygge) { g.fillStyle = `rgba(0,0,0,${skygge})`; g.fillRect(0, 0, T, T); }
      };
      flade(t.top, 26 / T, 13 / T, -26 / T, 13 / T, 32, 6, 0);
      flade(t.side, 26 / T, 13 / T, 0, 29 / T, 6, 19, BLOKKE[id].lyser ? 0 : 0.2);
      flade(t.side, 26 / T, -13 / T, 0, 29 / T, 32, 32, BLOKKE[id].lyser ? 0 : 0.38);
    }
    return (ikoner[id] = k.toDataURL());
  }

  // En lille 3D-terning af en blok (til hånden)
  function blokMesh(id) {
    const b = BLOKKE[id];
    if (b.kryds) {
      const geo = new THREE.PlaneGeometry(1, 1), uv = geo.attributes.uv, [u0, v0, u1, v1] = uvTab[id].side;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tekstur, alphaTest: 0.5, side: THREE.DoubleSide }));
    }
    const geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.attributes.uv, lysF = [0.8, 0.8, 1, 0.55, 0.9, 0.7];
    const sider = ["side", "side", "top", "bund", "side", "side"], col = [];
    for (let f = 0; f < 6; f++) {
      const [u0, v0, u1, v1] = uvTab[id][sider[f]];
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k, l = lin(b.lyser ? 1 : lysF[f]);
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
        col.push(l, l, l);
      }
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tekstur, vertexColors: true, alphaTest: 0.5 }));
  }

  // Et felt fra atlasset som billede (bruges til baggrunde)
  function feltBillede(navn) {
    const i = navne.indexOf(navn), [sx, sy] = felt(Math.max(0, i));
    const k = document.createElement("canvas"); k.width = k.height = T;
    k.getContext("2d").drawImage(c, sx, sy, T, T, 0, 0, T, T);
    return k.toDataURL();
  }

  // Levende teksturer til vand, lava og ild: de gentages hen over fladerne og flyttes lidt hvert billede
  function flise(h, tegn) {
    const k = document.createElement("canvas"); k.width = T; k.height = h;
    const g = k.getContext("2d"), bil = g.createImageData(T, h);
    tegn((x, y, col, a = 255) => { const i = (y * T + x) * 4; bil.data.set([col[0], col[1], col[2], a], i); });
    g.putImageData(bil, 0, 0);
    const t = new THREE.CanvasTexture(k);
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const RAMMER = 4, PORTALRAMMER = 8;
  const anim = {
    vand: flise(T, set => MØNSTRE.vand(set, rng(navnFrø("vand")))),
    chokolade: flise(T, set => MØNSTRE.chokoladeflod(set, rng(navnFrø("chokoladeflod")))),
    lava: flise(T, set => MØNSTRE.lava(set, rng(navnFrø("lava")))),
    ild: flise(T * RAMMER, set => { for (let f = 0; f < RAMMER; f++) ildRamme((x, y, c, a) => set(x, y + f * T, c, a), rng(navnFrø("ild") + f)); }),
    portal: flise(T * PORTALRAMMER, set => { for (let f = 0; f < PORTALRAMMER; f++) portalRamme((x, y, c, a) => set(x, y + f * T, c, a), f / PORTALRAMMER * Math.PI * 2, rng(navnFrø("portal") + f)); }),
    rammer: RAMMER, portalRammer: PORTALRAMMER,
  };
  anim.ild.repeat.set(1, 1 / RAMMER);
  anim.portal.repeat.set(1, 1 / PORTALRAMMER);

  return { tekstur, uv: (id, side) => uvTab[id][side], farve: id => farver[id], ikon, blokMesh, feltBillede, lin, anim };
}
