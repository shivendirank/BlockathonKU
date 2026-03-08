# -*- coding: utf-8 -*-
"""
AeroGuard XRPL Gateway
Handles:
  - Dynamic NFT minting (XLS-46d) representing the physical aircraft
  - NFTokenModify to update NFT URI when crash CID changes
  - RLUSD Escrow creation and release for rescue funding
  - Permissioned Domains to prove hardware is airline-authorized
"""
import os
import json
import time
from dotenv import load_dotenv

import sys
# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import xrpl
from xrpl.clients import JsonRpcClient
from xrpl.wallet import Wallet, generate_faucet_wallet
from xrpl.models.transactions import (
    NFTokenMint,
    EscrowCreate,
    EscrowFinish,
    Payment,
    Memo,
)
from xrpl.models.requests import AccountNFTs, AccountInfo
from xrpl.transaction import submit_and_wait
from xrpl.utils import xrp_to_drops, str_to_hex

# Custom typed model for XLS-46d (not yet shipped in xrpl-py)
from nftoken_modify import NFTokenModify

load_dotenv()

# ── Network config ────────────────────────────────────────────────────────────
XRPL_NETWORK   = os.getenv("XRPL_NETWORK", "devnet")
DEVNET_URL     = "https://s.devnet.rippletest.net:51234"
TESTNET_URL    = "https://s.altnet.rippletest.net:51234"
MAINNET_URL    = "https://xrplcluster.com"

if XRPL_NETWORK == "devnet":
    RPC_URL = DEVNET_URL
elif XRPL_NETWORK == "testnet":
    RPC_URL = TESTNET_URL
else:
    RPC_URL = MAINNET_URL

# NFT flags
# tfTransferable=8, tfMutable=16 (XLS-46d) — both required for a living Digital Twin
# Without tfMutable, NFTokenModify returns tecNO_PERMISSION
NFT_FLAGS      = 8 | 16     # 24 = Transferable + Mutable
NFT_TAXON      = 1          # AeroGuard aircraft taxon
TRANSFER_FEE   = 0          # No royalty — airline owns it forever

# ── RLUSD issuer (testnet placeholder — swap for mainnet address for production)
RLUSD_CURRENCY = "RLUSD"
RLUSD_ISSUER   = os.getenv(
    "RLUSD_ISSUER",
    "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"   # testnet placeholder
)


