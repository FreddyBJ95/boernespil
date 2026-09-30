// Medtag kun offentlige spilfiler og panelet, aldrig .git eller gemte verdener.
const mål = [
  ["x86_64-pc-windows-msvc", "Windows", ".exe"],
  ["x86_64-apple-darwin", "Mac-Intel", ""],
  ["aarch64-apple-darwin", "Mac-AppleSilicon", ""],
  ["x86_64-unknown-linux-gnu", "Linux-x64", ""],
  ["aarch64-unknown-linux-gnu", "Linux-ARM64", ""],
];
if (Deno.args.some(navn => !mål.some(m => m[1] === navn))) throw new Error("Ukendt platform. Vælg " + mål.map(m => m[1]).join(", "));
const filer = ["../spil", "../tilslut", "../index.html", "../style.css", "../effekter.js", "../manifest.json", "../sw.js", "../icon-192.png", "../icon-512.png", "kontrol", "sammen", "vendor", "test-klient.html", "test-klient.js", "generator-worker.js"];
for (const [target, navn, endelse] of mål) {
  if (Deno.args.length && !Deno.args.includes(navn)) continue;
  await Deno.mkdir(`dist/${navn}`, { recursive: true });
  const args = ["compile", "--no-check", "--target", target, "--output", `dist/${navn}/BroekraftServer${endelse}`,
    "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-sys=networkInterfaces", "--allow-run",
    ...filer.flatMap(fil => ["--include", fil]), "main.js"];
  const status = await new Deno.Command(Deno.execPath(), { args, stdout: "inherit", stderr: "inherit" }).output();
  if (!status.success) throw new Error(`Bygning til ${navn} mislykkedes`);
  await Deno.copyFile("LÆSMIG.md", `dist/${navn}/LÆSMIG.md`);
  if (navn.startsWith("Linux-")) {
    await Deno.copyFile("linux/installer.sh", `dist/${navn}/installer.sh`);
    await Deno.writeTextFile(`dist/${navn}/arkitektur.txt`, target.split("-")[0] + "\n");
    if (Deno.build.os !== "windows") {
      await Deno.chmod(`dist/${navn}/BroekraftServer`, 0o755);
      await Deno.chmod(`dist/${navn}/installer.sh`, 0o755);
    }
  }
}
