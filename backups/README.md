# Firestore Backups (SEC-04)

Backup semanal de Firestore (domingos 3am UTC) vía GitHub Actions.
La PII **nunca** se sube a git ni en claro: se cifra con AES-256 en el runner
antes de subirse como artefacto.

## Configuración (una vez)

Dos secrets en el repo (Settings → Secrets and variables → Actions):

- `FIREBASE_SERVICE_ACCOUNT_JSON` — JSON de la cuenta de servicio de Firebase.
- `BACKUP_ENCRYPTION_KEY` — passphrase para cifrar. Genérala y guárdala fuera del repo:
  ```sh
  openssl rand -base64 32
  ```
  ⚠️ Si pierdes esta clave, los backups son irrecuperables. Guárdala en tu gestor de contraseñas.

## Restaurar un backup

1. Descarga el artefacto `firestore-backup-<run_id>` desde la pestaña Actions.
2. Descifra con la misma `BACKUP_ENCRYPTION_KEY`:
   ```sh
   openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:'<TU_CLAVE>' \
     -in firestore-backup.tar.gz.enc | tar -xzf -
   ```
3. Los JSON quedan en `backups/<fecha>/` (`tenants.json`, `users.json` con subcolecciones embebidas bajo `_appointments`, `_clients`, etc).

## Migrar a GCS (futuro)

Cuando haya un bucket: añadir un paso `google-github-actions/upload-cloud-storage`
tras el cifrado y subir el `.enc` al bucket con lifecycle de retención. El artefacto
de Actions puede quedar como copia secundaria.
