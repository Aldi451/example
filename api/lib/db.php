<?php
/**
 * Koneksi database + helper query.
 * Mendukung MySQL (InfinityFree) dan SQLite (untuk uji lokal).
 */
declare(strict_types=1);

require_once __DIR__ . '/data.php';

final class DB
{
    private static ?PDO $pdo = null;

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $cfg = app_config();
        $driver = $cfg['db_driver'] ?? 'mysql';

        try {
            if ($driver === 'sqlite') {
                $path = $cfg['db_sqlite_path'] ?? (__DIR__ . '/../data/app.sqlite');
                $pdo = new PDO('sqlite:' . $path);
            } else {
                $dsn = sprintf(
                    'mysql:host=%s;dbname=%s;charset=%s',
                    $cfg['db_host'],
                    $cfg['db_name'],
                    $cfg['db_charset'] ?? 'utf8mb4'
                );
                $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass']);
            }

            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            self::$pdo = $pdo;
            return $pdo;
        } catch (PDOException $e) {
            // Jangan bocorkan detail koneksi ke pengunjung.
            error_log('[DB] ' . $e->getMessage());
            if (function_exists('fail')) {
                fail(500, 'Koneksi database gagal. Periksa api/config.php.');
            }
            throw new RuntimeException('Koneksi database gagal: ' . $e->getMessage());
        }
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    public static function all(string $sql, array $params = []): array
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function run(string $sql, array $params = []): int
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /** Upsert setting: syntax berbeda antara MySQL dan SQLite. */
    public static function upsertSetting(string $key, string $json): void
    {
        $driver = app_config()['db_driver'] ?? 'mysql';
        $sql = $driver === 'mysql'
            ? 'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, NOW())
               ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()'
            : 'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, datetime("now"))
               ON CONFLICT(`key`) DO UPDATE SET `value` = excluded.`value`, updated_at = datetime("now")';
        self::run($sql, [$key, $json]);
    }
}
