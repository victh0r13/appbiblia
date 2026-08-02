<#
.SYNOPSIS
    Sobe o app Biblia no emulador Android com um comando so.

.DESCRIPTION
    Idempotente: pode rodar de novo a qualquer momento. Cada etapa checa se o
    que ela produz ja existe e reaproveita em vez de refazer. No fim imprime o
    que subiu agora e o que ja estava de pe.

    Ordem: JDK -> porta 8081 -> emulador -> adb reverse -> Metro -> app.

.PARAMETER Avd
    Nome do AVD. Padrao Pixel_8 (API 37). A outra AVD da maquina e Medium_Tablet.

.PARAMETER Rebuild
    Forca `expo run:android` (Gradle) mesmo com o app ja instalado. Necessario
    depois de mexer em dependencia nativa, plugin, app.json ou icones.

.PARAMETER Clear
    Sobe o Metro com --clear. Necessario depois de mexer no .env: as
    EXPO_PUBLIC_* sao inlined no bundle, entao ficam no cache do transformer.

.EXAMPLE
    .\dev.ps1
    .\dev.ps1 -Rebuild
    .\dev.ps1 -Avd Medium_Tablet
#>
[CmdletBinding()]
param(
    [string]$Avd = 'Pixel_8',
    [switch]$Rebuild,
    [switch]$Clear
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot
$MetroPort   = 8081

# Duas listas so para o relatorio final responder "o que voce fez agora?".
$Novo   = New-Object System.Collections.Generic.List[string]
$Reusou = New-Object System.Collections.Generic.List[string]

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok  ($msg) { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Info($msg) { Write-Host "    --  $msg" -ForegroundColor DarkGray }
function Write-Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }

function Stop-Loud($titulo, $linhas) {
    # Falha que o usuario PRECISA enxergar. Erro discreto aqui vira uma hora de
    # depuracao no lugar errado (ver o caso da porta 8081 abaixo).
    Write-Host ""
    Write-Host ("#" * 72) -ForegroundColor Red
    Write-Host "  $titulo" -ForegroundColor Red
    Write-Host ("#" * 72) -ForegroundColor Red
    foreach ($l in $linhas) { Write-Host "  $l" -ForegroundColor Red }
    Write-Host ""
    exit 1
}

# ---------------------------------------------------------------------------
# 1. Toolchain: JDK 17 fixado na marra
# ---------------------------------------------------------------------------
Write-Step "Toolchain"

# POR QUE fixar em vez de confiar no ambiente: o Android Studio instalado aqui
# traz o JBR 25 em C:\Program Files\Android\Android Studio\jbr. Se ele vencer o
# PATH, o build nativo morre em `configureCMakeDebug` para TODAS as ABIs com
# "IllegalStateException: WARNING: A restricted method in java.lang.System has
# been called" -- mensagem que nao tem nada a ver com a causa real. Hoje o
# JAVA_HOME da maquina ja aponta para o 17, mas isso e estado global que
# qualquer instalador muda sem avisar; o script nao depende disso.
$Jdk17 = 'C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot'
if (-not (Test-Path $Jdk17)) {
    Stop-Loud "JDK 17 nao encontrado" @(
        "Esperado em: $Jdk17",
        "O build nativo NAO funciona com o JBR 25 do Android Studio.",
        "Instale: winget install Microsoft.OpenJDK.17"
    )
}
$env:JAVA_HOME = $Jdk17
$env:Path      = "$Jdk17\bin;$env:Path"
Write-Ok "JAVA_HOME = $Jdk17"

# POR QUE este teste existe mesmo o arquivo nao existindo hoje: quando
# android/gradle/gradle-daemon-jvm.properties existe, o `toolchainVersion` dele
# tem precedencia sobre o JAVA_HOME -- as duas linhas acima viram enfeite e o
# erro de CMake volta sem explicacao. O template do Expo 57 / RN 0.86 nao gera
# esse arquivo (conferido: android/gradle/ so tem wrapper/), mas um upgrade de
# SDK pode passar a gerar. Entao: aviso em vez de surpresa.
$DaemonJvm = Join-Path $ProjectRoot 'android\gradle\gradle-daemon-jvm.properties'
if (Test-Path $DaemonJvm) {
    Write-Warn "android/gradle/gradle-daemon-jvm.properties APARECEU:"
    Get-Content $DaemonJvm | ForEach-Object { Write-Warn "      $_" }
    Write-Warn "Esse arquivo sobrepoe o JAVA_HOME. Se o build quebrar em CMake,"
    Write-Warn "e aqui: garanta toolchainVersion=17 ou apague o arquivo."
}

# O SDK nao esta no lugar padrao do Android Studio; e o Gradle e o `expo
# run:android` leem ANDROID_HOME, nao adivinham.
$Sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path $Sdk)) {
    Stop-Loud "Android SDK nao encontrado" @("Esperado em: $Sdk")
}
$env:ANDROID_HOME     = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
$Adb      = Join-Path $Sdk 'platform-tools\adb.exe'
$Emulator = Join-Path $Sdk 'emulator\emulator.exe'
foreach ($exe in @($Adb, $Emulator)) {
    if (-not (Test-Path $exe)) { Stop-Loud "Ferramenta faltando" @($exe) }
}
Write-Ok "ANDROID_HOME = $Sdk"

