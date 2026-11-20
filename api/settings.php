<?php
/**
 * Endpoint konfigurasi toko.
 *
 *  GET  /api/settings.php?which=live      -> publik, untuk halaman pelanggan
 *  GET  /api/settings.php?which=draft     -> admin (butuh login)
 *  POST /api/settings.php?which=draft     -> simpan draft (admin + CSRF)
 *  POST /api/settings.php?which=publish   -> publish draft ke live (admin + CSRF)
 */
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/data.php';
require_once __DIR__ . '/lib/store.php';

send_security_headers();
require_same_origin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$which = $_GET['which'] ?? 'live';
// Data awal saat DB masih kosong (JSON tidak bisa di-require langsung)
$fallbackJson = @file_get_contents(__DIR__ . '/../config.json');
$fallback = json_decode((string)$fallbackJson, true);
if (!is_array($fallback)) {
    $fallback = ['menu' => [], 'services' => [], 'socmed' => []];
}
unset($fallback['adminPin']); // PIN demo tidak boleh ikut tersaji

if ($method === 'GET') {
    if ($which === 'draft') {
        require_admin();
        json_out(['ok' => true, 'data' => Store::get(Store::DRAFT, $fallback)]);
    }

    // Config publik boleh di-cache singkat supaya hemat kuota hosting gratis
    header('Cache-Control: public, max-age=60');
    json_out(['ok' => true, 'data' => Store::get(Store::LIVE, $fallback)]);
}

if ($method === 'POST') {
    require_admin();
    require_csrf();

    $body = body_json();
    $config = is_array($body['data'] ?? null) ? $body['data'] : null;
    if ($config === null) {
        fail(422, 'Data konfigurasi tidak dikirim.');
    }

    if ($which === 'publish') {
        $saved = Store::publish($config);
        json_out(['ok' => true, 'data' => $saved, 'published' => true]);
    }

    if ($which === 'draft') {
        $saved = Store::sanitize($config);
        Store::put(Store::DRAFT, $saved);
        json_out(['ok' => true, 'data' => $saved]);
    }

    fail(400, 'Parameter which tidak dikenal.');
}

fail(405, 'Metode tidak didukung.');
