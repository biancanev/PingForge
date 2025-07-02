param(
    [string]$SessionId = "11610a00",
    [int]$TotalRequests = 50,
    [int]$DelayMs = 200
)

# Configuration
$baseUrl = "http://127.0.0.1:8000/hooks/$SessionId"
$methods = @("GET", "POST", "PUT", "DELETE", "PATCH")
$contentTypes = @("application/json", "application/xml", "text/plain", "application/x-www-form-urlencoded")
$userAgents = @(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "PostmanRuntime/7.32.3",
    "curl/7.68.0",
    "GitHub-Hookshot/abc123",
    "Stripe/1.0 (+https://stripe.com/docs/webhooks)",
    "Shopify/1.0"
)

# Sample data templates
$samplePayloads = @{
    "user_signup" = @{
        event = "user.signup"
        user_id = (Get-Random -Maximum 10000)
        email = "user$(Get-Random -Maximum 1000)@example.com"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        source = "web"
        metadata = @{
            ip_address = "192.168.1.$((Get-Random -Maximum 255))"
            user_agent = "Chrome/91.0"
        }
    }
    "payment_completed" = @{
        event = "payment.completed"
        payment_id = "pay_$(Get-Random -Maximum 999999)"
        amount = (Get-Random -Maximum 5000) / 100
        currency = "USD"
        customer_id = "cust_$(Get-Random -Maximum 9999)"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        metadata = @{
            gateway = "stripe"
            transaction_fee = 0.30
        }
    }
    "order_created" = @{
        event = "order.created"
        order_id = "ord_$(Get-Random -Maximum 999999)"
        customer_id = (Get-Random -Maximum 10000)
        items = @(
            @{
                product_id = "prod_$(Get-Random -Maximum 100)"
                quantity = (Get-Random -Maximum 5) + 1
                price = (Get-Random -Maximum 200) / 100
            }
        )
        total = (Get-Random -Maximum 500) / 100
        status = "pending"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    "deployment_success" = @{
        event = "deployment.success"
        deployment_id = "dep_$(Get-Random -Maximum 999999)"
        repository = "myapp/backend"
        branch = "main"
        commit_sha = -join ((1..40) | ForEach {'{0:x}' -f (Get-Random -Max 16)})
        environment = @("staging", "production")[(Get-Random -Maximum 2)]
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        duration_seconds = Get-Random -Maximum 300
    }
    "issue_created" = @{
        event = "issue.created"
        issue_id = Get-Random -Maximum 10000
        title = "Bug report #$(Get-Random -Maximum 1000)"
        priority = @("low", "medium", "high", "critical")[(Get-Random -Maximum 4)]
        assignee = "dev$(Get-Random -Maximum 10)"
        labels = @("bug", "frontend", "backend")
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    "small_ping" = @{
        ping = "pong"
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    }
    "large_data_sync" = @{
        event = "data.sync"
        batch_id = "batch_$(Get-Random -Maximum 999999)"
        records = @(1..50 | ForEach-Object {
            @{
                id = $_
                name = "Record $_"
                data = "x" * (Get-Random -Minimum 100 -Maximum 500)
                timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            }
        })
        total_records = 50
        compression = "gzip"
    }
}

function Get-RandomPayload {
    $payloadKeys = $samplePayloads.Keys | Get-Random
    return $samplePayloads[$payloadKeys]
}

function Get-RandomHeaders {
    $baseHeaders = @{
        "Content-Type" = $contentTypes | Get-Random
        "User-Agent" = $userAgents | Get-Random
        "X-Request-ID" = [System.Guid]::NewGuid().ToString()
    }
    
    # Add some random webhook-specific headers
    $webhookHeaders = @{
        "X-Webhook-Source" = @("github", "stripe", "shopify", "slack", "discord")[(Get-Random -Maximum 5)]
        "X-Event-Type" = @("create", "update", "delete", "sync")[(Get-Random -Maximum 4)]
        "X-Signature" = "sha256=" + (-join ((1..64) | ForEach {'{0:x}' -f (Get-Random -Max 16)}))
        "X-Timestamp" = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    }
    
    # Randomly add some webhook headers
    if ((Get-Random -Maximum 2) -eq 1) {
        $baseHeaders["X-Webhook-Source"] = $webhookHeaders["X-Webhook-Source"]
    }
    if ((Get-Random -Maximum 2) -eq 1) {
        $baseHeaders["X-Event-Type"] = $webhookHeaders["X-Event-Type"]
    }
    if ((Get-Random -Maximum 3) -eq 1) {
        $baseHeaders["X-Signature"] = $webhookHeaders["X-Signature"]
    }
    
    return $baseHeaders
}

# Analytics generation script
Write-Host "🚀 Starting Analytics Data Generation" -ForegroundColor Green
Write-Host "Session ID: $SessionId" -ForegroundColor Cyan
Write-Host "Target URL: $baseUrl" -ForegroundColor Cyan
Write-Host "Total Requests: $TotalRequests" -ForegroundColor Cyan
Write-Host "Delay: ${DelayMs}ms between requests" -ForegroundColor Cyan
Write-Host ""

# Method distribution (weighted for realistic analytics)
$methodWeights = @{
    "POST" = 60    # Most webhooks are POST
    "GET" = 15     # Some health checks
    "PUT" = 10     # Updates
    "PATCH" = 10   # Partial updates  
    "DELETE" = 5   # Cleanup operations
}

# Create weighted method array
$weightedMethods = @()
foreach ($method in $methodWeights.Keys) {
    1..$methodWeights[$method] | ForEach-Object { $weightedMethods += $method }
}

$successCount = 0
$errorCount = 0
$startTime = Get-Date

for ($i = 1; $i -le $TotalRequests; $i++) {
    try {
        # Select method with weighted distribution
        $method = $weightedMethods | Get-Random
        
        # Generate payload (size varies by method)
        $payload = if ($method -eq "GET" -or $method -eq "DELETE") {
            # Smaller payloads for GET/DELETE
            $samplePayloads["small_ping"]
        } elseif ($method -eq "POST" -and (Get-Random -Maximum 10) -eq 1) {
            # Occasionally send large payload for POST
            $samplePayloads["large_data_sync"]
        } else {
            Get-RandomPayload
        }
        
        # Convert to JSON
        $body = $payload | ConvertTo-Json -Depth 5 -Compress
        
        # Generate headers
        $headers = Get-RandomHeaders
        
        # Add some randomness to timing (simulate real-world bursts)
        if ((Get-Random -Maximum 10) -eq 1) {
            # 10% chance of burst (no delay)
            $currentDelay = 0
        } elseif ((Get-Random -Maximum 20) -eq 1) {
            # 5% chance of slow request
            $currentDelay = $DelayMs * 3
        } else {
            $currentDelay = $DelayMs
        }
        
        # Make the request
        $response = Invoke-RestMethod -Uri $baseUrl -Method $method -Body $body -Headers $headers -TimeoutSec 10
        
        $successCount++
        $status = "✅"
        $statusColor = "Green"
        
    } catch {
        $errorCount++
        $status = "❌"
        $statusColor = "Red"
        $response = @{ error = $_.Exception.Message }
    }
    
    # Progress indicator
    $progress = [math]::Round(($i / $TotalRequests) * 100, 1)
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    $eta = if ($i -gt 0) { [math]::Round((($TotalRequests - $i) * $elapsed / $i), 1) } else { 0 }
    
    Write-Host "$status [$i/$TotalRequests] $method - ${progress}% (ETA: ${eta}s)" -ForegroundColor $statusColor
    
    # Random delay
    if ($currentDelay -gt 0) {
        Start-Sleep -Milliseconds $currentDelay
    }
}

$totalTime = ((Get-Date) - $startTime).TotalSeconds
$requestsPerSecond = [math]::Round($TotalRequests / $totalTime, 2)

Write-Host ""
Write-Host "📊 Analytics Data Generation Complete!" -ForegroundColor Green
Write-Host "Total Time: $([math]::Round($totalTime, 1))s" -ForegroundColor Cyan
Write-Host "Successful Requests: $successCount" -ForegroundColor Green
Write-Host "Failed Requests: $errorCount" -ForegroundColor Red
Write-Host "Requests/Second: $requestsPerSecond" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Check your analytics dashboard for the data!" -ForegroundColor Yellow
Write-Host "📈 You should see diverse HTTP methods, request sizes, and timing patterns" -ForegroundColor Yellow