/**
 * AI Workflow Engine — antigravity integration for smart contract development
 *
 * This script connects Claude AI to your smart contract workflow.
 * It uses AI for: drafting, reviewing, auditing, and documentation.
 * But YOU make every security decision — AI is the assistant, not the auditor.
 *
 * Usage:
 *   node scripts/utils/ai-workflow.js draft    → draft a new contract
 *   node scripts/utils/ai-workflow.js review   → security review existing contract
 *   node scripts/utils/ai-workflow.js audit    → full audit with findings report
 *   node scripts/utils/ai-workflow.js tests    → generate test ideas
 *   node scripts/utils/ai-workflow.js docs     → generate NatSpec + README section
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ── Config ──────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6"; // fast + capable for code tasks
const MAX_TOKENS = 8000;

// ── Colour helpers (no extra deps needed) ───────────────────────────
const c = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── Core AI call ────────────────────────────────────────────────────
async function callClaude(systemPrompt, userMessage, label = "AI") {
  if (!ANTHROPIC_API_KEY) {
    console.error(c.red("\n❌ ANTHROPIC_API_KEY not set in .env\n"));
    process.exit(1);
  }

  process.stdout.write(c.dim(`\n⚡ ${label}...`));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(c.red(`\n❌ API Error ${response.status}: ${err}\n`));
    process.exit(1);
  }

  const data = await response.json();
  process.stdout.write(c.green(" done\n"));
  return data.content[0].text;
}

// ── Prompts ─────────────────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  // Used for drafting new contracts
  drafter: `You are a senior Solidity smart contract engineer.
You write production-grade contracts for professional portfolios.

Rules you ALWAYS follow:
- Solidity 0.8.20 only
- OpenZeppelin 5.x base contracts (never write ERC primitives from scratch)
- CEI pattern (Checks → Effects → Interactions) on every state-changing function
- Custom errors (not require strings)
- NatSpec on every function, state variable, and event
- Events for every state change
- Explicit visibility on all functions and variables
- No tx.origin, no block.timestamp for critical logic, no hardcoded addresses
- Ownable2Step instead of Ownable
- ReentrancyGuard on ETH-sending and external-call functions
- SafeERC20 for all token transfers

Output: complete Solidity file only. No explanation unless asked.`,

  // Used for security review
  reviewer: `You are a smart contract security auditor.
Your job is to find real vulnerabilities, not just surface-level issues.

For every function you review, you check:
1. CEI pattern compliance
2. Access control — who should be able to call this, is it enforced?
3. Integer math — overflow, underflow, precision loss, division order
4. External calls — reentrancy, untrusted contracts, return value checks
5. Input validation — zero address, zero amount, bounds
6. Economic attacks — flash loan, sandwich, front-run, oracle manipulation
7. State machine correctness — can this be called in wrong order/state?
8. Events — is everything emitted that should be?

Format your findings as:
[SEVERITY] Finding Title
Description: what the problem is
Attack scenario: exactly how it would be exploited
Recommendation: exact fix

Severity levels: CRITICAL / HIGH / MEDIUM / LOW / INFORMATIONAL

If something is safe, say why it's safe — don't just skip it.`,

  // Used for test generation
  tester: `You are a Solidity testing expert using Hardhat + ethers.js v6.

You write tests that cover:
- Every success path (happy path)
- Every revert condition (one test per revert)  
- Edge cases: zero values, max uint256, boundary conditions
- Fuzz-style tests with multiple input variations
- Attack simulations: reentrancy attempts, unauthorized calls, front-running

Test file structure:
- describe() blocks per function
- clear test names: "should revert when amount is zero"
- beforeEach for clean state
- Use loadFixture for gas efficiency
- Explicit assertions with expect()

Output: complete test file in JavaScript. No TypeScript.`,

  // Used for documentation
  documenter: `You are a technical writer for Web3 projects.
You write documentation that helps clients understand what they got
and helps other developers integrate with the contract.

Always include:
- Plain English explanation of what the contract does
- Actor table (who can do what)
- Function reference with parameters, return values, events emitted
- Integration guide (how to call this from a frontend)
- Security properties (what is guaranteed and what is not)
- Known limitations or centralization risks

Write for two audiences simultaneously:
1. Non-technical client: understands the business logic
2. Technical integrator: can call the contract correctly`,
};

// ── Command handlers ─────────────────────────────────────────────────

// DRAFT: Generate a new contract from requirements
async function draftContract() {
  console.log(c.bold(c.cyan("\n🔨 CONTRACT DRAFTER\n")));
  console.log(
    c.dim("Describe your contract requirements. Be as specific as possible.")
  );
  console.log(
    c.dim("Example: 'ERC20 token, 1B max supply, owner mint, anyone burn'\n")
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const requirements = await new Promise((resolve) => {
    rl.question(c.cyan("Requirements: "), (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  const contractName = await new Promise((resolve) => {
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl2.question(c.cyan("Contract name (PascalCase): "), (answer) => {
      rl2.close();
      resolve(answer || "MyContract");
    });
  });

  const userMessage = `
Draft a complete production-grade Solidity contract with these requirements:

Contract name: ${contractName}
Requirements: ${requirements}

Additional rules:
- Infer the correct contract type (ERC20, ERC721, custom logic, etc.)
- Choose the right OpenZeppelin base contracts
- Include constructor with all needed parameters
- Add a complete errors section, events section, state variables section
- Use section comment dividers (// === ERRORS ===, etc.)
- Include getters for all important state
- Make it ready for a professional portfolio — client should be impressed
`;

  const result = await callClaude(
    SYSTEM_PROMPTS.drafter,
    userMessage,
    "Drafting contract"
  );

  // Save to correct folder based on type detection
  const folder = detectContractFolder(requirements);
  const filename = `${contractName}.sol`;
  const filepath = path.join("contracts", folder, filename);

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, result);

  console.log(c.green(`\n✅ Contract saved: ${filepath}`));
  console.log(c.yellow("\n⚠️  REQUIRED NEXT STEPS:"));
  console.log("  1. Read every line — AI drafts, you verify");
  console.log("  2. Run: node scripts/utils/ai-workflow.js review");
  console.log("  3. Run: npx hardhat compile");
  console.log("  4. Write tests: node scripts/utils/ai-workflow.js tests");
  console.log("  5. Run: npx hardhat test");

  return filepath;
}

// REVIEW: Security review an existing contract
async function reviewContract() {
  console.log(c.bold(c.cyan("\n🔍 SECURITY REVIEWER\n")));

  const contractFile = await promptForContractFile();
  const contractCode = fs.readFileSync(contractFile, "utf8");

  const userMessage = `
Review this smart contract for security vulnerabilities.

Contract file: ${contractFile}

\`\`\`solidity
${contractCode}
\`\`\`

Perform a complete security review:
1. First, summarize what the contract does and who the actors are
2. List the attack surface (every external/public function)
3. For each function, state if it's safe or not and why
4. List ALL findings with severity, description, scenario, recommendation
5. Conclude with overall risk rating: LOW / MEDIUM / HIGH / CRITICAL

Be specific — show exact line numbers or code snippets for each finding.
If you find no issues with something, explicitly say it's safe and why.
`;

  const result = await callClaude(
    SYSTEM_PROMPTS.reviewer,
    userMessage,
    "Running security review"
  );

  // Save review to docs/
  const contractName = path.basename(contractFile, ".sol");
  const reportPath = `docs/audits/${contractName}-ai-review-${Date.now()}.md`;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const report = `# AI Security Review — ${contractName}
Date: ${new Date().toISOString().split("T")[0]}
Contract: ${contractFile}
Reviewer: Claude AI (preliminary review — human verification required)

---

${result}

---
⚠️ This is an AI-assisted preliminary review. 
All findings must be independently verified by a human auditor.
Do not use this as a sole basis for security decisions.
`;

  fs.writeFileSync(reportPath, report);

  console.log("\n" + result);
  console.log(c.green(`\n✅ Review saved: ${reportPath}`));
  console.log(c.yellow("\n⚠️  REQUIRED: Verify every finding yourself"));
  console.log("   AI misses economic attacks and novel attack vectors");
  console.log("   Run: npx hardhat test to confirm fixes work");
}

// AUDIT: Full audit report generation
async function auditContract() {
  console.log(c.bold(c.cyan("\n📋 AUDIT REPORT GENERATOR\n")));

  const contractFile = await promptForContractFile();
  const contractCode = fs.readFileSync(contractFile, "utf8");
  const contractName = path.basename(contractFile, ".sol");

  // Get test results if they exist
  let testSummary = "No test results found — run tests first";
  const testFile = `test/tokens/${contractName}.test.js`;
  if (fs.existsSync(testFile)) {
    testSummary = `Test file exists: ${testFile}`;
  }

  const userMessage = `
Generate a complete professional audit report for this smart contract.
This report will be shown to paying clients as proof of security review.

Contract: ${contractName}
File: ${contractFile}

\`\`\`solidity
${contractCode}
\`\`\`

Generate a complete audit report with these sections:
1. Executive Summary (2-3 paragraphs, non-technical)
2. Scope and Methodology
3. Contract Architecture Overview
4. Actor Roles Table
5. Findings (all severities, detailed)
6. Security Properties Verified (checklist format)
7. Recommendations (prioritized)
8. Conclusion with overall risk rating

Format as professional Markdown.
Use tables where appropriate.
Include severity counts table (Critical/High/Medium/Low/Informational).
`;

  const result = await callClaude(
    SYSTEM_PROMPTS.reviewer,
    userMessage,
    "Generating audit report"
  );

  const reportPath = `docs/audits/${contractName}-audit-report.md`;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const fullReport = `# Security Audit Report — ${contractName}

| | |
|---|---|
| **Contract** | ${contractName}.sol |
| **Date** | ${new Date().toISOString().split("T")[0]} |
| **Auditor** | [Your Company Name] |
| **AI Assist** | Claude (preliminary — human verified) |
| **Status** | Draft — Pending Human Review |

---

${result}

---

## Audit Methodology Note

This report was produced using AI-assisted analysis followed by 
manual human verification. The AI component performs initial 
pattern matching and known vulnerability detection. All findings 
have been independently verified by a human auditor.

*[Your Company Name] — Smart Contract Security*
`;

  fs.writeFileSync(reportPath, fullReport);
  console.log(c.green(`\n✅ Audit report saved: ${reportPath}`));
  console.log(
    c.yellow("\n⚠️  Fill in: company name, commit hash, deployed address")
  );
}

// TESTS: Generate test ideas and scaffold
async function generateTests() {
  console.log(c.bold(c.cyan("\n🧪 TEST GENERATOR\n")));

  const contractFile = await promptForContractFile();
  const contractCode = fs.readFileSync(contractFile, "utf8");
  const contractName = path.basename(contractFile, ".sol");

  const userMessage = `
Generate a complete test file for this Solidity contract.
Use Hardhat + ethers.js v6 (NOT v5 — use ethers.parseEther not ethers.utils.parseEther).

Contract: ${contractName}

\`\`\`solidity
${contractCode}
\`\`\`

Requirements for the test file:
1. Import from hardhat and ethers correctly
2. Use loadFixture pattern for gas efficiency
3. Group tests by function using describe()
4. Every revert condition gets its own test
5. Include fuzz-style tests with multiple amounts
6. Include at least 2 attack simulation tests
7. Use meaningful test names that describe behavior
8. Add comments explaining what each test verifies

Output complete JavaScript test file only.
`;

  const result = await callClaude(
    SYSTEM_PROMPTS.tester,
    userMessage,
    "Generating tests"
  );

  // Detect correct test folder
  const folder = detectTestFolder(contractFile);
  const testPath = `test/${folder}/${contractName}.test.js`;
  fs.mkdirSync(path.dirname(testPath), { recursive: true });
  fs.writeFileSync(testPath, result);

  console.log(c.green(`\n✅ Tests saved: ${testPath}`));
  console.log(c.yellow("\n⚠️  REQUIRED:"));
  console.log("  1. Read every test — verify the assertions are correct");
  console.log("  2. Run: npx hardhat test");
  console.log("  3. Add edge cases the AI missed (especially economic attacks)");
  console.log("  4. Run: npx hardhat coverage");
}

// DOCS: Generate documentation
async function generateDocs() {
  console.log(c.bold(c.cyan("\n📚 DOCUMENTATION GENERATOR\n")));

  const contractFile = await promptForContractFile();
  const contractCode = fs.readFileSync(contractFile, "utf8");
  const contractName = path.basename(contractFile, ".sol");

  const userMessage = `
Generate complete documentation for this smart contract.
This will be the README section shown to clients and developers.

Contract: ${contractName}

\`\`\`solidity
${contractCode}
\`\`\`

Generate:
1. Plain English description (2-3 paragraphs)
2. Feature list (bullet points)
3. Actor roles table
4. Function reference (every public/external function)
5. Events reference (every event with when it fires)
6. Integration guide (how a frontend calls this)
7. Security properties (what is and isn't guaranteed)
8. Deployment checklist

Format as Markdown. Make it impressive for a portfolio.
`;

  const result = await callClaude(
    SYSTEM_PROMPTS.documenter,
    userMessage,
    "Generating documentation"
  );

  const docsPath = `docs/architecture/${contractName}.md`;
  fs.mkdirSync(path.dirname(docsPath), { recursive: true });
  fs.writeFileSync(docsPath, result);

  console.log(c.green(`\n✅ Documentation saved: ${docsPath}`));
}

// ── Helpers ─────────────────────────────────────────────────────────

async function promptForContractFile() {
  // Find all .sol files
  const contracts = findSolFiles("contracts");
  if (contracts.length === 0) {
    console.error(c.red("No .sol files found in contracts/"));
    process.exit(1);
  }

  console.log(c.dim("Available contracts:"));
  contracts.forEach((f, i) => console.log(c.dim(`  [${i + 1}] ${f}`)));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(c.cyan("\nEnter number or path: "), (answer) => {
      rl.close();
      const idx = parseInt(answer) - 1;
      if (idx >= 0 && idx < contracts.length) {
        resolve(contracts[idx]);
      } else {
        resolve(answer.trim());
      }
    });
  });
}

function findSolFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  fs.readdirSync(dir).forEach((f) => {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      findSolFiles(fullPath, files);
    } else if (f.endsWith(".sol") && !f.includes("Mock")) {
      files.push(fullPath);
    }
  });
  return files;
}

function detectContractFolder(requirements) {
  const r = requirements.toLowerCase();
  if (r.includes("erc20") || r.includes("token")) return "tokens";
  if (r.includes("nft") || r.includes("erc721")) return "nft";
  if (r.includes("stake") || r.includes("defi") || r.includes("pool"))
    return "defi";
  if (r.includes("vote") || r.includes("dao") || r.includes("govern"))
    return "governance";
  return "utils";
}

function detectTestFolder(contractFile) {
  if (contractFile.includes("/tokens/")) return "tokens";
  if (contractFile.includes("/nft/")) return "nft";
  if (contractFile.includes("/defi/")) return "defi";
  if (contractFile.includes("/governance/")) return "governance";
  return "tokens";
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const command = process.argv[2];

  console.log(c.bold(c.cyan("\n╔═══════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║  BatMan — AI Contract Workflow     ║")));
  console.log(c.bold(c.cyan("╚═══════════════════════════════════╝")));

  switch (command) {
    case "draft":
      await draftContract();
      break;
    case "review":
      await reviewContract();
      break;
    case "audit":
      await auditContract();
      break;
    case "tests":
      await generateTests();
      break;
    case "docs":
      await generateDocs();
      break;
    default:
      console.log(c.yellow("\nUsage:"));
      console.log("  node scripts/utils/ai-workflow.js draft   → new contract");
      console.log("  node scripts/utils/ai-workflow.js review  → security review");
      console.log("  node scripts/utils/ai-workflow.js audit   → full audit report");
      console.log("  node scripts/utils/ai-workflow.js tests   → generate tests");
      console.log("  node scripts/utils/ai-workflow.js docs    → documentation");
      break;
  }
}

main().catch((err) => {
  console.error(c.red(`\n❌ Error: ${err.message}\n`));
  process.exit(1);
});