# ---------------------------------------------------------------------------
# 2. Porta 8081: reaproveita se for nossa, PARA se for de outro projeto
# ---------------------------------------------------------------------------
Write-Step "Porta $MetroPort (Metro)"

# POR QUE parar em vez de cair para a 8082: existe outro projeto Expo nesta
# maquina (a loja de perfumes) que usa a mesma 8081. Se o Metro subir na 8082
# sem alarde, o `adb reverse tcp:8081` continua apontando para o Metro do OUTRO
# projeto e o app abre carregando o bundle errado -- tela que parece o app certo
# mas com codigo de outro repo. Barulho agora e mais barato que isso.
$MetroJaRodando = $false
$conn = Get-NetTCPConnection -LocalPort $MetroPort -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $ownerPid = ($conn | Select-Object -First 1).OwningProcess
    $cmdline  = $null
    try {
        $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $ownerPid" -ErrorAction Stop).CommandLine
    } catch { }

    # `npx expo start` roda o CLI de node_modules DO PROJETO, entao a linha de
    # comando carrega o caminho da raiz -- e assim da para dizer de quem e o
    # Metro sem matar nada para descobrir.
    if ($cmdline -and $cmdline.ToLower().Contains($ProjectRoot.ToLower())) {
        $MetroJaRodando = $true
        Write-Ok "Metro deste projeto ja esta na $MetroPort (PID $ownerPid)"
        $Reusou.Add("Metro na porta $MetroPort (PID $ownerPid)")
    } else {
        $nome = try { (Get-Process -Id $ownerPid).ProcessName } catch { '?' }
        Stop-Loud "PORTA $MetroPort OCUPADA POR OUTRO PROCESSO" @(
            "PID $ownerPid ($nome)",
            "Linha de comando: $cmdline",
            "",
            "Isto NAO e o Metro deste projeto. Provavelmente e o outro app Expo.",
            "O script para aqui de proposito: subir na 8082 faria o emulador",
            "carregar o bundle do projeto errado, com erro quase invisivel.",
            "",
            "Encerre o outro projeto e rode .\dev.ps1 de novo.",
            "(O script nao mata processo que nao subiu.)"
        )
    }
} else {
    Write-Info "porta livre"
}

# ---------------------------------------------------------------------------
# 3. Emulador: liga se preciso e espera o boot DE VERDADE
# ---------------------------------------------------------------------------
Write-Step "Emulador $Avd"

function Get-EmulatorSerials {
    # Só linhas "emulator-5554  device". Estados "offline"/"unauthorized" nao
    # servem e nao devem ser confundidos com pronto.
    & $Adb devices |
        Select-String -Pattern '^(emulator-\d+)\s+device\s*$' |
        ForEach-Object { $_.Matches[0].Groups[1].Value }
}

function Get-AvdOf($serial) {
    # `adb emu avd name` responde o nome do AVD e depois "OK".
    $out = & $Adb -s $serial emu avd name 2>$null
    if ($out) { return ($out | Select-Object -First 1).Trim() }
    return $null
}

