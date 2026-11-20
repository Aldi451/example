<?php
/**
 * Konfigurasi backend — COPY file ini menjadi `api/config.php`
 * lalu isi kredensial dari panel InfinityFree.
 *
 * ⚠️ api/config.php TIDAK boleh di-commit ke GitHub (sudah masuk .gitignore).
 *
 * Nilai yang dipakai di InfinityFree (vPanel → MySQL Databases):
 *   host     : sqlXXX.infinityfree.com    ← BUKAN localhost
 *   database : ifn_xxxxxxx
 *   username : ifn_xxxxxxx
 *   password : hasil generate vPanel (simpan!)
 */
return [
    // Koneksi database
    'db_host' => 'sql000.infinityfree.com',
    'db_name' => 'ifn_00000000',
    'db_user' => 'ifn_00000000',
    'db_pass' => 'GANTI_PASSWORD_DB',
    'db_charset' => 'utf8mb4',

    // Sesi admin
    'session_name' => 'manj_admin',
    'session_lifetime' => 60 * 60 * 8,   // 8 jam

    // Proteksi brute-force login
    'max_login_attempts' => 5,
    'lockout_minutes' => 15,

    // Folder upload gambar menu (relatif dari root situs)
    'upload_dir' => 'uploads',
    'max_upload_bytes' => 3 * 1024 * 1024,  // 3 MB
    'max_image_width' => 1600,

    // Domain situs (untuk CORS & link absolut) — tanpa trailing slash
    'site_url' => 'https://namasitus.infinityfreeapp.com',

    // Zona waktu
    'timezone' => 'Asia/Jakarta',
];
