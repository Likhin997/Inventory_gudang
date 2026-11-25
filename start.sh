#!/bin/sh
echo "[DOCKER_START] Memulai container gudang_jetcyber_app..."
echo "[DOCKER_START] Memeriksa & migrasi skema database PostgreSQL..."
node run_migration.js
echo "[DOCKER_START] Memeriksa akun Super Admin default..."
node run_seed.js
echo "[DOCKER_START] Menjalankan server aplikasi Gudang JetCyber..."
npm start
