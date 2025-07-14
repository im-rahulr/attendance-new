<?php
require __DIR__ . '/vendor/autoload.php';
use Google\Cloud\Firestore\FirestoreClient;

header('Content-Type: application/json');

try {
    $db = new FirestoreClient([
        'projectId' => 'attendance-a9a19',
    ]);
    $usersRef = $db->collection('users');
    $users = $usersRef->documents();
    $result = [];
    foreach ($users as $user) {
        $data = $user->data();
        $attendance = $data['attendanceData']['subjects'] ?? [];
        $present = 0;
        $absent = 0;
        foreach ($attendance as $subject) {
            $present += $subject['present'] ?? 0;
            $absent += $subject['absent'] ?? 0;
        }
        $total = $present + $absent;
        $percent = $total > 0 ? round(($present / $total) * 100) : 0;
        $result[] = [
            'name' => $data['name'] ?? 'User',
            'email' => $data['email'] ?? '',
            'attendancePercent' => $percent
        ];
    }
    echo json_encode(['success' => true, 'users' => $result]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
} 