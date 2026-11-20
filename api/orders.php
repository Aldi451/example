<?php
/**
 * Endpoint pesanan.
 *
 *  POST /api/orders.php                      -> publik, pelanggan membuat pesanan
 *  GET  /api/orders.php?status=&limit=       -> admin, daftar pesanan
 *  PATCH/POST /api/orders.php?action=status  -> admin, ubah status { id, status }
 */
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/store.php';

send_security_headers();
require_same_origin();

const ORDER_STATUSES = ['baru', 'diproses', 'selesai', 'batal'];
const MAX_ORDER_TOTAL = 10000000;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

/* ------------------------------- admin: list ------------------------------ */

if ($method === 'GET') {
    require_admin();
    $status = $_GET['status'] ?? '';
    $limit = min(200, max(1, (int)($_GET['limit'] ?? 100)));

    $sql = 'SELECT id, customer_name, service_type, note, items, total, status, created_at
            FROM orders';
    $params = [];
    if ($status !== '' && in_array($status, ORDER_STATUSES, true)) {
        $sql .= ' WHERE status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;

    $rows = DB::all($sql, $params);
    foreach ($rows as &$row) {
        $row['items'] = json_decode((string)$row['items'], true) ?: [];
        $row['total'] = (int)$row['total'];
    }
    json_out(['ok' => true, 'data' => $rows]);
}

/* ------------------------------ admin: status ----------------------------- */

if ($method === 'POST' && $action === 'status') {
    require_admin();
    require_csrf();
    $body = body_json();
    $id = (int)($body['id'] ?? 0);
    $status = (string)($body['status'] ?? '');
    if ($id <= 0 || !in_array($status, ORDER_STATUSES, true)) {
        fail(422, 'Data status tidak valid.');
    }
    DB::run('UPDATE orders SET status = ? WHERE id = ?', [$status, $id]);
    json_out(['ok' => true]);
}

/* ---------------------------- publik: buat pesanan ------------------------ */

if ($method === 'POST') {
    $body = body_json();

    $customer = str_limit($body['customerInfo'] ?? '', 120);
    $service = str_limit($body['serviceType'] ?? '', 60);
    $note = str_limit($body['note'] ?? '', 200);
    $items = is_array($body['items'] ?? null) ? $body['items'] : [];

    if (strlen($customer) < 3) {
        fail(422, 'Nama / meja / alamat wajib diisi minimal 3 karakter.');
    }
    if ($items === [] || count($items) > 40) {
        fail(422, 'Pesanan kosong atau terlalu banyak item.');
    }

    $clean = [];
    $total = 0;
    foreach (array_slice($items, 0, 40) as $item) {
        $name = str_limit($item['name'] ?? '', 60);
        $price = (int)($item['price'] ?? 0);
        $qty = max(0, min(99, (int)($item['qty'] ?? 0)));
        if ($name === '' || $price <= 0 || $qty <= 0) {
            continue;
        }
        $clean[] = ['id' => str_limit($item['id'] ?? '', 40), 'name' => $name, 'price' => $price, 'qty' => $qty];
        $total += $price * $qty;
    }
    if ($clean === [] || $total <= 0 || $total > MAX_ORDER_TOTAL) {
        fail(422, 'Total pesanan tidak valid.');
    }

    // Anti-spam sederhana: maksimal 3 pesanan per IP per 2 menit.
    $ip = client_ip();
    $recent = DB::one(
        'SELECT COUNT(*) AS n FROM orders WHERE ip = ? AND created_at >= ?',
        [$ip, date('Y-m-d H:i:s', time() - 120)]
    );
    if ((int)($recent['n'] ?? 0) >= 3) {
        fail(429, 'Terlalu banyak pesanan dalam waktu singkat. Coba lagi sebentar.');
    }

    $now = date('Y-m-d H:i:s');
    DB::run(
        'INSERT INTO orders (customer_name, service_type, note, items, total, status, ip, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
            $customer,
            $service,
            $note,
            json_encode($clean, JSON_UNESCAPED_UNICODE),
            $total,
            'baru',
            $ip,
            $now,
        ]
    );

    json_out(['ok' => true, 'total' => $total], 201);
}

fail(405, 'Metode tidak didukung.');
