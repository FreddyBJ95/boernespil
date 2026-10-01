import { VERDENER } from "../../spil/broekraft/verdener.js";

// Hemmelige verdener kan kun besøges gennem spillets egen historie.
export const verdensvalg = (liste = VERDENER) => liste.filter(v => !v.skjult);

// Den uendelige verden har samme størrelse, uanset den sidste valgte endelige størrelse.
export const udenKanter = verden => verden?.uendelig === true || (verden?.uendelig === undefined && verden?.type === "uendelig");
export const størrelsestekst = verden => udenKanter(verden) ? "uden kanter" : `${verden.bredde} × ${verden.dybde}`;