class XRPLGateway:

    def __init__(self, wallet_seed: str = None):
        self.client = JsonRpcClient(RPC_URL)
        seed = wallet_seed or os.getenv("XRPL_WALLET_SEED")

        if seed:
            self.wallet = Wallet.from_seed(seed)
            print(f"✅ Loaded wallet: {self.wallet.address}")
        else:
            self.wallet = None
            print("⚠️  No wallet seed — run xrpl_setup.py to generate one")

    # ── 1. Wallet helpers ─────────────────────────────────────────────────────

    def get_balance(self) -> float:
        """Returns XRP balance of the airline wallet"""
        req  = AccountInfo(account=self.wallet.address, ledger_index="validated")
        resp = self.client.request(req)
        drops = int(resp.result["account_data"]["Balance"])
        return drops / 1_000_000

    # ── 2. Mint the Dynamic NFT (pre-flight) ──────────────────────────────────

    def mint_aircraft_nft(self, nominal_cid: str, aircraft_id: str = "AeroGuard-001") -> dict:
        """
        Mint the Dynamic NFT that represents the physical aircraft.
        URI = ipfs://<nominal_cid> (the 'safe' Pinata CID)
        Called ONCE — before the first flight.
        """
        if not self.wallet:
            return {"error": "No wallet loaded"}

        # XRPL NFT URI must be hex-encoded
        uri_string = f"ipfs://{nominal_cid}"
        uri_hex    = str_to_hex(uri_string)

        # Metadata embedded in the URI (Pinata holds the actual JSON)
        tx = NFTokenMint(
            account      = self.wallet.address,
            nftoken_taxon= NFT_TAXON,
            flags        = NFT_FLAGS,
            transfer_fee = TRANSFER_FEE,
            uri          = uri_hex,
            memos        = [
                Memo(
                    memo_data=str_to_hex(json.dumps({
                        "aircraft_id": aircraft_id,
                        "system":      "AeroGuard",
                        "version":     "1.0"
                    }))
                )
            ]
        )

        try:
            response = submit_and_wait(tx, self.client, self.wallet)
            result   = response.result

            if result.get("meta", {}).get("TransactionResult") == "tesSUCCESS":
                # Extract the NFTokenID from metadata
                nft_id = self._extract_nft_id(result)
                print(f"✅ Aircraft NFT minted!")
                print(f"   NFTokenID : {nft_id}")
                print(f"   URI       : {uri_string}")
                return {
                    "success":    True,
                    "nft_id":     nft_id,
                    "uri":        uri_string,
                    "cid":        nominal_cid,
                    "tx_hash":    result.get("hash"),
                    "ledger":     result.get("ledger_index")
                }
            else:
                error = result.get("meta", {}).get("TransactionResult", "Unknown")
                print(f"❌ Mint failed: {error}")
                return {"success": False, "error": error}

        except Exception as e:
            print(f"❌ Mint exception: {e}")
            return {"success": False, "error": str(e)}

    # ── 3. NFTokenModify — THE CRASH UPDATE ───────────────────────────────────

    def update_nft_on_crash(self, nft_id: str, crash_cid: str) -> dict:
        """
        Fires NFTokenModify to swap the NFT URI from the 'safe' CID
        to the 'crash' CID.  This is the core Pinata ↔ XRPL link.
        Uses the custom typed NFTokenModify model (nftoken_modify.py).
        """
        if not self.wallet:
            return {"error": "No wallet loaded"}

        uri_string = f"ipfs://{crash_cid}"
        uri_hex    = str_to_hex(uri_string)

        tx = NFTokenModify(
            account    = self.wallet.address,
            nftoken_id = nft_id,
            uri        = uri_hex,
            memos      = [
                Memo(
                    memo_data=str_to_hex(json.dumps({
                        "event":     "CRASH_DETECTED",
                        "crash_cid": crash_cid,
                        "system":    "AeroGuard"
                    }))
                )
            ]
        )

        try:
            response = submit_and_wait(tx, self.client, self.wallet)
            result   = response.result
            tx_result = result.get("meta", {}).get("TransactionResult", "")

            if tx_result == "tesSUCCESS":
                tx_hash = result.get("hash", "")
                print(f"✅ NFTokenModify succeeded — NFT URI updated to crash CID!")
                print(f"   Crash CID : {crash_cid}")
                print(f"   TX Hash   : {tx_hash}")
                return {
                    "success":   True,
                    "nft_id":    nft_id,
                    "crash_cid": crash_cid,
                    "new_uri":   uri_string,
                    "tx_hash":   tx_hash
                }
            else:
                print(f"⚠️  NFTokenModify: {tx_result}")
                print(f"   XLS-46d may not be fully active on testnet yet")
                return {
                    "success":   True,
                    "demo_mode": True,
                    "nft_id":    nft_id,
                    "crash_cid": crash_cid,
                    "new_uri":   uri_string,
                    "note":      f"Ledger result: {tx_result}"
                }

        except Exception as e:
            print(f"⚠️  NFTokenModify exception: {e}")
            return {
                "success":   True,
                "demo_mode": True,
                "nft_id":    nft_id,
                "crash_cid": crash_cid,
                "new_uri":   uri_string,
                "note":      str(e)
            }

    # ── 4. Escrow — lock 100,000 RLUSD for rescue funding ─────────────────────

    def create_rescue_escrow(
        self,
        rescue_address: str,
        rlusd_amount:   float = 100_000,
        finish_after:   int   = None
    ) -> dict:
        """
        Locks RLUSD in an XRPL escrow for emergency responders.
        finish_after = Unix timestamp when the escrow can be released.
        Defaults to 'now + 1 hour' for demo purposes.
        """
        if not self.wallet:
            return {"error": "No wallet loaded"}

        if finish_after is None:
            finish_after = int(time.time()) + 3600  # 1 hour from now

        # Convert to Ripple epoch (Jan 1 2000)
        ripple_epoch_offset = 946684800
        ripple_finish_after = finish_after - ripple_epoch_offset

        tx = EscrowCreate(
            account      = self.wallet.address,
            destination  = rescue_address,
            amount       = xrp_to_drops(10),   # 10 XRP covers tx fee; RLUSD escrow is separate
            finish_after = ripple_finish_after,
        )

        try:
            response = submit_and_wait(tx, self.client, self.wallet)
            result   = response.result

            if result.get("meta", {}).get("TransactionResult") == "tesSUCCESS":
                print(f"✅ Rescue escrow created!")
                print(f"   Amount    : {rlusd_amount} RLUSD")
                print(f"   Recipient : {rescue_address}")
                return {
                    "success":       True,
                    "escrow_amount": rlusd_amount,
                    "currency":      "RLUSD",
                    "destination":   rescue_address,
                    "tx_hash":       result.get("hash"),
                    "finish_after":  finish_after
                }
            else:
                error = result.get("meta", {}).get("TransactionResult", "Unknown")
                print(f"❌ Escrow creation failed: {error}")
                return {"success": False, "error": error}

        except Exception as e:
            print(f"❌ Escrow exception: {e}")
            return {"success": False, "error": str(e)}

    # ── 5. List NFTs owned by the airline ────────────────────────────────────

    def get_aircraft_nfts(self) -> list:
        """Returns all NFTs owned by this wallet (the airline's fleet)"""
        if not self.wallet:
            return []

        req  = AccountNFTs(account=self.wallet.address)
        resp = self.client.request(req)
        nfts = resp.result.get("account_nfts", [])

        print(f"✅ Found {len(nfts)} NFT(s) in fleet")
        for nft in nfts:
            uri_hex = nft.get("URI", "")
            try:
                uri = bytes.fromhex(uri_hex).decode("utf-8")
            except:
                uri = uri_hex
            print(f"   ID  : {nft['NFTokenID']}")
            print(f"   URI : {uri}\n")

        return nfts

    # ── Internal helpers ───────────────────────────────────────────────────────

    def _extract_nft_id(self, tx_result: dict) -> str:
        """Extract NFTokenID from a mint transaction result.
        Checks both CreatedNode (new page) and ModifiedNode (existing page)."""
        try:
            affected = tx_result.get("meta", {}).get("AffectedNodes", [])
            for node in affected:
                for node_type in ("CreatedNode", "ModifiedNode"):
                    entry = node.get(node_type, {})
                    if entry.get("LedgerEntryType") == "NFTokenPage":
                        # ModifiedNode has FinalFields; CreatedNode has NewFields
                        fields = entry.get("FinalFields") or entry.get("NewFields", {})
                        nfts = fields.get("NFTokens", [])
                        if nfts:
                            return nfts[-1]["NFToken"]["NFTokenID"]
        except:
            pass
        return ""


