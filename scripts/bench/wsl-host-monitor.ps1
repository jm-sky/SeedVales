# Host-side monitor for WSL GPU benches (run from Windows PowerShell, NOT inside WSL, so it survives a VM death).
# Usage: powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu-20.04\home\madeyskij\projects\private\SeedVales\scripts\bench\wsl-host-monitor.ps1
# Log: %TEMP%\svmon.csv, one row / 2 s. After a crash the LAST row is the host state right before the VM died.
# Event check afterwards: Get-WinEvent -FilterHashtable @{LogName='System';StartTime=(Get-Date).AddHours(-2)} (look for dxgkrnl, Display 4101, WHEA, Hyper-V, Kernel-Power).
$log = Join-Path $env:TEMP 'svmon.csv'
'ts,hostFreeMB,commitUsedMB,vmmemMB,gpuSharedMB,gpuCommittedMB' | Out-File $log -Encoding ascii
while ($true) {
  $os = Get-CimInstance Win32_OperatingSystem
  $vm = (Get-Process -Name vmmem* -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum / 1MB
  $g = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory
  '{0:HH:mm:ss},{1:N0},{2:N0},{3:N0},{4:N0},{5:N0}' -f (Get-Date), ($os.FreePhysicalMemory / 1KB), (($os.TotalVirtualMemorySize - $os.FreeVirtualMemory) / 1KB),
    $vm, (($g | Measure-Object SharedUsage -Sum).Sum / 1MB), (($g | Measure-Object TotalCommitted -Sum).Sum / 1MB) | Out-File $log -Append -Encoding ascii
  Start-Sleep -Seconds 2
}
