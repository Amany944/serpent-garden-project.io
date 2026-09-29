<?php

declare(strict_types=1);

function snake_db(): PDO
{
    $dataDir = __DIR__ . '/../data';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }

    $dbPath = $dataDir . '/snake.sqlite';
    $pdo = new PDO('sqlite:' . $dbPath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS game_stats (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            last_score INTEGER NOT NULL DEFAULT 0,
            previous_score INTEGER NOT NULL DEFAULT 0,
            best_score INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS game_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            score INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );

    $stmt = $pdo->prepare('INSERT OR IGNORE INTO game_stats (id, last_score, previous_score, best_score) VALUES (1, 0, 0, 0)');
    $stmt->execute();

    return $pdo;
}

function snake_stats(PDO $pdo): array
{
    $stats = $pdo->query('SELECT last_score, previous_score, best_score, updated_at FROM game_stats WHERE id = 1')->fetch() ?: [
        'last_score' => 0,
        'previous_score' => 0,
        'best_score' => 0,
        'updated_at' => null,
    ];

    $recent = $pdo->query('SELECT score, created_at FROM game_scores ORDER BY id DESC LIMIT 10')->fetchAll();

    return [
        'stats' => [
            'last_score' => (int) $stats['last_score'],
            'previous_score' => (int) $stats['previous_score'],
            'best_score' => (int) $stats['best_score'],
            'updated_at' => $stats['updated_at'],
        ],
        'recent_scores' => array_map(static function (array $row): array {
            return [
                'score' => (int) $row['score'],
                'created_at' => $row['created_at'],
            ];
        }, $recent),
    ];
}
