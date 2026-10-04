# Til Claude: Sigtekorns spillerum er klar (opgave H)

4. oktober 2026. Arbejdet ligger på `codex/spilrum`, og serverens næste udgave er **0.6.0**.
Spilkoden og den færdige `spil/sigtekorn/online.js` er ikke ændret af Codex.

## Det serveren nu gør

- `/ws/rum` følger kontrakten i `OVERDRAGELSE-CODEX-SIGTEKORN-ONLINE.md`.
  Rum isoleres med `spil/rum`, har højst otte spillere og gemmes kun i hukommelsen.
- Navne trimmes, normaliseres til NFC og må være højst 16 Unicode-tegn.
  Navnesammenfald ignorerer store/små bogstaver og giver suffix ` 2`, ` 3` osv.;
  et langt navn afkortes før suffixet, så det tildelte navn stadig er højst 16 tegn.
- Værten er den længst tilstedeværende. Dens seneste fælles tilstand følger med nye spillere.
  Alle gæsters fælles tilstande ignoreres. Hvis værten går, får de resterende spillere samme nye vært,
  også hvis en sendefejl afslører endnu en afbrudt forbindelse midt i værtskiftet.
- `til` sender opaque data videre som `fra` med serverens eget afsender-id.
  Broadcast har intet ekko; direkte beskeder kan kun nå en anden spiller i samme rum.
- Data må fylde 1500 UTF-8-bytes, værtens tilstand 512. Begge deler et rullende loft på
  40 beskeder pr. spiller og 240 pr. rum pr. sekund. For store data og overkvoten droppes stille.
- JSON-kuverten har et loft på 4096 UTF-8-bytes. Binary lukker med 1003.
  Første hej skal komme inden ti sekunder. Fejlsvar har et særskilt begrænset budget.
  En modtager med mere end 4 MiB ventende udgående data lukkes med 1013.
- Begge spilkanaler deler serverens 128 forbindelser, også inden hej.
  Adgangskontrollen er den eksisterende private-IP/Host/Origin-kontrol.
  Brøkrafts protokol og gemte verdener er uændrede.
- `/api/status` har et nyt numerisk felt `forbindelser`, som tæller begge kanaler.
  Det kan bruges ved opdatering, så en Sigtekorn-kamp ikke overses.

## Afprøvning

172 Deno-tests og 127 tests for de tre voksenverdener består. De nye spillerumsprøver omfatter
19 modultests, otte rigtige HTTP/WebSocket-tests og fem tests med Sigtekorns faktiske Online-klasse.

Nye tests prøver grænser, rumsikkerhed, værtsvalg, sendefejl og oprydning. Rigtige HTTP/WebSocket-forbindelser
prøver begge kanaler samtidig. Den faktiske Online-klasse evalueres uændret i en VM mod serveren;
kun importerne til figurtegning og de eksterne callbacks erstattes i denne netværksprøve.

Alle fem selvstændige programmer kan bygges: Windows, begge Mac-typer og Linux x64/ARM64.
Det byggede Windows-program har bestået den udvidede pakketest og CA-valideret HTTPS/WSS.
Linux-installationsprøven i CI bruger samme nye HTTPS/WSS-prøve på x64 og ARM64.
Ingen certifikatkontrol eller voksenkode er slået fra. Fysisk Safari/Mac og et fuldt manuelt spil
mellem to computere bag voksenlåsen er ikke prøvet.

## Brug og udgivelse

Vejledningen og udgivelsesnoterne er opdateret til 0.6.0. På hver enhed åbnes
`https://<serverens-ip>:8443/spil/sigtekorn/`. Vælg **🌐 Online**, udfyld **Dit navn** og samme **Rum**, og tryk **Forbind**.

Grenen afleveres til fletning efter projektets regel om, at ejeren fletter til `main`.
`server-v0.6.0` skal først oprettes på den flettede og afprøvede version. Derefter kan de officielle
pakker udgives, og Pi'en opdateres med backup af verdener, certifikater og den tidligere programfil.
Der er ikke oprettet et release-tag eller ændret noget på familiens Pi som del af denne gren.
