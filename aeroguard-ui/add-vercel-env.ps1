# Script to add environment variables to Vercel
# Run this from the aeroguard-ui directory

Write-Host "Adding environment variables to Vercel..." -ForegroundColor Green

# AVIATIONSTACK_API_KEY
Write-Host "`nAdding AVIATIONSTACK_API_KEY..." -ForegroundColor Yellow
echo "f081f6b3f0964151220b4f705c872539" | vercel env add AVIATIONSTACK_API_KEY production

# ELEVENLABS_API_KEY
Write-Host "`nAdding ELEVENLABS_API_KEY..." -ForegroundColor Yellow
echo "sk_c163031171782dfd03092a635c9984a09047ad231fafda75" | vercel env add ELEVENLABS_API_KEY production

# ELEVENLABS_AGENT_ID
Write-Host "`nAdding ELEVENLABS_AGENT_ID..." -ForegroundColor Yellow
echo "agent_7401kk534kwsfmqtdwgbsfsagvv5" | vercel env add ELEVENLABS_AGENT_ID production

# NEXT_PUBLIC_ELEVENLABS_AGENT_ID
Write-Host "`nAdding NEXT_PUBLIC_ELEVENLABS_AGENT_ID..." -ForegroundColor Yellow
echo "agent_7401kk534kwsfmqtdwgbsfsagvv5" | vercel env add NEXT_PUBLIC_ELEVENLABS_AGENT_ID production

# XRPL_WALLET_SEED
Write-Host "`nAdding XRPL_WALLET_SEED..." -ForegroundColor Yellow
echo "sEdSjZmvFZRhUoRzGUGjwtPkNhcjvHZ" | vercel env add XRPL_WALLET_SEED production

# XRPL_WALLET_ADDRESS
Write-Host "`nAdding XRPL_WALLET_ADDRESS..." -ForegroundColor Yellow
echo "rhuYuMHZweAJSrrannKb3zNnVmQZhtg9iV" | vercel env add XRPL_WALLET_ADDRESS production

# XRPL_NETWORK
Write-Host "`nAdding XRPL_NETWORK..." -ForegroundColor Yellow
echo "devnet" | vercel env add XRPL_NETWORK production

# XRPL_NFT_TOKEN_ID
Write-Host "`nAdding XRPL_NFT_TOKEN_ID..." -ForegroundColor Yellow
echo "001800002AD8A3678976F99FAA4DC616FEFA1A120BFB79A0FF85C8340002049A" | vercel env add XRPL_NFT_TOKEN_ID production

# ESCROW_RLUSD_AMOUNT
Write-Host "`nAdding ESCROW_RLUSD_AMOUNT..." -ForegroundColor Yellow
echo "100000" | vercel env add ESCROW_RLUSD_AMOUNT production

# RESCUE_TEAM_ADDRESS
Write-Host "`nAdding RESCUE_TEAM_ADDRESS..." -ForegroundColor Yellow
echo "rN7n7otQDd6FczFgLdllmHNwSueY2sPfwgnn" | vercel env add RESCUE_TEAM_ADDRESS production

# Public env vars
Write-Host "`nAdding NEXT_PUBLIC_XRPL_NFT_TOKEN_ID..." -ForegroundColor Yellow
echo "001800002AD8A3678976F99FAA4DC616FEFA1A120BFB79A0FF85C8340002049A" | vercel env add NEXT_PUBLIC_XRPL_NFT_TOKEN_ID production

Write-Host "`nAdding NEXT_PUBLIC_ESCROW_RLUSD_AMOUNT..." -ForegroundColor Yellow
echo "100000" | vercel env add NEXT_PUBLIC_ESCROW_RLUSD_AMOUNT production

Write-Host "`nAdding NEXT_PUBLIC_RESCUE_TEAM_ADDRESS..." -ForegroundColor Yellow
echo "rN7n7otQDd6FczFgLdllmHNwSueY2sPfwgnn" | vercel env add NEXT_PUBLIC_RESCUE_TEAM_ADDRESS production

Write-Host "`n✅ All environment variables added!" -ForegroundColor Green
Write-Host "Now redeploy with: vercel --prod" -ForegroundColor Cyan
