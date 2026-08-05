# Roll back v6.0.0

1. Stop the services.
2. Rename the v6 folder to `web-v6-backup`.
3. Restore the complete v5 `web` folder and its `.env.local`.
4. Run `npm install` and start the services.
5. Keep migration 022 unless coaching/journey data has been exported and deletion is explicitly intended. The migration is additive and does not prevent the v5 application from using its existing tables.
