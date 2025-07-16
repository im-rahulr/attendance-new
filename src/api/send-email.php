<?php
/**
 * Email Sending API
 * Handles actual email delivery using PHPMailer with Gmail SMTP
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

// Check if PHPMailer is available
$phpmailer_available = false;
if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    $phpmailer_available = true;
} else {
    // Try to include PHPMailer manually if composer autoload fails
    $phpmailer_paths = [
        __DIR__ . '/vendor/autoload.php',
        __DIR__ . '/../../vendor/autoload.php',
        __DIR__ . '/../../../vendor/autoload.php'
    ];

    foreach ($phpmailer_paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                $phpmailer_available = true;
                break;
            }
        }
    }
}

// Only include PHPMailer classes if available
if ($phpmailer_available) {
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\SMTP;
    use PHPMailer\PHPMailer\Exception;
}

// Email configuration - Use environment variables if available
$EMAIL_CONFIG = [
    'smtp_host' => $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com',
    'smtp_port' => $_ENV['SMTP_PORT'] ?? 587,
    'smtp_secure' => PHPMailer::ENCRYPTION_STARTTLS,
    'smtp_auth' => true,
    'username' => $_ENV['EMAIL_USER'] ?? 'website.po45@gmail.com',
    'password' => $_ENV['EMAIL_PASS'] ?? 'usil vuzn wbep nili', // App password
    'from_email' => $_ENV['EMAIL_USER'] ?? 'website.po45@gmail.com',
    'from_name' => $_ENV['FROM_NAME'] ?? 'lowrybunks Team',
    'admin_email' => $_ENV['ADMIN_EMAIL'] ?? 'rahulhitwo@gmail.com' // Admin notification email
];

/**
 * Validate email data
 */
function validateEmailData($data) {
    $errors = [];
    
    if (empty($data['to_email']) || !filter_var($data['to_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Valid recipient email is required';
    }
    
    if (empty($data['subject'])) {
        $errors[] = 'Email subject is required';
    }
    
    if (empty($data['html_content']) && empty($data['text_content'])) {
        $errors[] = 'Email content is required';
    }
    
    return [
        'valid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * Send email using PHP's built-in mail function (fallback)
 */
function sendEmailFallback($emailData, $config) {
    try {
        $to = $emailData['to_email'];
        $subject = $emailData['subject'];
        $message = $emailData['html_content'];

        // Set headers for HTML email
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: ' . ($emailData['from_name'] ?? $config['from_name']) . ' <' . $config['from_email'] . '>',
            'Reply-To: ' . $config['from_email'],
            'X-Mailer: PHP/' . phpversion()
        ];

        $result = mail($to, $subject, $message, implode("\r\n", $headers));

        if ($result) {
            return [
                'success' => true,
                'message' => 'Email sent successfully (PHP mail)',
                'messageId' => 'php_mail_' . time() . '_' . uniqid(),
                'deliveredAt' => date('c'),
                'deliveryStatus' => 'delivered',
                'provider' => 'PHP Mail'
            ];
        } else {
            return [
                'success' => false,
                'error' => 'PHP mail function failed',
                'deliveryStatus' => 'failed'
            ];
        }

    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'PHP mail error: ' . $e->getMessage(),
            'deliveryStatus' => 'error'
        ];
    }
}

/**
 * Send email using PHPMailer
 */
function sendEmail($emailData, $config) {
    global $phpmailer_available;

    // Use fallback if PHPMailer is not available
    if (!$phpmailer_available) {
        return sendEmailFallback($emailData, $config);
    }

    $mail = new PHPMailer(true);
    
    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->SMTPAuth = $config['smtp_auth'];
        $mail->Username = $config['username'];
        $mail->Password = $config['password'];
        $mail->SMTPSecure = $config['smtp_secure'];
        $mail->Port = $config['smtp_port'];
        
        // Enable verbose debug output (remove in production)
        $mail->SMTPDebug = SMTP::DEBUG_OFF; // Change to DEBUG_SERVER for debugging
        
        // Recipients
        $mail->setFrom($config['from_email'], $emailData['from_name'] ?? $config['from_name']);
        $mail->addAddress($emailData['to_email'], $emailData['to_name'] ?? '');
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = $emailData['subject'];
        $mail->Body = $emailData['html_content'];
        
        // Add plain text version if provided
        if (!empty($emailData['text_content'])) {
            $mail->AltBody = $emailData['text_content'];
        }
        
        // Send the email
        $result = $mail->send();
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Email sent successfully',
                'messageId' => $mail->getLastMessageID() ?: 'msg_' . time() . '_' . uniqid(),
                'deliveredAt' => date('c'),
                'deliveryStatus' => 'delivered',
                'provider' => 'Gmail SMTP'
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to send email',
                'deliveryStatus' => 'failed'
            ];
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Email sending failed: ' . $e->getMessage(),
            'deliveryStatus' => 'error'
        ];
    }
}

/**
 * Log email attempt to file (backup logging)
 */
function logEmailAttempt($emailData, $result) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logFile = $logDir . '/email_log_' . date('Y-m-d') . '.txt';
    $logEntry = [
        'timestamp' => date('c'),
        'to_email' => $emailData['to_email'],
        'subject' => $emailData['subject'],
        'success' => $result['success'],
        'error' => $result['error'] ?? null,
        'messageId' => $result['messageId'] ?? null
    ];
    
    file_put_contents($logFile, json_encode($logEntry) . "\n", FILE_APPEND | LOCK_EX);
}

// Main execution
try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $emailData = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input');
    }
    
    // Validate email data
    $validation = validateEmailData($emailData);
    if (!$validation['valid']) {
        echo json_encode([
            'success' => false,
            'error' => 'Validation failed: ' . implode(', ', $validation['errors'])
        ]);
        exit();
    }
    
    // Send email
    $result = sendEmail($emailData, $EMAIL_CONFIG);
    
    // Log the attempt
    logEmailAttempt($emailData, $result);
    
    // Return result
    echo json_encode($result);
    
} catch (Exception $e) {
    $errorResult = [
        'success' => false,
        'error' => $e->getMessage(),
        'deliveryStatus' => 'error'
    ];
    
    // Log error attempt if email data is available
    if (isset($emailData)) {
        logEmailAttempt($emailData, $errorResult);
    }
    
    echo json_encode($errorResult);
}
?>
