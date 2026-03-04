#!/usr/bin/env php
<?php
declare(strict_types=1);

if ($argc < 3) {
    fwrite(STDERR, "Usage: file_from_env.php ENV_VAR PATH_TO_FILE\n");
    exit(1);
}

$envVar = $argv[1];
$targetPath = $argv[2];
$content = getenv($envVar);

if ($content === false || $content === '') {
    fwrite(STDERR, "Environment variable '{$envVar}' is empty\n");
    exit(1);
}

$targetDir = dirname($targetPath);
if (!is_dir($targetDir) && !mkdir($targetDir, 0700, true) && !is_dir($targetDir)) {
    fwrite(STDERR, "Unable to create target directory '{$targetDir}'\n");
    exit(1);
}

if (file_put_contents($targetPath, $content) === false) {
    fwrite(STDERR, "Unable to write file '{$targetPath}'\n");
    exit(1);
}

echo "Wrote {$envVar} to {$targetPath}\n";
