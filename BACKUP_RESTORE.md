MongoDB & Redis backup & restore quick guide

This file outlines simple, low-risk backup and restore steps for Paylink's backend.

MongoDB (recommended: managed service like Atlas)

- Backup (managed): Use provider snapshots (e.g., Atlas scheduled snapshots).
- Backup (self-hosted): Use mongodump

  mongodump --uri="${MONGODB_URI}" --gzip --archive=/backups/paylink-$(date +%F-%H%M).gz

- Restore:

  mongorestore --uri="${MONGODB_URI}" --gzip --archive=/backups/paylink-latest.gz --drop

Notes:
- Keep backups encrypted at rest and rotate keys via your KMS.
- Retention: keep daily snapshots for 14 days and weekly snapshots for 12 weeks (adjust to your compliance needs).

Redis (recommended: managed Redis snapshots or RDB/AOF)

- Backup (RDB): copy the dump.rdb file from the Redis data directory.
- Backup (AOF): copy appendonly.aof when AOF is enabled.
- For managed Redis (Elasticache/MemoryDB/Managed Redis): use provider snapshot APIs.

Restore:
- Stop Redis, replace dump.rdb or appendonly.aof in the data directory, and start Redis.
- For cluster restores, follow provider-specific restore procedures.

Operational tips
- Test restores regularly (monthly) in a staging environment.
- Store backups in a different region than the primary cluster.
- Automate backups via cron or provider snapshots and monitor success via alerting.

Emergency contact & playbook
- If data loss occurs, follow the restore playbook: notify stakeholders, isolate the affected service, restore to a staging environment, verify, and then restore to production during a maintenance window.
