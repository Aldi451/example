<?php
/**
 * Endpoint autentikasi admin.
 *
 *  POST /api/auth.php?action=login   { username, password }
 *  POST /api/auth.php?action=logout
 *  GET  /api/auth.php?action=me
 */
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/data.php';

send_security_headers();
require_same_origin();

$action = $_GET['action'] ?? 'me';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'me') {
    start_session();
    json_out([
        'ok' => true,
        'loggedIn' => !empty($_SESSION['admin_id']),
        'username' => $_SESSION['admin_user'] ?? null,
        'csrf' => csrf_token(),
    ]);
}

if ($action === 'logout') {
    start_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'] ?? '', $p['secure'], $p['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

if ($action !== 'login' || $method !== 'POST') {
    fail(405, 'Aksi tidak didukung.');
}

$cfg = app_config();
$body = body_json();
$username = str_limit($body['username'] ?? '', 60);
$password = (string)($body['password'] ?? '');

if ($username === '' || $password === '') {
    fail(422, 'Username dan password wajib diisi.');
}

/* --------------------------- proteksi brute force ------------------------- */

$ip = client_ip();
$since = date('Y-m-d H:i:s', time() - ((int)$cfg['lockout_minutes'] * 60));
$row = DB::one(
    'SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND success = 0 AND created_at >= ?',
    [$ip, $since]
);
$attempts = (int)($row['n'] ?? 0);
if ($attempts >= (int)$cfg['max_login_attempts']) {
    fail(429, 'Terlalu banyak percobaan. Coba lagi dalam ' . (int)$cfg['lockout_minutes'] . ' menit.');
}

/* ------------------------------- verifikasi ------------------------------- */

$admin = DB::one('SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1', [$username]);
$ok = $admin && password_verify($password, (string)$admin['password_hash']);

DB::run(
    'INSERT INTO login_attempts (ip, username, success, created_at) VALUES (?, ?, ?, ?)',
    [$ip, $username, $ok ? 1 : 0, date('Y-m-d H:i:s')]
);

if (!$ok) {
    // Pesan sengaja umum: jangan beri tahu username mana yang benar.
    fail(401, 'Username atau password salah.');
}

// Rehash otomatis bila algoritma/cost berubah
if (password_needs_rehash((string)$admin['password_hash'], PASSWORD_DEFAULT)) {
    DB::run('UPDATE admins SET password_hash = ? WHERE id = ?', [
        password_hash($password, PASSWORD_DEFAULT),
        $admin['id'],
    ]);
}

session_regenerate_id(true);
$_SESSION['admin_id'] = (int)$admin['id'];
$_SESSION['admin_user'] = $admin['username'];
$_SESSION['last_seen'] = time();
csrf_token();

DB::run('DELETE FROM login_attempts WHERE created_at < ?', [date('Y-m-d H:i:s', time() - 604800)]);

json_out(['ok' => true, 'username' => $admin['username'], 'csrf' => csrf_token()]);
