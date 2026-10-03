#!/bin/sh
# Køres på Linux i CI med den færdige pakke og en isoleret hjemmemappe.
set -eu
case "$(uname -m)" in
  x86_64) platform=Linux-x64 ;;
  aarch64|arm64) platform=Linux-ARM64 ;;
  *) echo 'Testen kræver x64 eller ARM64 Linux.' >&2; exit 1 ;;
esac
testmappe=$(mktemp -d)
serverpid=''
ryd() {
  if [ -n "$serverpid" ]; then kill -TERM "$serverpid" 2>/dev/null || :; wait "$serverpid" || :; fi
  rm -rf -- "$testmappe"
}
trap ryd EXIT
trap 'exit 1' HUP INT TERM
mkdir -p "$testmappe/pakke" "$testmappe/hjem"
tar -xzf "server/dist/BroekraftServer-$platform.tar.gz" -C "$testmappe/pakke"
# Afvis 32-bit styresystem og manglende glibc, før et eksisterende program ændres.
mkdir -p "$testmappe/kommandoer" "$testmappe/hjem/.local/bin"
printf 'gammelt program' > "$testmappe/hjem/.local/bin/broekraft-server"
cat > "$testmappe/kommandoer/getconf" <<'SLUT'
#!/bin/sh
printf '32\n'
SLUT
chmod +x "$testmappe/kommandoer/getconf"
if env HOME="$testmappe/hjem" PATH="$testmappe/kommandoer:$PATH" sh "$testmappe/pakke/installer.sh" > "$testmappe/afvist.log" 2>&1; then
  echo 'Installationen skulle have afvist et 32-bit styresystem.' >&2; exit 1
fi
test "$(cat "$testmappe/hjem/.local/bin/broekraft-server")" = 'gammelt program'
cat > "$testmappe/kommandoer/getconf" <<'SLUT'
#!/bin/sh
if [ "$1" = LONG_BIT ]; then printf '64\n'; else exit 1; fi
SLUT
if env HOME="$testmappe/hjem" PATH="$testmappe/kommandoer:$PATH" sh "$testmappe/pakke/installer.sh" > "$testmappe/afvist.log" 2>&1; then
  echo 'Installationen skulle have afvist et styresystem uden glibc.' >&2; exit 1
fi
test "$(cat "$testmappe/hjem/.local/bin/broekraft-server")" = 'gammelt program'
env HOME="$testmappe/hjem" sh "$testmappe/pakke/installer.sh"
test -x "$testmappe/hjem/.local/bin/broekraft-server"
# Installer igen; opdatering skal bevare øvrige brugerfiler.
mkdir -p "$testmappe/hjem/.local/share/BroekraftServer"
printf 'bevar' > "$testmappe/hjem/.local/share/BroekraftServer/markør"
env HOME="$testmappe/hjem" sh "$testmappe/pakke/installer.sh"
test "$(cat "$testmappe/hjem/.local/share/BroekraftServer/markør")" = bevar
env HOME="$testmappe/hjem" "$testmappe/hjem/.local/bin/broekraft-server" --ingen-browser > "$testmappe/server.log" 2>&1 &
serverpid=$!
klar=false
for forsoeg in $(seq 1 30); do
  if curl --fail --silent --max-time 2 http://127.0.0.1:8080/api/status > "$testmappe/status.json"; then klar=true; break; fi
  sleep 1
done
if [ "$klar" != true ]; then cat "$testmappe/server.log"; exit 1; fi
curl --fail --silent --max-time 5 http://127.0.0.1:8080/certifikat/broekraft.crt > "$testmappe/rod.der"
openssl x509 -inform DER -in "$testmappe/rod.der" -out "$testmappe/rod.pem"
curl --fail --silent --max-time 5 --cacert "$testmappe/rod.pem" https://127.0.0.1:8443/spil/broekraft/net.js > /dev/null
deno run --allow-net --allow-read=spil server/tests/pakke-test.js http://127.0.0.1:8080
kill -TERM "$serverpid"
wait "$serverpid"
serverpid=''
echo "$platform: arkitekturkontrol, installation, opdatering, HTTP, gyldigt HTTPS og normal afslutning bestået."
