<?php
/**
 * Data awal + helper bersama untuk CLI (tanpa HTTP).
 */
declare(strict_types=1);

function app_config(): array
{
    static $cfg = null;
    if (is_array($cfg)) {
        return $cfg;
    }

    $path = __DIR__ . '/../config.php';
    if (!is_file($path)) {
        $msg = 'Backend belum dikonfigurasi. Copy api/config.example.php menjadi api/config.php.';
        if (PHP_SAPI === 'cli') {
            fwrite(STDERR, "❌ {$msg}\n");
            exit(1);
        }
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => $msg]);
        exit;
    }

    $cfg = require $path;
    return $cfg += [
        'db_driver' => 'mysql',
        'db_charset' => 'utf8mb4',
        'db_sqlite_path' => __DIR__ . '/../data/app.sqlite',
        'session_name' => 'manj_admin',
        'session_lifetime' => 28800,
        'max_login_attempts' => 5,
        'lockout_minutes' => 15,
        'upload_dir' => 'uploads',
        'max_upload_bytes' => 3145728,
        'max_image_width' => 1600,
        'timezone' => 'Asia/Jakarta',
        'site_url' => '',
    ];
}

/** Validasi + bersihkan config (dipakai CLI maupun web). */
function sanitize_config(array $in): array
{
    $clip = static function (mixed $v, int $max): string {
        $t = trim((string)($v ?? ''));
        return function_exists('mb_substr') ? mb_substr($t, 0, $max) : substr($t, 0, $max);
    };
    $isHttp = static fn(string $u): bool => (bool)preg_match('#^https?://#i', $u);

    $clean = [
        'version' => 4,
        'businessName' => $clip($in['businessName'] ?? 'Mie Ayam Wonogiri Mas Jon', 60),
        'tagline' => $clip($in['tagline'] ?? '', 60),
        'phoneNo' => preg_replace('/\D/', '', (string)($in['phoneNo'] ?? '')) ?? '',
        'address' => $clip($in['address'] ?? '', 220),
        'mapsUrl' => $clip($in['mapsUrl'] ?? '', 300),
        'openingHours' => $clip($in['openingHours'] ?? '', 80),
        'welcomeDescription' => $clip($in['welcomeDescription'] ?? '', 600),
        'services' => [],
        'menu' => [],
        'socmed' => [
            'instagram' => $clip($in['socmed']['instagram'] ?? '', 200),
            'facebook' => $clip($in['socmed']['facebook'] ?? '', 200),
            'whatsapp' => $clip($in['socmed']['whatsapp'] ?? '', 200),
        ],
    ];

    if ($clean['phoneNo'] !== '' && $clean['phoneNo'][0] === '0') {
        $clean['phoneNo'] = '62' . substr($clean['phoneNo'], 1);
    }
    if ($clean['mapsUrl'] !== '' && !$isHttp($clean['mapsUrl'])) {
        $clean['mapsUrl'] = '';
    }
    foreach (['instagram', 'facebook', 'whatsapp'] as $k) {
        if ($clean['socmed'][$k] !== '' && !$isHttp($clean['socmed'][$k])) {
            $clean['socmed'][$k] = '';
        }
    }

    foreach (array_slice((array)($in['services'] ?? []), 0, 8) as $i => $svc) {
        $label = $clip($svc['label'] ?? '', 60);
        if ($label === '') {
            continue;
        }
        $clean['services'][] = [
            'id' => preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($svc['id'] ?? ''))) ?: 'svc-' . $i,
            'label' => $label,
            'enabled' => !isset($svc['enabled']) || $svc['enabled'] !== false,
        ];
    }
    if ($clean['services'] === []) {
        $clean['services'] = [
            ['id' => 'dine-in', 'label' => 'Makan di Tempat', 'enabled' => true],
            ['id' => 'takeaway', 'label' => 'Bawa Pulang (Takeaway)', 'enabled' => true],
        ];
    }

    foreach (array_slice((array)($in['menu'] ?? []), 0, 200) as $i => $item) {
        $name = $clip($item['name'] ?? '', 60);
        $price = (int)round((float)($item['price'] ?? 0));
        if ($name === '' || $price <= 0) {
            continue;
        }
        $image = $clip($item['image'] ?? '', 300);
        if ($image !== '' && !preg_match('#^(https?://|assets/|uploads/)#i', $image)) {
            $image = '';
        }
        $clean['menu'][] = [
            'id' => preg_replace('/[^a-z0-9\-]/', '', strtolower((string)($item['id'] ?? ''))) ?: 'menu-' . $i,
            'name' => $name,
            'category' => $clip($item['category'] ?? 'Makanan', 30),
            'description' => $clip($item['description'] ?? '', 140),
            'price' => $price,
            'image' => $image,
            'soldOut' => !empty($item['soldOut']),
            'isSpecial' => !empty($item['isSpecial']),
        ];
    }

    return $clean;
}