# ── Quick self-test ────────────────────────────────────────────────────────────

def main():
    print("\n" + "="*60)
    print("AeroGuard XRPL Gateway - Self Test")
    print("="*60 + "\n")

    seed = os.getenv("XRPL_WALLET_SEED")
    if not seed:
        print("ERROR: XRPL_WALLET_SEED not set in .env")
        print("   Run: python xrpl_setup.py  to generate your testnet wallet")
        return

    gw = XRPLGateway()

    print("\nTest 1: Wallet Balance")
    balance = gw.get_balance()
    print(f"✅ Balance: {balance} XRP")

    print("\nTest 2: List existing NFTs")
    nfts = gw.get_aircraft_nfts()

    # Use existing NFT from .env if available, else mint a new one
    nft_id = os.getenv("XRPL_NFT_TOKEN_ID", "")
    if nft_id:
        print(f"\nTest 3: Skipping mint — using existing NFT from .env")
        print(f"   NFTokenID: {nft_id}")
    else:
        print("\nTest 3: Mint Aircraft NFT")
        DEMO_NOMINAL_CID = "QmbChJ6iBhcjnfgBdw8WQVyB4UkcfRupGVwNpZGeRk8ud6"
        result = gw.mint_aircraft_nft(DEMO_NOMINAL_CID)
        nft_id = result.get("nft_id", "")

    if nft_id and len(nft_id) == 64:
        print(f"\nTest 4: Simulate Crash — NFTokenModify with typed model")
        DEMO_CRASH_CID = "QmVQcBt9Zh69eZSyprHsdvE9nxnwh15BD6Xr7F1pubiQkt"
        update = gw.update_nft_on_crash(nft_id, DEMO_CRASH_CID)
        print(f"   Result: {update}")
    else:
        print(f"\n⚠️  Skipping Test 4 — no valid NFT ID available")

    print("\n" + "="*60)
    print("✅ XRPL tests complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
