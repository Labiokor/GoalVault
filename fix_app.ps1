$path = "c:\Users\sesi\OneDrive\Desktop\goal_vault\ffrontend\app.js"
$content = Get-Content $path
# Find the index of the first occurrence of the notifications marker
$marker = "// ============================================================"
$index = -1
for ($i = 0; $i -lt $content.Count; $i++) {
    if ($content[$i] -match "// NOTIFICATIONS PAGE") {
        $index = $i
        break
    }
}

if ($index -gt 0) {
    # The separator line is usually 1 line above
    $keepIndex = $index - 1
    $base = $content[0..($keepIndex-1)]
    $logic = Get-Content "c:\Users\sesi\.gemini\antigravity\brain\6887f2ee-b711-48eb-ba21-44ba2bba89b9\scratch\notif_logic.js.txt"
    $newContent = $base + $logic
    $newContent | Set-Content $path
    Write-Host "File fixed successfully at index $keepIndex"
} else {
    Write-Host "Marker not found"
}
