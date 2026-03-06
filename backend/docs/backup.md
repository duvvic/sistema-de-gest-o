# Estratégia de Backup e Recuperação (Backup & Recovery)

Este documento descreve as políticas e scripts para garantir a integridade e disponibilidade dos dados do sistema.

## 1. Backup de Banco de Dados (PostgreSQL / Supabase)

### Diário (Daily)
*   **Frequência**: A cada 24 horas (meia-noite UTC).
*   **Retenção**: 30 dias.
*   **Tipo**: Dump lógico via `pg_dump`.

### Semanal (Weekly)
*   **Frequência**: Todo domingo.
*   **Retenção**: 12 meses.
*   **Tipo**: Backup completo (Dados + Esquema).

## 2. Script de Backup Automático

Para execução local ou em servidor self-hosted:

```bash
#!/bin/bash
# backup.sh
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

mkdir -p $BACKUP_DIR

echo "Iniciando backup: $TIMESTAMP"
pg_dump $DB_URL > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Compactar
gzip $BACKUP_DIR/db_backup_$TIMESTAMP.sql

echo "Backup finalizado com sucesso."
```

## 3. Procedimento de Recuperação (Recovery)

Para restaurar um backup:

1.  **Limpar Banco de Dados** (Cuidado: Isso apagará dados atuais!):
    ```sql
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    ```
2.  **Restaurar via psql**:
    ```bash
    gunzip db_backup_YYYYMMDD_HHMMSS.sql.gz
    psql [DB_URL] < db_backup_YYYYMMDD_HHMMSS.sql
    ```

## 4. Backup de Arquivos (Storage)

Os arquivos (attachments) estão armazenados no Supabase Storage.
*   Sincronização mensal recomendada para bucket local S3-compatible.

---
**Responsável**: CTO / DevOps
**Última Atualização**: Março 2026
