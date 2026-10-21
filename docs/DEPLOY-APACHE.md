# Absicherung mit HTTP Basic Auth (Apache)

Die App ist ein statischer Export (`out/`) und kann auf jedem Webspace liegen.
Für den Zugriffsschutz liegt im Repo eine `.htaccess` für Apache-Webserver.

## Wichtig: GitHub Pages kann KEIN .htaccess!

GitHub Pages ignoriert `.htaccess` komplett – dort ist **kein Passwortschutz möglich**.
Wenn die Seite geschützt sein soll, braucht ihr eigenes Hosting (Webspace, NAS, eigener Server).
Bis dahin sollte das GitHub-Repo **privat** bleiben, wenn die öffentliche URL nicht geteilt werden soll.

## Einrichtung auf eurem Apache-Webspace

1. **Passwort-Datei erzeugen** (auf dem Server oder lokal, danach hochladen):

   ```bash
   htpasswd -c /home/USER/.htpasswd eltern1
   # weitere Benutzer ohne -c:
   htpasswd /home/USER/.htpasswd eltern2
   ```

   Ohne `htpasswd`-Tool geht auch openssl:

   ```bash
   printf "eltern1:$(openssl passwd -apr1 GEHEIM)\n" > /home/USER/.htpasswd
   ```

2. **Pfad in `.htaccess` anpassen**: `AuthUserFile /home/USER/.htpasswd` muss auf den
   echten Speicherort zeigen. Am besten **außerhalb** des Web-Roots ablegen, damit die
   Datei nicht über den Browser abrufbar ist. (Als Fallback innerhalb des Web-Roots:
   die mitgelieferte `.htaccess` sperrt den Zugriff auf `.htpasswd` per
   `FilesMatch`.)

3. **Bauen und hochladen**:

   ```bash
   NODE_ENV=production npm install && npm run build
   # Inhalt von ./out/ in das Web-Verzeichnis kopieren (z. B. per SFTP/FTP)
   ```

4. **Testen**: Beim Aufruf der Seite erscheint der Login-Dialog. Ohne korrekte
   Zugangsdaten wird nichts ausgeliefert – auch keine Dateien.

## Voraussetzungen beim Hoster

- Apache mit `mod_authn_file` und `mod_authz_user` (Standard bei fast allen Hostern)
- `AllowOverride AuthConfig` (bei den meisten Shared-Hosting-Angeboten gegeben;
  sonst muss die Auth-Direktive in die VirtualHost-Konfiguration)

## Mehrere Eltern-Gruppen

Pro Gruppe eine eigene `.htpasswd` mit eigenen Zugängen pflegen. `Require valid-user`
lässt jeden gültigen Benutzer rein; mit `Require user eltern1 eltern2` könnt ihr
den Kreis enger ziehen.
