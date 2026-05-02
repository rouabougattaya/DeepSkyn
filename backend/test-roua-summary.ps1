#!/usr/bin/env pwsh
# Test Roua's 7 modules and display summary

$files = @(
  "users.service.spec",
  "skin-metric.service.spec",
  "admin.service.spec",
  "admin.controller.spec",
  "metrics.service.spec",
  "metrics.controller.spec",
  "email-security.service.spec"
)

$totalTests = 0
$totalPassed = 0
$totalFailed = 0

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ROUA'S TEST SUITE SUMMARY" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

foreach ($file in $files) {
  Write-Host ""
  Write-Host "Testing: $file" -ForegroundColor Green
  $output = npm test -- "$file" --no-coverage 2>&1 | Out-String
  
  if ($output -match "Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed") {
    $failed = [int]$matches[1]
    $passed = [int]$matches[2]
    $total = $failed + $passed
    Write-Host "  Result: $passed/$total ✓" -ForegroundColor Green
    
    $totalTests += $total
    $totalPassed += $passed
    $totalFailed += $failed
  } elseif ($output -match "Tests:\s+(\d+)\s+passed") {
    $passed = [int]$matches[1]
    Write-Host "  Result: $passed/$passed ✓" -ForegroundColor Green
    
    $totalTests += $passed
    $totalPassed += $passed
  }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "OVERALL: $totalPassed/$totalTests tests passed" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
