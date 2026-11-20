<?php
/**
 * Setup awal — buka SEKALI di browser setelah config.php terisi:
 *   https://situskamu.infinityfreeapp.com/api/setup.php
 *
 * Membuat akun admin pertama. Setelah berhasil, script ini mengunci dirinya
 * sendiri (membuat file api/.setup-lock) dan tidak bisa dipakai lagi.
 * Kalau perlu reset password: hapus api/.setup-lock, buka lagi, isi password baru.
 */
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';

send_security_headers();

$lockFile = __DIR__ . '/.setup-lock';
$locked = is_file($lockFile);

$message = '';
$done = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$locked) {
    $username = str_limit($_POST['username'] ?? '', 60);
    $password = (string)($_POST['password'] ?? '');

    if (strlen($username) < 3) {
        $message = 'Username minimal 3 karakter.';
    } elseif (strlen($password) < 10) {
        $message = 'Password minimal 10 karakter (gunakan frasa, mis. kopi-pahit-2026).';
    } else {
        try {
            $exists = DB::one('SELECT id FROM admins WHERE username = ?', [$username]);
            $hash = password_hash($password, PASSWORD_DEFAULT);

            if ($exists) {
                DB::run('UPDATE admins SET password_hash = ? WHERE id = ?', [$hash, $exists['id']]);
                $message = 'Password admin diperbarui.';
            } else {
                DB::run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [$username, $hash]);
                $message = 'Akun admin berhasil dibuat.';
            }

            @file_put_contents($lockFile, "locked " . date('c'));
            $done = true;
        } catch (Throwable $e) {
            error_log('[SETUP] ' . $e->getMessage());
            $message = 'Gagal: pastikan schema.sql sudah dijalankan dan config.php benar.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Setup Admin</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f5f5f4;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}
  .box{background:#fff;max-width:420px;width:100%;padding:28px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,.1)}
  h1{font-size:1.2rem;margin:0 0 4px;color:#991b1b}p{font-size:.85rem;color:#57534e}
  label{display:block;font-size:.8rem;font-weight:700;margin:14px 0 6px}
  input{width:100%;padding:11px 13px;border:2px solid #e7e5e4;border-radius:9px;font:inherit;box-sizing:border-box}
  button{width:100%;margin-top:18px;padding:12px;border:0;border-radius:9px;background:#b91c1c;color:#fff;font-weight:800;font-size:.95rem;cursor:pointer}
  .msg{margin-top:14px;padding:10px 12px;border-radius:8px;font-size:.83rem;font-weight:700}
  .err{background:#fee2e2;color:#991b1b}.ok{background:#dcfce7;color:#166534}
  code{background:#f5f5f4;padding:1px 5px;border-radius:4px}
</style>
</head>
<body>
<div class="box">
  <h1>Setup Admin</h1>
  <p>Buat akun admin pertama untuk dashboard.</p>

  <?php if ($locked && !$done): ?>
    <div class="msg ok">Setup sudah dikunci. Hapus <code>api/.setup-lock</code> di hosting jika ingin reset password.</div>
  <?php elseif ($done): ?>
    <div class="msg ok"><?= htmlspecialchars($message, ENT_QUOTES) ?></div>
    <p style="margin-top:16px">
      <strong>Langkah terakhir:</strong> hapus <code>api/.setup-lock</code>? Tidak perlu.<br>
      Buka <a href="../admin.html">dashboard admin</a> dan login.
    </p>
    <p style="color:#991b1b"><strong>Penting:</strong> segera hapus file <code>api/setup.php</code>
    dari hosting setelah ini.</p>
  <?php else: ?>
    <?php if ($message !== ''): ?>
      <div class="msg err"><?= htmlspecialchars($message, ENT_QUOTES) ?></div>
    <?php endif; ?>
    <form method="post" autocomplete="off">
      <label for="username">Username admin</label>
      <input id="username" name="username" required minlength="3" maxlength="60" placeholder="masjon">
      <label for="password">Password (min. 10 karakter)</label>
      <input id="password" name="password" type="password" required minlength="10" maxlength="200" placeholder="frasa-panjang-mudah-diingat">
      <button type="submit">Buat Akun Admin</button>
    </form>
  <?php endif; ?>
</div>
</body>
</html>
