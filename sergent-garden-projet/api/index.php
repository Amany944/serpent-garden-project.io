<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/db.php';

$pdo = null;

try {
    $pdo = snake_db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'stats';

        if ($action !== 'stats') {
            http_response_code(400);
            echo json_encode(['error' => 'Action inconnue.'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        echo json_encode(snake_stats($pdo), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'POST') {
        $rawBody = file_get_contents('php://input');
        if ($rawBody !== '' && $rawBody !== null) {
            try {
                $payload = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException $exception) {
                http_response_code(400);
                echo json_encode(['error' => 'JSON invalide.'], JSON_UNESCAPED_UNICODE);
                exit;
            }
        } else {
            $payload = [];
        }

        $score = isset($payload['score']) && is_numeric($payload['score']) ? (int) $payload['score'] : 0;

        if ($score < 0) {
            $score = 0;
        }

        $pdo->beginTransaction();

        $current = $pdo->query('SELECT last_score, previous_score, best_score FROM game_stats WHERE id = 1')->fetch();
        $previousScore = (int) ($current['last_score'] ?? 0);
        $bestScore = (int) ($current['best_score'] ?? 0);
        $isNewRecord = $score > $bestScore;
        $newBest = max($bestScore, $score);

        $stmt = $pdo->prepare('INSERT INTO game_scores (score) VALUES (:score)');
        $stmt->execute([':score' => $score]);

        $update = $pdo->prepare(
            'UPDATE game_stats
             SET previous_score = :previous_score,
                 last_score = :last_score,
                 best_score = :best_score,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = 1'
        );
        $update->execute([
            ':previous_score' => $previousScore,
            ':last_score' => $score,
            ':best_score' => $newBest,
        ]);

        $pdo->commit();

        $stats = snake_stats($pdo);
        echo json_encode([
            'ok' => true,
            'is_new_record' => $isNewRecord,
            'stats' => $stats['stats'],
            'recent_scores' => $stats['recent_scores'],
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Methode non autorisee.'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $exception) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur serveur.',
        'details' => $exception->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
