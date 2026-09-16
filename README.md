# Web3 Portfolio — Smart Contract Engineering

Professional smart contract development, testing, and security auditing.
Built with Hardhat + OpenZeppelin + Claude AI (antigravity workflow).

---

## Portfolio Contracts

| Contract | Type | Chain | Status | Audit |
|---|---|---|---|---|
| [ProductionToken](./contracts/tokens/ProductionToken.sol) | ERC20 | Sepolia | ✅ Deployed | [Report](./docs/audits/ProductionToken-audit-report.md) |
| *More coming* | | | | |

---

## Tech Stack

- **Solidity 0.8.20** — smart contract language
- **OpenZeppelin 5.x** — audited base contracts
- **Hardhat 3.x** — compile, test, deploy
- **Ethers.js v6** — blockchain interaction
- **Claude AI** — drafting assist + preliminary security review
- **Slither** — static analysis (run locally)

---

## Workflow (antigravity — AI-assisted, human-verified)

```
1. DRAFT    →  npm run ai:draft      → AI writes first version
2. COMPILE  →  npm run compile       → catch syntax errors
3. REVIEW   →  npm run ai:review     → AI security review (preliminary)
4. CHECK    →  npm run check         → automated security checklist
5. TESTS    →  npm run ai:tests      → AI generates test scaffold
6. TEST     →  npm run test          → run all tests
7. COVERAGE →  npm run test:coverage → verify test completeness
8. AUDIT    →  npm run ai:audit      → generate full audit report
9. DEPLOY   →  npm run deploy:sepolia → testnet deployment
10. VERIFY  →  auto                  → Etherscan source verification
```

AI accelerates steps 1, 3, 5, 8.
Human verifies and owns every output.

---

## Project Structure

```
contracts/
  tokens/          ERC20 and token contracts
  defi/            Staking, farming, lending
  nft/             ERC721 and ERC1155
  governance/      DAOs, voting, timelocks
  utils/           Shared utilities

test/
  tokens/          Token tests
  defi/            DeFi tests
  nft/             NFT tests
  governance/      Governance tests

scripts/
  deploy/          Deployment scripts
  deploy/args/     Per-contract constructor args
  utils/           AI workflow + security checklist

docs/
  audits/          Audit reports + checklists
  architecture/    Contract design documentation

deployments.json   Record of all deployments
```

---

## Setup

```bash
# 1. Clone
git clone https://github.com/yourname/web3-portfolio
cd web3-portfolio

# 2. Install
npm install

# 3. Environment
cp .env.example .env
# Fill in: PRIVATE_KEY, ALCHEMY_SEPOLIA_URL, ETHERSCAN_API_KEY, ANTHROPIC_API_KEY

# 4. Compile
npm run compile

# 5. Test
npm run test
```

---

## Commands Reference

```bash
# Compile
npm run compile

# Test
npm run test
npm run test:gas        # with gas report
npm run test:coverage   # with coverage %

# AI Workflow
npm run ai:draft        # draft a new contract
npm run ai:review       # security review
npm run ai:audit        # full audit report
npm run ai:tests        # generate test file
npm run ai:docs         # generate documentation

# Security
npm run check contracts/tokens/MyToken.sol

# Deploy
npm run node:local      # start local node (terminal 1)
npm run deploy:local    # deploy locally (terminal 2)
npm run deploy:sepolia  # deploy to Sepolia testnet
```

---

## Security Approach

Every contract goes through:
1. AI-assisted preliminary review (Claude)
2. Automated static analysis (Slither)
3. Automated security checklist (22 checks)
4. Full test suite (unit + edge cases + attack simulations)
5. Coverage verification (target >95%)
6. Manual adversarial review
7. Testnet deployment + QA
8. Written audit report

**AI is used as a drafting and review assistant.
All security decisions are made and verified by a human engineer.**

---

## Pricing

| Service | Scope | Price |
|---|---|---|
| Simple token | ERC20, fixed supply, burn | $3,000–$5,000 |
| Staking contract | Single pool, ERC20 rewards | $8,000–$15,000 |
| Full DeFi protocol | Lending/AMM/complex | $25,000–$60,000 |
| Security audit only | Up to 500 lines | $5,000–$12,000 |
| Monitoring retainer | Post-launch security ops | $2,000–$5,000/mo |

*[Contact]* → your@email.com

---

*Built with care. Audited with rigor. Delivered with documentation.*
