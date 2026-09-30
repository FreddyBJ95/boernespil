#!/bin/sh
# Køres på Linux i CI med den færdige pakke og en isoleret hjemmemappe.
set -eu
testmappe=$(mktemp -d)
serverpid=''
ryd() {
  if [ -n "$serverpid" ]; then kill -TERM "$serverpid" 2>/dev/null || :; wait "$serverpid" || :; fi
  rm -rf -- "$testmappe"
}
trap ryd EXIT
trap 'exit 1' HUP INT TERM
mkdir -p "$testmappe/pakke" "$testmappe/hjem"
tar -xzf server/dist/BroekraftServer-Linux-x64.tar.gz -C "$testmappe/pakke"
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
for forsøg in $(seq 1 30); do
  if curl --fail --silent --max-time 2 http://127.0.0.1:8080/api/status > "$testmappe/status.json"; then klar=true; break; fi
  sleep 1
done
if [ "$klar" != true ]; then cat "$testmappe/server.log"; exit 1; fi
curl --fail --silent --max-time 5 http://127.0.0.1:8080/certifikat/broekraft.crt > "$testmappe/rod.der"
openssl x509 -inform DER -in "$testmappe/rod.der" -out "$testmappe/rod.pem"
curl --fail --silent --max-time 5 --cacert "$testmappe/rod.pem" https://127.0.0.1:8443/spil/broekraft/net.js > /dev/null
kill -TERM "$serverpid"
wait "$serverpid"
serverpid=''
echo 'Linux: installation, opdatering, HTTP, gyldigt HTTPS og normal afslutning bestået.'
