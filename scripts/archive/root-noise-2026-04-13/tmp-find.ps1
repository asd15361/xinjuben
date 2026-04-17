$content = Get-Content 'D:\project\xinjuben\src\main\application\script-generation\prompt\create-script-generation-prompt.ts' -Raw
$idx = $content.IndexOf("if (storyContract.requirements.requireRelationshipShift)")
if ($idx -ge 0) {
    Write-Host "Found at" $idx ":" $content.Substring($idx, 300)
} else {
    Write-Host "Not found, searching..."
    $idx2 = $content.IndexOf("storyContract.requirements")
    if ($idx2 -ge 0) {
        Write-Host "Found 'storyContract.requirements' at" $idx2 ":" $content.Substring($idx2, 200)
    }
}
