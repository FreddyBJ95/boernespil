#!/bin/sh
# Installer kun programmet; verdener og certifikater ligger i en separat datamappe.
set -eu
if [ "$(uname -s)" != Linux ]; then
  echo 'Denne pakke er til Linux.' >&2; exit 1
fi
case "$(uname -m)" in
  x86_64) maskine=x86_64 ;;
  aarch64|arm64) maskine=aarch64 ;;
  *) echo 'Der kræves 64-bit Linux (x86_64 eller ARM64).' >&2; exit 1 ;;
esac
mappe=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ "$maskine" != "$(cat "$mappe/arkitektur.txt")" ]; then
  echo 'Forkert pakke til denne processor. Vælg Linux-x64 eller Linux-ARM64.' >&2; exit 1
fi
if [ "$(id -u)" = 0 ]; then
  echo 'Kør installer.sh som din almindelige bruger, uden sudo.' >&2; exit 1
fi
: "${HOME:?Hjemmemappen mangler}"
maal="$HOME/.local/bin/broekraft-server"
mkdir -p -- "$HOME/.local/bin"
if [ -d "$maal" ]; then echo "Der ligger allerede en mappe ved $maal" >&2; exit 1; fi
# Omdøb en færdig kopi, så en afbrudt opdatering ikke efterlader et halvt program.
midlertidig=$(mktemp "$HOME/.local/bin/.broekraft-server.XXXXXX")
trap 'rm -f -- "$midlertidig"' EXIT HUP INT TERM
install -m 755 -- "$mappe/BroekraftServer" "$midlertidig"
mv -f -- "$midlertidig" "$maal"
printf 'Installeret: %s\nStart med: "%s"\nUden skærm: "%s" --ingen-browser\n' "$maal" "$maal" "$maal"
echo 'Stop en gammel server med Ctrl+C, før du starter den nye. Verdener og certifikater bevares.'
