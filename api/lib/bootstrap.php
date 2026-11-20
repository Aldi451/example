<?php
/**
 * Bootstrap bersama: konfigurasi, sesi, header keamanan, helper response.
 * Semua endpoint di folder ini meng-include file ini pertama.
 */
declare(strict_types=1);

if (!defined('APP_BOOTSTRAPPED')) {
    define('APP_BOOTSTRAPPED', true);
}


// Tampilkan error hanya di log, jangan pernah ke browser (bocor path/kredensial).
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

/* ------------------------------- konfigurasi ------------------------------ */

require_once __DIR__ . '/data.php';   // app_config() + sanitize_config()

/* --------------------------------- response -------------------------------- */

function json_out(array $data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $message): void
{
    json_out(['ok' => false, 'error' => $message], $status);
}

function body_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > 512000) {
        fail(413, 'Payload terlalu besar.');
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/* --------------------------------- header ---------------------------------- */

function send_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(self), camera=(), microphone=()');
    // API tidak perlu dieksekusi sebagai halaman
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'self'");
}

/** Hanya izinkan request dari domain sendiri (anti CSRF sederhana). */
function require_same_origin(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        return; // same-origin fetch biasanya tanpa Origin pada GET
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $originHost = parse_url($origin, PHP_URL_HOST);
    if (!$originHost || strcasecmp((string)$originHost, (string)$host) !== 0) {
        fail(403, 'Origin tidak diizinkan.');
    }
}

/* ---------------------------------- sesi ----------------------------------- */

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $cfg = app_config();
    session_name($cfg['session_name']);
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => 'Strict',
    ]);
    session_start();

    // Sesi kedaluwarsa karena tidak aktif
    $last = $_SESSION['last_seen'] ?? 0;
    if ($last && (time() - $last) > (int)$cfg['session_lifetime']) {
        session_unset();
        session_destroy();
        session_start();
    }
    $_SESSION['last_seen'] = time();
}

function require_admin(): void
{
    start_session();
    if (empty($_SESSION['admin_id'])) {
        fail(401, 'Belum login.');
    }
}

/** CSRF token per sesi (dipakai untuk semua request POST/PUT/DELETE admin). */
function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['csrf'];
}

function require_csrf(): void
{
    start_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], (string)$sent)) {
        fail(403, 'Token CSRF tidak valid. Muat ulang halaman.');
    }
}

/* --------------------------------- helper ---------------------------------- */

/** Ambil IP klien dengan aman (InfinityFree memakai proxy). */
function client_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return substr($ip, 0, 45);
}

function str_limit(mixed $value, int $max): string
{
    $text = trim((string)($value ?? ''));
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $text) ?? '';
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $max);
    }
    return substr($text, 0, $max);
}
