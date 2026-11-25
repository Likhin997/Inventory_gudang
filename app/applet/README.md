# Sistem Inventory ISP - Panduan Instalasi Localhost

Aplikasi ini adalah Sistem Inventory berbasis Web (Full-stack) menggunakan React, Vite, Tailwind CSS, Express, dan PostgreSQL (menggunakan Drizzle ORM).

Berikut adalah panduan lengkap untuk menjalankan aplikasi ini di komputer lokal (localhost) Anda.

## 📌 Persyaratan Sistem (Prerequisites)
Pastikan komputer Anda sudah terinstal:
1. **Node.js** (Rekomendasi versi 18.x atau 20.x LTS) - [Download di sini](https://nodejs.org/)
2. **PostgreSQL** (Versi 14+) - [Download di sini](https://www.postgresql.org/download/)
3. **Visual Studio Code** (atau text editor lainnya)

---

## 🚀 Langkah-langkah Instalasi

### 1. Unduh / Ekstrak Kode Sumber
Jika Anda mengekspor proyek ini dalam bentuk ZIP, ekstrak file tersebut ke dalam sebuah folder (misal: `C:\Projects\inventory-app`).
Buka folder tersebut menggunakan Visual Studio Code.

### 2. Buat Database di PostgreSQL
Buka terminal SQL (psql) atau aplikasi GUI seperti pgAdmin, lalu jalankan perintah berikut untuk membuat database kosong:
```sql
CREATE DATABASE inventory_db;
```

### 3. Konfigurasi Environment Variables (.env)
Buat sebuah file baru bernama `.env` di folder utama aplikasi (sejajar dengan `package.json`).
Isi file `.env` tersebut dengan format berikut (sesuaikan username, password, dan nama database):
```env
# Format: postgresql://<username>:<password>@localhost:5432/<nama_database>
DATABASE_URL="postgresql://postgres:password123@localhost:5432/inventory_db"
```

### 4. Instal Dependencies
Buka terminal di dalam VS Code (pastikan Anda berada di direktori aplikasi), lalu jalankan perintah:
```bash
npm install
```

### 5. Sinkronisasi Skema Database (Migrasi)
Untuk membuat tabel-tabel di dalam database PostgreSQL yang baru saja dibuat, jalankan perintah:
```bash
npm run db:push
```

### 6. Jalankan Aplikasi (Development Server)
Setelah instalasi dan migrasi berhasil, jalankan server pengembangan dengan perintah:
```bash
npm run dev
```

### 7. Akses Aplikasi
Buka browser (Chrome/Edge/Firefox) dan akses alamat berikut:
👉 **http://localhost:3000**

---

## 🔑 Akun Login Default
Saat aplikasi pertama kali dijalankan dan mengakses API, sistem otomatis menyuntikkan (seeding) data default ke dalam database. Gunakan akun berikut untuk masuk:

*   **SUPERADMIN**
    *   Username: `superadmin`
    *   Password: `password123`
*   **ADMIN**
    *   Username: `admin`
    *   Password: `password123`
*   **GUDANG**
    *   Username: `gudang1`
    *   Password: `password123`
*   **TEKNISI**
    *   Username: `teknisi1`
    *   Password: `password123`

Selamat menggunakan Sistem Inventory ISP!
