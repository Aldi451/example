-- ============================================================================
-- Mie Ayam Wonogiri Mas Jon — skema MySQL (InfinityFree / MariaDB 10.x)
-- Cara pakai:
--   1. vPanel InfinityFree → MySQL Databases → buat database + user
--   2. vPanel → phpMyAdmin → pilih database → tab SQL → tempel SELURUH file ini → Go
--   3. Edit api/config.php sesuai kredensial database
--   4. Buka api/setup.php sekali untuk membuat akun admin
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- 1. Admin (dashboard)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(60)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. Settings: satu baris per key ('live' = publik, 'draft' = kerja admin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(32) NOT NULL,
  `value`    LONGTEXT    NOT NULL,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. Pesanan pelanggan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(120) NOT NULL,
  service_type  VARCHAR(60)  NOT NULL DEFAULT '',
  note          VARCHAR(200) NOT NULL DEFAULT '',
  items         TEXT         NOT NULL,
  total         INT UNSIGNED NOT NULL DEFAULT 0,
  status        ENUM('baru','diproses','selesai','batal') NOT NULL DEFAULT 'baru',
  ip            VARCHAR(45)  NOT NULL DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_created (created_at),
  KEY idx_status (status),
  KEY idx_ip_created (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. Log percobaan login (anti brute-force)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_attempts (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip         VARCHAR(45)  NOT NULL,
  username   VARCHAR(60)  NOT NULL DEFAULT '',
  success    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ip_created (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. Seed konfigurasi awal (dari config.json)
--    Default: array kosong -> backend otomatis memakai config.json sebagai
--    fallback sampai admin melakukan Publish pertama kali.
-- ---------------------------------------------------------------------------
INSERT INTO settings (`key`, `value`) VALUES ('live', '')
  ON DUPLICATE KEY UPDATE `key` = `key`;
INSERT INTO settings (`key`, `value`) VALUES ('draft', '')
  ON DUPLICATE KEY UPDATE `key` = `key`;
