<?php
/**
 * Health check + penjaga folder api.
 * Membuka /api/ langsung tidak akan menampilkan daftar file.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$hasConfig = is_file(__DIR__ . '/config.php');

echo json_encode([
    'ok' => true,
    'service' => 'Mie Ayam Wonogiri — API',
    'configured' => $hasConfig,
    'php' => PHP_VERSION,
    'time' => date('c'),
    'hint' => $hasConfig
        ? 'Backend aktif. Dashboard: ../admin.html'
        : 'Copy api/config.example.php menjadi api/config.php lalu isi kredensial database.',
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
