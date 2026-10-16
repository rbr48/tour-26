<?php
// api.php - Backend Sync API for Family Tour 2026
// Developed for package: com.izhaanintellect.tour2026

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dataFile = __DIR__ . '/tour_data.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($dataFile)) {
        echo file_get_contents($dataFile);
    } else {
        echo json_encode(["status" => "empty"]);
    }
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $decoded = json_decode($input, true);
    if ($decoded && isset($decoded['tourInfo'])) {
        file_put_contents($dataFile, json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        echo json_encode(["status" => "saved", "updated_at" => date('Y-m-d H:i:s')]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON payload"]);
    }
    exit();
}
