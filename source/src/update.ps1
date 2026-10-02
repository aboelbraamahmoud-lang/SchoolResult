param([string]$SourceDirectory = (Join-Path $PSScriptRoot 'تحديث'))
$ErrorActionPreference = 'Stop'
$TargetDirectory = $PSScriptRoot
$AllowedNames = @('app.js', 'style.css', 'version.json', 'index.html', 'supabase.js')
$BackupDirectory = $null
$Touched = @()
$ExistingNames = @{}
function Convert-VersionParts([string]$Value) {
    if ($Value -notmatch '^(\d+)\.(\d+)\.(\d+)$') { throw ('رقم إصدار غير صالح: ' + $Value) }
    return @([int]$Matches[1], [int]$Matches[2], [int]$Matches[3])
}
function Compare-SemVer([string]$Left, [string]$Right) {
    $A = Convert-VersionParts $Left
    $B = Convert-VersionParts $Right
    for ($i = 0; $i -lt 3; $i++) {
        if ($A[$i] -lt $B[$i]) { return -1 }
        if ($A[$i] -gt $B[$i]) { return 1 }
    }
    return 0
}
try {
    $SourceDirectory = (Resolve-Path -LiteralPath $SourceDirectory).Path
    if ($SourceDirectory -eq $TargetDirectory) { throw 'اختر مجلد التحديث، وليس مجلد البرنامج نفسه.' }
    $ManifestPath = Join-Path $SourceDirectory 'update-manifest.json'
    if (!(Test-Path -LiteralPath $ManifestPath -PathType Leaf)) { throw 'ملف التحقق update-manifest.json غير موجود. لم تُعدّل ملفات البرنامج.' }
    $Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($Manifest.product -ne 'School Results Cloud' -or !$Manifest.version) { throw 'بيانات حزمة التحديث غير صالحة.' }
    $Entries = @($Manifest.files)
    if ($Entries.Count -ne $AllowedNames.Count) { throw 'يلزم تحديث ملفات الواجهة الخمسة معًا، بما فيها index.html وsupabase.js.' }
    $Seen = @{}
    foreach ($Entry in $Entries) {
        if ($AllowedNames -notcontains $Entry.name -or $Seen.ContainsKey($Entry.name)) { throw 'اسم ملف غير مسموح به أو مكرر في حزمة التحديث.' }
        $Seen[$Entry.name] = $true
        $FilePath = Join-Path $SourceDirectory $Entry.name
        if (!(Test-Path -LiteralPath $FilePath -PathType Leaf) -or $Entry.sha256 -notmatch '^[a-fA-F0-9]{64}$') { throw ('ملف ناقص أو بصمة غير صالحة: ' + $Entry.name) }
        if ((Get-FileHash -LiteralPath $FilePath -Algorithm SHA256).Hash -ne $Entry.sha256) { throw ('فشل التحقق من سلامة الملف: ' + $Entry.name) }
    }
    $Version = Get-Content -LiteralPath (Join-Path $SourceDirectory 'version.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($Version.version -ne $Manifest.version) { throw 'رقم الإصدار لا يطابق حزمة التحديث.' }
    $CurrentVersionPath = Join-Path $TargetDirectory 'version.json'
    if (Test-Path -LiteralPath $CurrentVersionPath -PathType Leaf) {
        $CurrentVersion = Get-Content -LiteralPath $CurrentVersionPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($CurrentVersion.version -and (Compare-SemVer $Manifest.version $CurrentVersion.version) -lt 0) {
            throw ('رُفض الرجوع إلى إصدار أقدم: الحالي ' + $CurrentVersion.version + ' والحزمة ' + $Manifest.version)
        }
    }
    Write-Host ('تم التحقق من حزمة الإصدار ' + $Manifest.version)
    Write-Host 'أغلق نوافذ البرنامج، واحتفظ بنسخة JSON قبل متابعة التحديث.'
    $Answer = Read-Host 'اكتب YES لتطبيق التحديث، أو اضغط Enter للإلغاء'
    if ($Answer -cne 'YES') { Write-Host 'أُلغي التحديث دون تعديل الملفات.'; exit 0 }
    $BackupDirectory = Join-Path $TargetDirectory ('نسخة-قبل-التحديث-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    New-Item -ItemType Directory -Path $BackupDirectory | Out-Null
    foreach ($Name in $AllowedNames) {
        $CurrentPath = Join-Path $TargetDirectory $Name
        $ExistingNames[$Name] = Test-Path -LiteralPath $CurrentPath -PathType Leaf
        if ($ExistingNames[$Name]) { Copy-Item -LiteralPath $CurrentPath -Destination (Join-Path $BackupDirectory $Name) -Force }
    }
    # Record a destination before copying so rollback covers partial-copy failures too.
    foreach ($Entry in $Entries) {
        $Touched += $Entry.name
        Copy-Item -LiteralPath (Join-Path $SourceDirectory $Entry.name) -Destination (Join-Path $TargetDirectory $Entry.name) -Force
        if ((Get-FileHash -LiteralPath (Join-Path $TargetDirectory $Entry.name) -Algorithm SHA256).Hash -ne $Entry.sha256) { throw ('لم يكتمل نسخ الملف: ' + $Entry.name) }
    }
    Write-Host ('اكتمل التحديث. النسخة السابقة: ' + $BackupDirectory)
    Write-Host 'افتح index.html في المتصفح نفسه، ثم اضغط Ctrl+F5.'
    exit 0
} catch {
    $Failure = $_.Exception.Message
    $RollbackErrors = @()
    foreach ($Name in $Touched) {
        try {
            if ($ExistingNames[$Name]) { Copy-Item -LiteralPath (Join-Path $BackupDirectory $Name) -Destination (Join-Path $TargetDirectory $Name) -Force }
            elseif (Test-Path -LiteralPath (Join-Path $TargetDirectory $Name)) { Remove-Item -LiteralPath (Join-Path $TargetDirectory $Name) -Force }
        } catch { $RollbackErrors += $Name }
    }
    Write-Host ('لم يكتمل التحديث: ' + $Failure) -ForegroundColor Red
    if ($Touched.Count -gt 0 -and $RollbackErrors.Count -eq 0) { Write-Host 'أُعيدت ملفات الإصدار السابق.' }
    if ($RollbackErrors.Count -gt 0) { Write-Host ('تعذر إرجاع بعض الملفات؛ استعدها يدويًا من: ' + $BackupDirectory) -ForegroundColor Red }
    exit 1
}
