"""
FlightChain XRPL Wallet Setup
Run this ONCE to generate your airline's testnet wallet and fund it with test XRP.
It auto-writes the seed and address into your .env file.
"""
import os
import re
from dotenv import load_dotenv
from xrpl.clients import JsonRpcClient
from xrpl.wallet import generate_faucet_wallet
from xrpl.models.requests import AccountInfo

TESTNET_URL = "https://s.altnet.rippletest.net:51234"

def update_env_file(key: str, value: str):
    """Add or replace a key=value in the .env file"""
    env_path = os.path.join(os.path.dirname(__file__), ".env")

    # Read existing content
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            content = f.read()
    else:
        content = ""

    # Replace or append
    pattern = rf"^{re.escape(key)}=.*$"
    new_line = f"{key}={value}"
    if re.search(pattern, content, re.MULTILINE):
        content = re.sub(pattern, new_line, content, flags=re.MULTILINE)
    else:
        content = content.rstrip("\n") + f"\n{new_line}\n"

    with open(env_path, "w") as f:
        f.write(content)

    print(f"   ✅ Saved {key} to .env")


def main():
    print("\n" + "="*60)
    print("🛡️  FlightChain — XRPL Testnet Wallet Setup")
    print("="*60)

    load_dotenv()
    existing_seed = os.getenv("XRPL_WALLET_SEED")

    if existing_seed and existing_seed != "sYourWalletSeedHere...":
        print(f"\n✅ Wallet already configured in .env")
        print(f"   Seed starts with: {existing_seed[:8]}...")

        # Show balance
        client = JsonRpcClient(TESTNET_URL)
        from xrpl.wallet import Wallet
        wallet = Wallet.from_seed(existing_seed)
        try:
            resp    = client.request(AccountInfo(account=wallet.address, ledger_index="validated"))
            balance = int(resp.result["account_data"]["Balance"]) / 1_000_000
            print(f"   Address: {wallet.address}")
            print(f"   Balance: {balance} XRP")
        except:
            print(f"   Address: {wallet.address}")
            print(f"   Balance: (not yet funded)")
        print("\nTo generate a NEW wallet, delete XRPL_WALLET_SEED from .env and re-run.")
        return

    print("\n📡 Connecting to XRPL testnet...")
    client = JsonRpcClient(TESTNET_URL)

    print("💳 Generating new wallet & requesting testnet faucet funds...")
    print("   (This may take 10-20 seconds)\n")

    try:
        wallet = generate_faucet_wallet(client, debug=False)

        print(f"✅ Wallet created and funded!")
        print(f"\n{'='*60}")
        print(f"  ADDRESS : {wallet.address}")
        print(f"  SEED    : {wallet.seed}")
        print(f"{'='*60}")

        # Check funded balance
        try:
            resp    = client.request(AccountInfo(account=wallet.address, ledger_index="validated"))
            balance = int(resp.result["account_data"]["Balance"]) / 1_000_000
            print(f"\n  BALANCE : {balance} XRP (testnet)")
        except:
            print(f"\n  BALANCE : Faucet funded (check in a moment)")

        # Save to .env
        print("\n💾 Saving to .env...")
        update_env_file("XRPL_WALLET_SEED", wallet.seed)
        update_env_file("XRPL_WALLET_ADDRESS", wallet.address)
        update_env_file("XRPL_NETWORK", "testnet")

        print(f"\n✅ .env updated with your wallet credentials")
        print(f"\n🎯 Next step: Run the full demo flow:")
        print(f"   python xrpl_gateway.py")
        print(f"\n⚠️  IMPORTANT: Never share your seed with anyone!")
        print(f"   (Testnet only — no real money at stake)\n")

    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print(f"   Check your internet connection and try again")


if __name__ == "__main__":
    main()
