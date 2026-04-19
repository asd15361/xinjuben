$ErrorActionPreference = 'Stop'

$repo = 'D:\project\xinjuben'
$server = Join-Path $repo 'server'
$evidenceDir = Join-Path $server 'test-evidence'
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $evidenceDir "stage6-server-$stamp.log"
$stderr = Join-Path $evidenceDir "stage6-server-$stamp.err.log"
$jsonFile = Join-Path $evidenceDir "stage6-run-$stamp.json"

$proc = Start-Process `
  -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList @(
    '--require',
    "$server\node_modules\tsx\dist\preflight.cjs",
    '--import',
    'file:///D:/project/xinjuben/server/node_modules/tsx/dist/loader.mjs',
    'src/index.ts'
  ) `
  -WorkingDirectory $server `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
      $health = Invoke-RestMethod -Uri 'http://localhost:3001/health' -TimeoutSec 3
      if ($health.status -eq 'ok') {
        $ready = $true
        break
      }
    } catch {
    }
  }

  if (-not $ready) {
    throw 'server_not_ready'
  }

  $suffix = Get-Date -Format 'HHmmss'
  $email = "stage6-$suffix@example.com"
  $password = 'Stage6User123!'
  $base = 'http://localhost:3001'

  $register = Invoke-RestMethod `
    -Method POST `
    -Uri "$base/api/auth/register" `
    -ContentType 'application/json' `
    -Body (@{
      email = $email
      password = $password
      passwordConfirm = $password
      name = 'Stage6 Test User'
    } | ConvertTo-Json)

  $token = $register.token
  $headers = @{ Authorization = "Bearer $token" }

  $project = Invoke-RestMethod `
    -Method POST `
    -Uri "$base/api/projects" `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{
      name = '守钥人'
      workflowType = 'ai_write'
      genre = '悬疑奇幻短剧'
    } | ConvertTo-Json)

  $projectId = $project.project.id

  $storyIntent = @{
    title = '守钥人'
    genre = '悬疑奇幻短剧'
    theme = '记忆、代价、信任'
    protagonist = '陆烬'
    antagonist = '韩枭'
    coreConflict = '陆烬为阻止韩枭打开会吞噬全城记忆的古钥机关，被迫在守护真相与牺牲亲密关系之间做选择。'
    sellingPremise = '失忆修复师陆烬发现自己是最后一代守钥人，而韩枭要利用古钥改写全城过去。'
    generationBriefText = @'
【项目】
《守钥人》

【主角】
陆烬，失忆修复师，表面冷静克制，内里执拗。

【对手】
韩枭，旧守钥组织叛徒，想用古钥重写历史。

【角色卡】
- 陆烬：男主，守钥人继承者。
- 韩枭：反派，旧组织叛徒。
- 沈昭宁：女主，档案馆修复师，陆烬情感锚点。
- 顾北辰：城防署顾问，立场游移。
- 白素问：旧组织医师，知道上一代真相。

【人物分层】
核心人物围绕陆烬、韩枭、沈昭宁展开，中层人物承担组织冲突与卧底反转。

【世界】
临川城存在能封存与改写群体记忆的古钥系统，守钥人负责维持秩序。

【主题】
当真相会伤人时，守护记忆是否仍值得。
'@
    shortDramaConstitution = @{
      worldViewBrief = '临川城由守钥组织长期维护记忆秩序，古钥能修补也能篡改群体记忆，各派势力都想争夺控制权。'
    }
  }

  Invoke-RestMethod `
    -Method POST `
    -Uri "$base/api/projects/$projectId/story-intent" `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ storyIntent = $storyIntent } | ConvertTo-Json -Depth 20) | Out-Null

  $outlineDraft = @{
    title = '守钥人'
    genre = '悬疑奇幻短剧'
    theme = '记忆、代价、信任'
    protagonist = '陆烬'
    mainConflict = '陆烬与韩枭围绕古钥控制权展开对抗。'
    summary = '全剧围绕守钥人传承与记忆战争展开。'
    summaryEpisodes = @(
      @{ episodeNo = 1; summary = '陆烬卷入古钥异动。' },
      @{ episodeNo = 2; summary = '韩枭现身试探。' },
      @{ episodeNo = 3; summary = '沈昭宁发现档案异常。' },
      @{ episodeNo = 4; summary = '旧组织分裂浮出水面。' },
      @{ episodeNo = 5; summary = '陆烬首次失守。' },
      @{ episodeNo = 6; summary = '韩枭推进改写计划。' },
      @{ episodeNo = 7; summary = '卧底身份暴露。' },
      @{ episodeNo = 8; summary = '陆烬逼近真相。' },
      @{ episodeNo = 9; summary = '古钥争夺全面爆发。' },
      @{ episodeNo = 10; summary = '陆烬做最终选择。' }
    )
    outlineBlocks = @(
      @{
        blockNo = 1
        label = '全剧'
        startEpisode = 1
        endEpisode = 10
        sectionTitle = '全剧'
        episodes = @()
        sevenQuestions = $null
      }
    )
    facts = @()
  }

  Invoke-RestMethod `
    -Method POST `
    -Uri "$base/api/projects/$projectId/outline" `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ outlineDraft = $outlineDraft } | ConvertTo-Json -Depth 20) | Out-Null

  $sevenQuestions = @{
    needsSections = $false
    sectionCount = 1
    sections = @(
      @{
        sectionTitle = '全剧'
        startEpisode = 1
        endEpisode = 10
        sevenQuestions = @{
          goal = '陆烬要阻止韩枭开启古钥并守住临川城真实记忆。'
          obstacle = '韩枭掌握旧组织黑历史，还能操控多方势力与卧底。'
          effort = '陆烬联合沈昭宁调查档案、修复记忆碎片并反查内鬼。'
          result = '调查逼出旧守钥组织裂痕，也让陆烬越来越接近自身身世。'
          twist = '陆烬发现自己童年的记忆也是被古钥改写过的。'
          turnaround = '他决定用自己作为诱饵逼韩枭提前开局。'
          ending = '陆烬保住城市记忆，但必须接受一段最珍贵关系被永久改写。'
        }
      }
    )
  }

  Invoke-RestMethod `
    -Method POST `
    -Uri "$base/api/projects/$projectId/seven-questions/confirm" `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ sevenQuestions = $sevenQuestions } | ConvertTo-Json -Depth 20) | Out-Null

  $creditsBefore = Invoke-RestMethod -Method GET -Uri "$base/api/credits/balance" -Headers $headers
  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  $generationResponse = Invoke-WebRequest `
    -Method POST `
    -Uri "$base/api/generate/outline-and-characters" `
    -Headers $headers `
    -ContentType 'application/json' `
    -Body (@{ projectId = $projectId } | ConvertTo-Json) `
    -SkipHttpErrorCheck
  $timer.Stop()
  $creditsAfter = Invoke-RestMethod -Method GET -Uri "$base/api/credits/balance" -Headers $headers

  $parsedResponse = $null
  if ($generationResponse.Content) {
    try {
      $parsedResponse = $generationResponse.Content | ConvertFrom-Json -ErrorAction Stop
    } catch {
      $parsedResponse = $null
    }
  }

  $summary = [pscustomobject]@{
    email = $email
    projectId = $projectId
    elapsedMs = $timer.ElapsedMilliseconds
    creditsBefore = $creditsBefore
    creditsAfter = $creditsAfter
    statusCode = [int]$generationResponse.StatusCode
    responseBody = $parsedResponse
    rawResponse = $generationResponse.Content
    stdoutLog = $stdout
    stderrLog = $stderr
  }

  $summary | ConvertTo-Json -Depth 30 | Set-Content -Path $jsonFile -Encoding utf8

  Get-Content -Path $jsonFile
  '---STDOUT---'
  Get-Content -Path $stdout
  '---STDERR---'
  if (Test-Path $stderr) {
    Get-Content -Path $stderr
  }
}
finally {
  if (-not $proc.HasExited) {
    Stop-Process -Id $proc.Id -Force
  }
}
