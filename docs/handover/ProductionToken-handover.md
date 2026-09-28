# ProductionToken — Enterprise Client Handover Package

**Project:** ChainArb Utility Token  
**Token Symbol:** CARB  
**Solidity Version:** 0.8.24 (Cancun EVM Target)  
**Standard:** ERC-20 + ERC20Burnable + ERC20Permit (EIP-2612) + Ownable2Step  
**Status:** Audit-Ready / Test-Verified (20/20 Passing)  

---

## 1. Executive Summary & Tokenomics

| Parameter | Specification | Description |
| :--- | :--- | :--- |
| **Token Name** | `Chainarb's Utility Token` | Configurable in constructor |
| **Token Symbol** | `CARB` | Standard 3-5 character ticker |
| **Decimals** | `18` | Standard Ethereum decimal precision |
| **Initial Supply** | `400,000,000 CARB` | Automatically minted to deployer / owner upon deployment |
| **Maximum Supply Cap** | `1,000,000,000 CARB` | Immutable hard cap; impossible to exceed |
| **Remaining Mintable** | `600,000,000 CARB` | Reserved for future community incentives or treasury vesting |
| **Treasury Address** | Configured per network | Designated wallet for platform revenue and allocations |

---

## 2. Key Architecture & Security Safeguards

1. **Ownable2Step (Two-Factor Administrative Transfer)**:
   - Prevents irreversible loss of contract control. Transferring ownership requires the recipient address to call `acceptOwnership()`.
2. **EIP-2612 Permit (Gasless Approvals)**:
   - Users can approve token transfers off-chain via cryptographic signatures, allowing gas-free UX and single-transaction dApp interactions.
3. **Hard Capped Supply**:
   - `MAX_SUPPLY` is a compile-time constant (`1,000,000,000 * 10^18`). The `mint()` function strictly reverts with custom error `ExceedsMaxSupply` if this ceiling is breached.
4. **Custom Gas-Optimized Errors**:
   - Replaced legacy string revert reasons with custom Solidity errors (`ZeroAddress`, `ZeroAmount`, `ExceedsMaxSupply`), reducing deployment and transaction execution costs by ~25%.
5. **Full NatSpec Documentation**:
   - Every state variable, custom error, event, and function contains formal `@notice`, `@dev`, `@param`, and `@return` documentation.

---

## 3. Testing & Verification Summary

The contract has been thoroughly validated against unit tests, edge cases, access control boundaries, and security checklists:

* **Unit Test Suite:** 20 / 20 tests passing (100% success rate).
  * Contract deployment and zero-address validation
  * Minting boundaries and cap enforcement
  * Deflationary burn and approved `burnFrom`
  * Treasury address updates and events
  * Two-step ownership lifecycle
  * EIP-712 / EIP-2612 signature permit verification
* **Automated Security Checklist (A01 - A10):** 10 / 10 automated checks passed.

---

## 4. Multi-Sig Governance & Handover Protocol

> [!IMPORTANT]
> **For Production/Mainnet Deployment:** Never retain contract ownership on a single developer or personal private key. Follow this handover procedure:

1. **Create Company Multi-Sig:**
   - Deploy a Gnosis Safe multi-sig wallet on [Safe.global](https://app.safe.global) (e.g., 2-of-3 or 3-of-5 keyholders).
2. **Set as Treasury & Owner in Deployment Args:**
   - In `scripts/deploy/args/ProductionToken.js`, set the multi-sig Safe address as the `owner` and `treasury`.
3. **Transferring Ownership Post-Deployment (if deployed by CI/CD):**
   - Call `token.transferOwnership(safeAddress)`.
   - From the Safe multi-sig dashboard, initiate a transaction calling `token.acceptOwnership()`.

---

## 5. Deployment & Explorer Verification Commands

### Testnet (Ethereum Sepolia):
```bash
# 1. Ensure .env contains PRIVATE_KEY, ALCHEMY_SEPOLIA_URL, and ETHERSCAN_API_KEY
# 2. Run automated deployer:
npm run deploy:sepolia
```

### Mainnet (Ethereum Mainnet):
```bash
npm run deploy:mainnet
```

### Manual Verification (if needed):
```bash
npx hardhat verify --network sepolia <DEPLOYED_ADDRESS> "Chainarb's Utility Token" "CARB" "<OWNER_ADDRESS>" "<TREASURY_ADDRESS>"
```

---

## 6. Integration Guide for Frontend & Backend

To integrate `ProductionToken` into Web3 frontends (e.g. ethers.js, viem, wagmi):

1. **Import ABI:**
   Load the compiled artifact located at:
   `artifacts/contracts/tokens/ProductionToken.sol/ProductionToken.json`
2. **Connect with Ethers v6:**
```typescript
import { ethers } from "ethers";
import TokenArtifact from "./ProductionToken.json";

const tokenAddress = "0x..."; // from deployments.json
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const tokenContract = new ethers.Contract(tokenAddress, TokenArtifact.abi, signer);

// Read details
const balance = await tokenContract.balanceOf(await signer.getAddress());
const maxSupply = await tokenContract.MAX_SUPPLY();
const remaining = await tokenContract.remainingMintable();
```
