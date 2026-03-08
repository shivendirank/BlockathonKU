"""
Fund XRPL wallet on Devnet using programmatic faucet
"""
from xrpl.clients import JsonRpcClient
from xrpl.wallet import Wallet, generate_faucet_wallet
from xrpl.models.requests import AccountInfo
from dotenv import load_dotenv
import os

DEVNET_URL = "https://s.devnet.rippletest.net:51234"

def main():
    load_dotenv()
    seed = os.getenv("XRPL_WALLET_SEED")
    
    if not seed:
        print("❌ No XRPL_WALLET_SEED found in .env")
        return
    
    print("\n" + "="*60)
    print("🛡️  AeroGuard — Funding Devnet Wallet")
    print("="*60)
    
    wallet = Wallet.from_seed(seed)
    print(f"\n📍 Address: {wallet.address}")
    print(f"📡 Connecting to Devnet...")
    
    client = JsonRpcClient(DEVNET_URL)
    
    try:
        # Check if wallet is already funded
        account_info = AccountInfo(account=wallet.address)
        response = client.request(account_info)
        
        if response.is_successful() and "account_data" in response.result:
            balance = float(response.result["account_data"]["Balance"]) / 1_000_000
            print(f"✅ Wallet already funded!")
            print(f"   Balance: {balance} XRP (devnet)")
        else:
            raise Exception("Account not found")
    except Exception as e:
        print(f"\n💰 Wallet not funded - attempting programmatic funding...")
        
        try:
            # Try generate_faucet_wallet with existing seed
            print("   Requesting funds from Devnet faucet...")
            funded_wallet = generate_faucet_wallet(client, wallet)
            
            # Check balance
            account_info = AccountInfo(account=funded_wallet.address)
            response = client.request(account_info)
            balance = float(response.result["account_data"]["Balance"]) / 1_000_000
            
            print(f"\n✅ Wallet funded successfully!")
            print(f"   Balance: {balance} XRP (devnet)")
            print(f"   Transaction: View at https://devnet.xrpl.org/accounts/{wallet.address}")
            
        except Exception as fund_error:
            print(f"\n❌ Programmatic funding failed: {fund_error}")
            print("\n🔄 Alternative options:")
            print("\n   OPTION 1 - Use Testnet (more reliable):")
            print("      Edit .env: XRPL_NETWORK=testnet")
            print("      Then run: python xrpl_setup.py")
            print("\n   OPTION 2 - Manual Devnet funding:")
            print("      Visit: https://faucet.devnet.rippletest.net/")
            print(f"      Address: {wallet.address}")
            print("\n   OPTION 3 - XRP Testnet Faucet:")
            print("      Visit: https://faucet.altnet.rippletest.net/")
            print(f"      Address: {wallet.address}")

if __name__ == "__main__":
    main()
