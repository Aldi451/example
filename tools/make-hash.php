<?php
/**
 * Membuat hash password admin tanpa web setup.
 * Pakai kalau tidak mau membuka api/setup.php di hosting.
 *
 *   php tools/make-hash.php "password-panjang-kamu"
 *
 * Lalu jalankan SQL yang dicetak di phpMyAdmin.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit('CLI only.');
}

$password = $argv[1] ?? '';
$username = $argv[2] ?? 'admin';

if (strlen($password) < 10) {
    fwrite(STDERR, "❌ Password minimal 10 karakter.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

echo "\nHash (bcrypt):\n{$hash}\n\n";
echo "Jalankan SQL ini di phpMyAdmin:\n\n";
echo "DELETE FROM admins WHERE username = '" . addslashes($username) . "';\n";
echo "INSERT INTO admins (username, password_hash) VALUES ('" . addslashes($username) . "', '{$hash}');\n\n";
echo "Verifikasi cepat: " . (password_verify($password, $hash) ? "OK ✅" : "GAGAL ❌") . "\n";
