<?php
/**
 * Logika konfigurasi toko (settings) + validasi + publish.
 */
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/data.php';

final class Store
{
    public const LIVE = 'live';
    public const DRAFT = 'draft';

    /** Ambil config tersimpan; fallback ke data awal. */
    public static function get(string $which, array $fallback): array
    {
        $row = DB::one('SELECT `value` FROM settings WHERE `key` = ?', [$which]);
        if (!$row || !is_string($row['value']) || $row['value'] === '') {
            return $fallback;
        }
        $data = json_decode($row['value'], true);
        return is_array($data) ? $data : $fallback;
    }

    public static function put(string $which, array $config): void
    {
        $json = json_encode($config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            fail(500, 'Gagal menyimpan konfigurasi.');
        }
        DB::upsertSetting($which, $json);
    }

    /** Draft -> live. Hanya data publik (tanpa password). */
    public static function publish(array $config): array
    {
        $config = self::sanitize($config);
        self::put(self::LIVE, $config);
        self::put(self::DRAFT, $config);
        return $config;
    }

    /** Bersihkan input admin (implementasi di lib/data.php agar CLI & web sama). */
    public static function sanitize(array $in): array
    {
        return sanitize_config($in);
    }
}