function Find-Serial($avdName) {
    foreach ($s in Get-EmulatorSerials) {
        if ((Get-AvdOf $s) -eq $avdName) { return $s }
    }
    return $null
}

$Serial = Find-Serial $Avd
if ($Serial) {
    Write-Ok "$Avd ja esta ligado ($Serial)"
    $Reusou.Add("Emulador $Avd ($Serial)")
} else {
    $existentes = & $Emulator -list-avds
    if ($existentes -notcontains $Avd) {
        Stop-Loud "AVD '$Avd' nao existe" @("Disponiveis: $($existentes -join ', ')")
    }

    # POR QUE subir o emulador aqui e nao deixar o `expo run:android` fazer:
    # no Windows ele falha com "No Android connected device found" mesmo com o
    # AVD existindo. Ligar antes e checar o boot torna o passo deterministico.
    Write-Info "ligando $Avd ..."
    Start-Process -FilePath $Emulator -ArgumentList @('-avd', $Avd) `
                  -WorkingDirectory (Split-Path $Emulator -Parent) `
                  -WindowStyle Minimized | Out-Null

    # POR QUE nao usar `sleep 30`: o adb lista o device muito antes do Android
    # estar utilizavel. Nessa janela o `pm install` falha com "Package manager
    # has died" / "device offline". sys.boot_completed=1 e o unico sinal que
    # significa "o sistema subiu"; bootanim=stopped confirma que a animacao de
    # boot saiu da tela. Sleep fixo ou trava a toa ou mente.
    $limite = (Get-Date).AddMinutes(5)
    while ((Get-Date) -lt $limite) {
        if (-not $Serial) { $Serial = Find-Serial $Avd }
        if ($Serial) {
            $booted   = (& $Adb -s $Serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()
            $bootanim = (& $Adb -s $Serial shell getprop init.svc.bootanim   2>$null | Out-String).Trim()
            if ($booted -eq '1' -and $bootanim -eq 'stopped') { break }
            Write-Info "aguardando boot (boot_completed='$booted' bootanim='$bootanim')"
        } else {
            Write-Info "aguardando o adb enxergar o emulador"
        }
        Start-Sleep -Seconds 3
    }
    if (-not $Serial) { Stop-Loud "Emulador nao apareceu no adb em 5 min" @("AVD: $Avd") }
    $booted = (& $Adb -s $Serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()
    if ($booted -ne '1') { Stop-Loud "Emulador nao terminou o boot em 5 min" @("Serial: $Serial") }

    Write-Ok "$Avd pronto ($Serial)"
    $Novo.Add("Emulador $Avd ($Serial)")
}

# O applicationId vem do app.json (fonte da verdade do prebuild) em vez de ser
# escrito aqui, para nao divergir se o pacote for renomeado.
$appJson = Get-Content (Join-Path $ProjectRoot 'app.json') -Raw | ConvertFrom-Json
$Pkg = $appJson.expo.android.package
if (-not $Pkg) { Stop-Loud "app.json sem expo.android.package" @("Rode: npx expo prebuild -p android") }

# ---------------------------------------------------------------------------
# 4. adb reverse: sempre recriado
# ---------------------------------------------------------------------------
Write-Step "Tuneis adb reverse"

# POR QUE recriar toda vez sem checar antes: os tuneis vivem no daemon por
# aparelho e somem quando o emulador desliga ou o adb reinicia. Recriar custa
# milissegundos; descobrir que sumiu custa um "Unable to load script".
# Só o 8081 e necessario: nao ha nenhum localhost/10.0.2.2 em src/ -- o
# Supabase e nuvem, e o resto do app e offline-first.
& $Adb -s $Serial reverse --remove-all 2>$null | Out-Null
& $Adb -s $Serial reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
$reverses = & $Adb -s $Serial reverse --list
Write-Ok "tcp:$MetroPort -> tcp:$MetroPort"
foreach ($r in $reverses) { Write-Info $r }

# POR QUE checar quem esta em primeiro plano: o emulador restaura o snapshot de
# quick boot, entao o app aberto na ultima sessao volta sozinho -- e nesta
# maquina isso costuma ser o Le Parfum. O tunel que acabou de ser criado aponta
# a 8081 DESTE projeto para dentro do aparelho, entao um reload naquele app
# carregaria o bundle da Biblia: mesmo sintoma da porta 8081 trocada, so que
# dentro do emulador. Aviso apenas -- matar app de outro projeto nao e trabalho
# deste script, e o passo 6 traz a Biblia para a frente de qualquer jeito.
$fg = & $Adb -s $Serial shell dumpsys activity activities 2>$null |
      Select-String 'topResumedActivity' | Select-Object -First 1
if ($fg -and $fg -match '\s([A-Za-z0-9_.]+)/') {
    $fgPkg = $Matches[1]
    if ($fgPkg -ne $Pkg -and $fgPkg -notlike 'com.android.*' -and $fgPkg -notlike 'com.google.android.*') {
        Write-Warn "app de outro projeto em primeiro plano: $fgPkg"
        Write-Warn "ele agora enxerga o Metro DESTE projeto pela 8081 -- nao recarregue ele"
    }
}

# ---------------------------------------------------------------------------
# 5. Metro em janela separada
# ---------------------------------------------------------------------------
Write-Step "Metro"

# POR QUE nao definimos nenhuma EXPO_PUBLIC_* aqui: o proprio Expo CLI carrega
# o .env ao subir, e esses valores sao INLINED no bundle no momento do build do
# JS -- nao sao lidos em runtime. Definir no script seria uma segunda fonte da
# verdade divergindo do .env. O que importa e a consequencia: trocar o .env
# exige reiniciar o Metro com --clear (use .\dev.ps1 -Clear), senao o
# transformer devolve o bundle antigo com o valor velho.
if (-not (Test-Path (Join-Path $ProjectRoot '.env'))) {
    Write-Info ".env ausente -- Supabase desligado, app roda 100% local (esperado)"
}

if ($MetroJaRodando) {
    if ($Clear) {
        Write-Warn "-Clear pedido, mas o Metro ja esta rodando; feche a janela dele e rode de novo"
    }
    Write-Ok "reaproveitando o Metro que ja estava de pe"
} else {
    $metroCmd = "Set-Location '$ProjectRoot'; " +
                "`$env:ANDROID_HOME='$Sdk'; `$env:JAVA_HOME='$Jdk17'; " +
                "npx expo start --port $MetroPort"
    if ($Clear) { $metroCmd += ' --clear' }

    Start-Process powershell -ArgumentList @('-NoExit', '-Command', $metroCmd) | Out-Null
    Write-Info "janela do Metro aberta, aguardando ficar pronto ..."

    # Espera o dev server responder antes de instalar/abrir o app: se o app
    # abrir primeiro, ele bate num Metro que ainda nao aceita conexao e mostra
    # a tela vermelha de "Could not connect to development server".
    $pronto = $false
    $limite = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $limite) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$MetroPort/status" -UseBasicParsing -TimeoutSec 3
            # O /status do Metro nao manda charset no Content-Type, e nesse caso
            # o -UseBasicParsing entrega .Content como byte[], nao string. Sem
            # decodificar, o -match compara com "112 97 99 107 97" e nunca casa:
            # o Metro sobe normalmente e o script fica esperando para sempre.
            $corpo = $r.Content
            if ($corpo -is [byte[]]) { $corpo = [System.Text.Encoding]::UTF8.GetString($corpo) }
            if ($corpo -match 'packager-status:running') { $pronto = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    if (-not $pronto) { Stop-Loud "Metro nao respondeu em /status" @("Veja a janela do Metro para o erro real.") }

    Write-Ok "Metro respondendo na $MetroPort"
    $Novo.Add("Metro na porta $MetroPort (janela separada)")
}

# ---------------------------------------------------------------------------
# 6. App: instala/compila so quando precisa
# ---------------------------------------------------------------------------
Write-Step "App"

$instalado =(& $Adb -s $Serial shell pm list packages $Pkg 2>$null | Out-String).Contains($Pkg)

# POR QUE o caminho rapido: Gradle leva minutos e nao e necessario para mexer em
# JS/TS -- isso o Metro entrega sozinho. Recompilar a cada `.\dev.ps1` puniria o
# uso normal. Gradle so entra quando o APK nao existe no aparelho, ou com
# -Rebuild (dependencia nativa, plugin, app.json, icone).
if ($instalado -and -not $Rebuild) {
    Write-Ok "$Pkg ja instalado -- pulando Gradle (use -Rebuild se mexeu em nativo)"
    # POR QUE `am start` e nao `monkey`: o monkey escreve o dump dos proprios
    # argumentos em stderr, e no PowerShell 5.1 stderr de executavel nativo vira
    # NativeCommandError -- que com $ErrorActionPreference='Stop' MATA o script
    # bem no ultimo passo, depois de tudo ter dado certo. Redirecionar (2>$null)
    # nao resolve: e a propria captura que gera o ErrorRecord. O `am start` so
    # escreve em stdout. A activity vem do manifesto instalado em vez de
    # ".MainActivity" fixo, para nao quebrar se o template do Expo mudar.
    $componente = & $Adb -s $Serial shell cmd package resolve-activity --brief `
                       -c android.intent.category.LAUNCHER $Pkg | Select-Object -Last 1

    # O `am start` avisa em stderr quando o app JA esta em primeiro plano --
    # situacao normal aqui, nao erro. Soltar o ErrorActionPreference so nesta
    # linha permite descartar esse ruido sem que a captura vire NativeCommandError.
    $eapAntigo = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $Adb -s $Serial shell am start -n $componente.Trim() 2>&1 | Out-Null
    $ErrorActionPreference = $eapAntigo
    Write-Ok "app aberto"
    $Reusou.Add("APK $Pkg (ja instalado)")
    $Novo.Add("App aberto no emulador")
} else {
    if ($Rebuild) { Write-Info "-Rebuild pedido" } else { Write-Info "$Pkg nao esta instalado" }
    Write-Info "compilando com Gradle (a primeira vez demora varios minutos) ..."

    # --no-bundler porque o Metro ja subiu no passo 5; sem essa flag o
    # run:android tenta abrir um SEGUNDO bundler e esbarra na 8081 ocupada.
    #
    # -d recebe o NOME DO AVD, nao o serial do adb: passar "emulator-5554" faz o
    # CLI morrer com "Could not find device with name: emulator-5554". O adb
    # trabalha por serial, o Expo CLI por nome -- os dois convivem no script.
    & npx expo run:android --no-bundler -d $Avd
    if ($LASTEXITCODE -ne 0) {
        Stop-Loud "Build do Gradle falhou (exit $LASTEXITCODE)" @(
            "Se o erro citar configureCMakeDebug / restricted method in java.lang.System,",
            "e JDK errado: confira JAVA_HOME e gradle-daemon-jvm.properties."
        )
    }
    Write-Ok "app compilado, instalado e aberto"
    $Novo.Add("APK $Pkg compilado e instalado")
    $Novo.Add("App aberto no emulador")
}

# ---------------------------------------------------------------------------
# 7. Relatorio
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host ("=" * 72) -ForegroundColor Cyan
Write-Host "  Pronto -- Biblia rodando em $Avd ($Serial)" -ForegroundColor Cyan
Write-Host ("=" * 72) -ForegroundColor Cyan

Write-Host "`n  Subiu agora:" -ForegroundColor Green
if ($Novo.Count -eq 0) { Write-Host "    (nada)" -ForegroundColor DarkGray }
foreach ($i in $Novo) { Write-Host "    + $i" -ForegroundColor Green }

Write-Host "`n  Ja estava rodando:" -ForegroundColor Yellow
if ($Reusou.Count -eq 0) { Write-Host "    (nada)" -ForegroundColor DarkGray }
foreach ($i in $Reusou) { Write-Host "    = $i" -ForegroundColor Yellow }

Write-Host "`n  Metro:   http://127.0.0.1:$MetroPort  (janela separada)"
Write-Host "  Pacote:  $Pkg"
Write-Host "  Recarregar JS: salve o arquivo, ou 'r' na janela do Metro"
Write-Host "  Mexeu em nativo/app.json: .\dev.ps1 -Rebuild"
Write-Host "  Mexeu no .env:            feche o Metro e .\dev.ps1 -Clear"
Write-Host ""
