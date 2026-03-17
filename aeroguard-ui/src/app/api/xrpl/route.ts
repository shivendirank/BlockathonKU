import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"

const execAsync = promisify(exec)
const XRPL_WALLET_SEED = process.env.XRPL_WALLET_SEED

/**
 * XRPL Dynamic NFT (XLS-46d) API Endpoint
 * Handles minting and updating aircraft Digital Twin NFTs on XRPL Devnet
 */

// Path to Python XRPL gateway script
const XRPL_GATEWAY = path.join(process.cwd(), "..", "BlockathonKU-shiva", "xrpl_gateway.py")

function mockTx(prefix = "MOCK") {
  return `${prefix}${Date.now().toString(16).toUpperCase()}`
}

function mockResponse(action: string, data: any) {
  const hash = mockTx("MOCKTX")
  switch (action) {
    case "mint":
      return {
        success: true,
        mock: true,
        nft_token_id: data?.nft_token_id || `MOCKNFT${Date.now().toString(16).toUpperCase()}`,
        hash,
        explorer_url: `https://devnet.xrpl.org/transactions/${hash}`,
        message: "Mock mode: configure XRPL_WALLET_SEED to enable live XRPL transactions"
      }
    case "update":
      return {
        success: true,
        mock: true,
        hash,
        new_uri: `ipfs://${data?.crash_cid || "QmMockCrashCID"}`,
        explorer_url: `https://devnet.xrpl.org/transactions/${hash}`,
        message: "Mock mode: NFT URI update simulated"
      }
    case "escrow_create":
      return {
        success: true,
        mock: true,
        escrow_sequence: Math.floor(Date.now() / 1000),
        hash,
        explorer_url: `https://devnet.xrpl.org/transactions/${hash}`,
        message: "Mock mode: escrow creation simulated"
      }
    case "escrow_finish":
      return {
        success: true,
        mock: true,
        hash,
        explorer_url: `https://devnet.xrpl.org/transactions/${hash}`,
        message: "Mock mode: escrow finish simulated"
      }
    default:
      return {
        success: false,
        mock: true,
        error: `Unknown action: ${action}`
      }
  }
}

export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()
    const { action, data } = body

    if (!XRPL_WALLET_SEED) {
      return NextResponse.json(mockResponse(action, data))
    }

    switch (action) {
      case "mint": {
        // Mint initial aircraft NFT with nominal IPFS CID
        const { aircraft_id, nominal_cid } = data
        
        const mintCommand = `python ${XRPL_GATEWAY} mint ${aircraft_id} ${nominal_cid}`
        const { stdout, stderr } = await execAsync(mintCommand)
        
        if (stderr) {
          console.error("XRPL mint error:", stderr)
        }
        
        const result = JSON.parse(stdout)
        
        return NextResponse.json({
          success: true,
          nft_token_id: result.nft_token_id,
          hash: result.hash,
          explorer_url: `https://devnet.xrpl.org/transactions/${result.hash}`
        })
      }

      case "update": {
        // Update NFT URI with crash CID (XLS-46d NFTokenModify)
        const { nft_token_id, crash_cid } = data
        
        const updateCommand = `python ${XRPL_GATEWAY} update ${nft_token_id} ${crash_cid}`
        const { stdout, stderr } = await execAsync(updateCommand)
        
        if (stderr) {
          console.error("XRPL update error:", stderr)
        }
        
        const result = JSON.parse(stdout)
        
        return NextResponse.json({
          success: true,
          hash: result.hash,
          new_uri: `ipfs://${crash_cid}`,
          explorer_url: `https://devnet.xrpl.org/transactions/${result.hash}`
        })
      }

      case "escrow_create": {
        // Create RLUSD escrow for rescue funding
        const { amount, destination, finish_after } = data
        
        const escrowCommand = `python ${XRPL_GATEWAY} escrow_create ${amount} ${destination} ${finish_after}`
        const { stdout, stderr } = await execAsync(escrowCommand)
        
        if (stderr) {
          console.error("XRPL escrow error:", stderr)
        }
        
        const result = JSON.parse(stdout)
        
        return NextResponse.json({
          success: true,
          escrow_sequence: result.sequence,
          hash: result.hash,
          explorer_url: `https://devnet.xrpl.org/transactions/${result.hash}`
        })
      }

      case "escrow_finish": {
        // Release escrow funds
        const { escrow_sequence, owner } = data
        
        const finishCommand = `python ${XRPL_GATEWAY} escrow_finish ${escrow_sequence} ${owner}`
        const { stdout, stderr } = await execAsync(finishCommand)
        
        if (stderr) {
          console.error("XRPL finish error:", stderr)
        }
        
        const result = JSON.parse(stdout)
        
        return NextResponse.json({
          success: true,
          hash: result.hash,
          explorer_url: `https://devnet.xrpl.org/transactions/${result.hash}`
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error("XRPL API error:", error)
    if (body?.action) {
      return NextResponse.json(mockResponse(body.action, body.data || {}))
    }
    {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: "Check that Python xrpl_gateway.py is configured correctly"
        },
        { status: 500 }
      )
    }
  }
}

// GET endpoint for NFT status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const nft_token_id = searchParams.get('nft_token_id')
    
    if (!nft_token_id) {
      return NextResponse.json(
        { error: "nft_token_id parameter required" },
        { status: 400 }
      )
    }

    if (!XRPL_WALLET_SEED) {
      return NextResponse.json({
        success: true,
        mock: true,
        nft: {
          nft_token_id,
          uri: "ipfs://QmMockCrashCID",
          status: "mock",
          network: "devnet"
        }
      })
    }

    const statusCommand = `python ${XRPL_GATEWAY} status ${nft_token_id}`
    const { stdout, stderr } = await execAsync(statusCommand)
    
    if (stderr) {
      console.error("XRPL status error:", stderr)
    }
    
    const result = JSON.parse(stdout)
    
    return NextResponse.json({
      success: true,
      nft: result
    })
    
  } catch (error: any) {
    console.error("XRPL status error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
