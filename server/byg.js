// Medtag kun offentlige spilfiler og panelet, aldrig .git eller gemte verdener.
const mål = [
  ["x86_64-pc-windows-msvc", "Windows", ".exe"],
  ["x86_64-apple-darwin", "Mac-Intel", ""],
  ["aarch64-apple-darwin", "Mac-AppleSilicon", ""],
];
const filer = ["../spil", "../tilslut", "../index.html", "../style.css", "../effekter.js", "../manifest.json", "../sw.js", "../icon-192.png", "../icon-512.png", "kontrol", "sammen", "vendor", "test-klient.html", "test-klient.js", "generator-worker.js"];
for (const [target, navn, endelse] of mål) {
  await Deno.mkdir(`dist/${navn}`, { recursive: true });
  const args = ["compile", "--no-check", "--target", target, "--output", `dist/${navn}/BroekraftServer${endelse}`,
    "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-sys=networkInterfaces", "--allow-run",
    ...filer.flatMap(fil => ["--include", fil]), "main.js"];
  const status = await new Deno.Command(Deno.execPath(), { args, stdout: "inherit", stderr: "inherit" }).output();
  if (!status.success) throw new Error(`Bygning til ${navn} mislykkedes`);
  await Deno.copyFile("LÆSMIG.md", `dist/${navn}/LÆSMIG.md`);
}
