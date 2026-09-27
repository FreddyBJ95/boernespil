import { join } from "node:path";

// Læs kun profiler og IPv4-adresser. Ingen navne, firewall-ændringer eller administratorprompt.
const KOMMANDO = `$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); @(
  Get-NetConnectionProfile | ForEach-Object {
    $ipListe = @(Get-NetIPAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress)
    [pscustomobject]@{ profil=$_.NetworkCategory.ToString(); adresser=$ipListe }
  }
) | ConvertTo-Json -Compress -Depth 4`;

async function læsWindows() {
  const program = join(Deno.env.get("SystemRoot") || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const barn = new Deno.Command(program, { args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", KOMMANDO], stdin: "null", stdout: "piped", stderr: "null", windowsRawArguments: false }).spawn();
  const timer = setTimeout(() => { try { barn.kill(); } catch { /* Processen kan netop være afsluttet. */ } }, 5000);
  try {
    const svar = await barn.output();
    if (!svar.success || svar.stdout.length > 65536) throw new Error("Netværkstjek mislykkedes");
    return new TextDecoder().decode(svar.stdout).replace(/^\uFEFF/, "");
  } finally { clearTimeout(timer); }
}

// Kun netkort med adresser, serveren faktisk lytter på, er relevante.
export function læsProfiler(tekst, adresser) {
  const rå = JSON.parse(tekst), liste = Array.isArray(rå) ? rå : [rå];
  return liste.flatMap(p => {
    if (!p || !Array.isArray(p.adresser)) throw new Error("Ugyldigt netværkssvar");
    const ips = p.adresser.filter(ip => adresser.includes(ip));
    return ips.length ? [{ adresser: ips, profil: ["Public", "Private", "DomainAuthenticated"].includes(p.profil) ? p.profil : "Unknown" }] : [];
  });
}

// Status gemmes et minut; samtidige browserpolls deler ét tjek, også ved fejl.
export class Netværkstjek {
  constructor({ platform = Deno.build.os, kør = læsWindows, nu = Date.now } = {}) {
    Object.assign(this, { platform, kør, nu }); this.udløb = 0;
  }
  async hent(adresser) {
    if (this.platform !== "windows") return { status: "ikke-windows", profiler: [] };
    if (this.arbejde) return await this.arbejde;
    if (this.svar && this.nu() < this.udløb) return this.svar;
    this.arbejde = (async () => {
      try {
        const profiler = læsProfiler(await this.kør(), adresser);
        this.svar = { status: profiler.length && profiler.every(p => p.profil !== "Unknown") ? "klar" : "ukendt", profiler };
      } catch { this.svar = { status: "ukendt", profiler: [] }; }
      this.udløb = this.nu() + 60000;
      return this.svar;
    })();
    try { return await this.arbejde; } finally { this.arbejde = null; }
  }
}
