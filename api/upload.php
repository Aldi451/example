<?php
/**
 * Upload foto menu (admin).
 *
 *  POST /api/upload.php   multipart: file=<gambar>
 *  -> { ok: true, path: "uploads/menu-xxxx.webp" }
 *
 * Keamanan:
 *  - wajib login + CSRF
 *  - ekstensi & MIME diverifikasi (getimagesize, bukan hanya nama file)
 *  - nama file dibuat ulang (slug + random), tidak memakai nama asli
 *  - batas ukuran & dimensi
 *  - GD dipakai untuk kompres + resize bila tersedia (InfinityFree punya GD)
 */
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/data.php';

send_security_headers();
require_same_origin();
require_admin();
require_csrf();

$cfg = app_config();

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    fail(422, 'Tidak ada file yang diunggah.');
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    fail(422, 'Upload gagal (kode ' . (int)($file['error'] ?? -1) . ').');
}
if ((int)$file['size'] > (int)$cfg['max_upload_bytes']) {
    fail(413, 'Ukuran file maksimal ' . round($cfg['max_upload_bytes'] / 1048576, 1) . ' MB.');
}

$info = @getimagesize($file['tmp_name']);
if ($info === false) {
    fail(422, 'File bukan gambar yang valid.');
}

$allowed = [
    IMAGETYPE_JPEG => 'jpg',
    IMAGETYPE_PNG  => 'png',
    IMAGETYPE_WEBP => 'webp',
];
$type = $info[2] ?? 0;
if (!isset($allowed[$type])) {
    fail(422, 'Format harus JPG, PNG, atau WebP.');
}
[$width, $height] = $info;
if ($width < 200 || $height < 150) {
    fail(422, 'Gambar terlalu kecil (minimal 200×150 px).');
}

/* -------------------------------- proses --------------------------------- */

$hasGd = function_exists('imagecreatetruecolor') && function_exists('imagewebp');
$targetExt = $hasGd ? 'webp' : $allowed[$type];
$name = 'menu-' . date('Ymd') . '-' . bin2hex(random_bytes(6)) . '.' . $targetExt;

$uploadRoot = dirname(__DIR__) . '/' . trim((string)$cfg['upload_dir'], '/');
$targetDir = $uploadRoot . '/menu';
if (!is_dir($targetDir) && !@mkdir($targetDir, 0755, true) && !is_dir($targetDir)) {
    error_log('[UPLOAD] tidak bisa membuat folder: ' . $targetDir);
    fail(500, 'Folder upload tidak bisa dibuat. Buat folder "uploads/menu" secara manual.');
}
if (!is_writable($targetDir)) {
    fail(500, 'Folder upload tidak writable.');
}

$targetPath = $targetDir . '/' . $name;
$relPath = trim((string)$cfg['upload_dir'], '/') . '/menu/' . $name;

if ($hasGd) {
    $src = null;
    if ($type === IMAGETYPE_JPEG) {
        $src = @imagecreatefromjpeg($file['tmp_name']);
    } elseif ($type === IMAGETYPE_PNG) {
        $src = @imagecreatefrompng($file['tmp_name']);
    } elseif ($type === IMAGETYPE_WEBP) {
        $src = @imagecreatefromwebp($file['tmp_name']);
    }
    if (!$src) {
        fail(422, 'Gambar tidak bisa diproses.');
    }

    // Resize proporsional ke lebar maksimum
    $maxWidth = (int)$cfg['max_image_width'];
    $ratio = $height > 0 ? $width / $height : 1;
    $newWidth = min($maxWidth, $width);
    $newHeight = (int)round($newWidth / ($ratio ?: 1));

    $dst = imagecreatetruecolor($newWidth, $newHeight);
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    $written = imagewebp($dst, $targetPath, 82);
    imagedestroy($src);
    imagedestroy($dst);

    if (!$written) {
        fail(500, 'Gagal menyimpan gambar.');
    }
} else {
    // Tanpa GD: simpan file apa adanya (sudah divalidasi sebagai gambar)
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        fail(500, 'Gagal menyimpan file.');
    }
}

@chmod($targetPath, 0644);

json_out([
    'ok' => true,
    'path' => $relPath,
    'width' => $newWidth ?? $width,
    'height' => $newHeight ?? $height,
    'bytes' => filesize($targetPath) ?: 0,
]);
