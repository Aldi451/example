<?php
/**
 * Impor config.json ke database sebagai data live + draft.
 * Jalankan LOKAL (bukan di hosting):
 *
 *   php tools/import-config.php
 *
 * Membutuhkan api/config.php yang sudah berisi kredensial database hosting.
 * Catatan: InfinityFree MEMBLOKIR koneksi MySQL dari luar server mereka,
 * jadi jalankan file ini dari hosting (upload, buka via cron/CLI) atau
 * tempel JSON-nya manual di phpMyAdmin.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

require_once __DIR__ . '/../api/lib/data.php';
require_once __DIR__ . '/../api/lib/db.php';

$configPath = __DIR__ . '/../config.json';
$raw = file_get_contents($configPath);
$data = json_decode((string)$raw, true);

if (!is_array($data)) {
    fwrite(STDERR, "❌ config.json tidak valid.\n");
    exit(1);
}

// adminPin hanya ada di mode demo — jangan disimpan di database
unset($data['adminPin']);

$clean = sanitize_config($data);
$json = json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

foreach (['live', 'draft'] as $key) {
    DB::upsertSetting($key, $json);
    echo "✅ settings['{$key}'] terisi (" . count($clean['menu']) . " menu)\n";
}

echo "Selesai. Buka dashboard admin untuk memverifikasi.\n";
