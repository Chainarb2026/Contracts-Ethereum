/**
 * Pre-Deployment Security Checklist
 *
 * Run before EVERY deployment:
 *   node scripts/utils/security-check.js contracts/tokens/MyToken.sol
 *
 * This is your professional gate — don't deploy without passing this.
 */

const fs = require("fs");
const path = require("path");

const c = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Automated checks (run against source code) ───────────────────────
const AUTO_CHECKS = [
  {
    id: "A01",
    name: "Pragma version locked",
    severity: "HIGH",
    check: (code) => /pragma solidity \^?0\.8\./.test(code),
    fix: "Use pragma solidity 0.8.20; (locked, not floating ^)",
  },
  {
    id: "A02",
    name: "SPDX license identifier",
    severity: "LOW",
    check: (code) => code.includes("SPDX-License-Identifier"),
    fix: "Add // SPDX-License-Identifier: MIT at top",
  },
  {
    id: "A03",
    name: "No tx.origin usage",
    severity: "CRITICAL",
    check: (code) => !code.includes("tx.origin"),
    fix: "Replace tx.origin with msg.sender for authentication",
  },
  {
    id: "A04",
    name: "No suicide/selfdestruct",
    severity: "HIGH",
    check: (code) =>
      !code.includes("selfdestruct") && !code.includes("suicide"),
    fix: "Remove selfdestruct — permanently disables contract",
  },
  {
    id: "A05",
    name: "SafeERC20 used for token transfers",
    severity: "MEDIUM",
    check: (code) => {
      // Only required if using IERC20 transfers
      if (!code.includes("IERC20")) return true;
      return code.includes("SafeERC20") || code.includes("safeTransfer");
    },
    fix: "Use SafeERC20 library for all ERC20 token transfers",
  },
  {
    id: "A06",
    name: "No hardcoded addresses",
    severity: "HIGH",
    check: (code) => {
      // Exclude address(0) and address(this) which are fine
      const cleaned = code
        .replace(/address\(0\)/g, "")
        .replace(/address\(this\)/g, "");
      // Look for suspicious hardcoded hex addresses (not in comments)
      const lines = cleaned.split("\n").filter((l) => !l.trim().startsWith("//"));
      return !lines.some((l) => /0x[0-9a-fA-F]{40}/.test(l));
    },
    fix: "Pass addresses as constructor parameters, not hardcoded",
  },
  {
    id: "A07",
    name: "Custom errors used (not require strings)",
    severity: "LOW",
    check: (code) => {
      // Should have error declarations OR no string requires
      const hasCustomErrors = /error [A-Z]/.test(code);
      const hasStringRequires = /require\([^,)]+,\s*"/.test(code);
      return hasCustomErrors && !hasStringRequires;
    },
    fix: "Use custom errors: error MyError(); revert MyError();",
  },
  {
    id: "A08",
    name: "Events declared",
    severity: "MEDIUM",
    check: (code) => /event [A-Z]/.test(code),
    fix: "Add events for all important state changes",
  },
  {
    id: "A09",
    name: "No floating pragma",
    severity: "MEDIUM",
    check: (code) => !/pragma solidity \^/.test(code),
    fix: "Lock pragma: pragma solidity 0.8.20; (no caret)",
  },
  {
    id: "A10",
    name: "Constructor validates zero addresses",
    severity: "HIGH",
    check: (code) => {
      if (!code.includes("constructor")) return true;
      // Check if constructor has address params and zero-address checks
      const hasAddressParam = /constructor.*address/.test(code);
      if (!hasAddressParam) return true;
      return (
        code.includes("ZeroAddress") ||
        code.includes("address(0)") ||
        code.includes("revert")
      );
    },
    fix: "Add: if(addr == address(0)) revert ZeroAddress(); in constructor",
  },
];

// ── Manual checks (human must verify these) ──────────────────────────
const MANUAL_CHECKS = [
  {
    id: "M01",
    name: "CEI pattern followed in all state-changing functions",
    severity: "CRITICAL",
    description:
      "Every function that changes state: CHECKS first, EFFECTS (state changes) second, INTERACTIONS (external calls) last",
  },
  {
    id: "M02",
    name: "ReentrancyGuard on ETH-sending functions",
    severity: "CRITICAL",
    description:
      "Any function that sends ETH or calls external contracts must have nonReentrant modifier",
  },
  {
    id: "M03",
    name: "Access control on all sensitive functions",
    severity: "HIGH",
    description:
      "Every function that changes critical state has onlyOwner, onlyRole, or equivalent",
  },
  {
    id: "M04",
    name: "Integer math verified for precision",
    severity: "HIGH",
    description:
      "Division always happens AFTER multiplication. No precision loss in reward math.",
  },
  {
    id: "M05",
    name: "External call return values checked",
    severity: "HIGH",
    description:
      "All .call() return values checked. All IERC20 calls use SafeERC20.",
  },
  {
    id: "M06",
    name: "State zeroed before ETH transfer",
    severity: "CRITICAL",
    description:
      "Balance/amount set to 0 BEFORE the .call{value:}() line, not after",
  },
  {
    id: "M07",
    name: "No oracle price manipulation vector",
    severity: "HIGH",
    description:
      "If using price feeds: TWAP used (not spot price). Flash loan can't manipulate.",
  },
  {
    id: "M08",
    name: "Ownership transfer safe",
    severity: "MEDIUM",
    description:
      "Using Ownable2Step (not Ownable). Ownership transfer requires acceptance.",
  },
  {
    id: "M09",
    name: "Max supply enforced correctly",
    severity: "HIGH",
    description:
      "If token has cap: MAX_SUPPLY is constant. Check is before _mint. Overflow impossible.",
  },
  {
    id: "M10",
    name: "Tests cover all revert conditions",
    severity: "MEDIUM",
    description:
      "Every custom error has a test that triggers it. Every modifier has a test that checks it.",
  },
];

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const contractFile = process.argv[2];

  if (!contractFile || !fs.existsSync(contractFile)) {
    console.error(c.red("\n❌ Usage: node scripts/utils/security-check.js <contract.sol>\n"));
    process.exit(1);
  }

  const contractCode = fs.readFileSync(contractFile, "utf8");
  const contractName = path.basename(contractFile, ".sol");

  console.log(c.bold(c.cyan("\n╔═══════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║  Pre-Deploy Security Checklist     ║")));
  console.log(c.bold(c.cyan("╚═══════════════════════════════════╝")));
  console.log(`\nContract: ${c.cyan(contractFile)}\n`);

  // ── Run automated checks ─────────────────────────────────────────
  console.log(c.bold("── AUTOMATED CHECKS ──────────────────────────\n"));

  let autoPass = 0;
  let autoFail = 0;
  const autoFailures = [];

  for (const check of AUTO_CHECKS) {
    const passed = check.check(contractCode);
    if (passed) {
      console.log(c.green(`  ✅ [${check.id}] ${check.name}`));
      autoPass++;
    } else {
      console.log(c.red(`  ❌ [${check.id}] ${check.name} [${check.severity}]`));
      console.log(c.yellow(`     Fix: ${check.fix}`));
      autoFail++;
      autoFailures.push(check);
    }
  }

  console.log(`\n  Automated: ${c.green(autoPass + " passed")}, ${autoFail > 0 ? c.red(autoFail + " failed") : c.green("0 failed")}`);

  // ── Manual checklist ──────────────────────────────────────────────
  console.log(c.bold("\n── MANUAL VERIFICATION REQUIRED ──────────────\n"));
  console.log(c.yellow("  Check each item yourself — AI cannot verify these:\n"));

  for (const check of MANUAL_CHECKS) {
    const severityColor =
      check.severity === "CRITICAL"
        ? c.red
        : check.severity === "HIGH"
        ? c.yellow
        : c.cyan;
    console.log(
      `  □ [${check.id}] ${check.name} ${severityColor("[" + check.severity + "]")}`
    );
    console.log(c.dim(`     ${check.description}\n`));
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log(c.bold("── SUMMARY ───────────────────────────────────\n"));

  if (autoFail > 0) {
    console.log(
      c.red(`  ❌ ${autoFail} automated check(s) FAILED — fix before deploying`)
    );
    autoFailures.forEach((f) => {
      console.log(c.red(`     ${f.id}: ${f.name}`));
    });
  } else {
    console.log(c.green("  ✅ All automated checks passed"));
  }

  console.log(c.yellow(`\n  ⚠️  Complete all ${MANUAL_CHECKS.length} manual checks before deploying`));
  console.log(c.dim("\n  This checklist protects your professional reputation."));
  console.log(c.dim("  A bug in deployed code cannot be fixed.\n"));

  // ── Save checklist result ─────────────────────────────────────────
  const resultPath = `docs/audits/${contractName}-checklist-${Date.now()}.md`;
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });

  const report = `# Pre-Deploy Security Checklist — ${contractName}
Date: ${new Date().toISOString().split("T")[0]}
Contract: ${contractFile}

## Automated Checks
${AUTO_CHECKS.map((c) => {
    const passed = c.check(contractCode);
    return `- [${passed ? "x" : " "}] [${c.id}] ${c.name} (${c.severity})`;
  }).join("\n")}

## Manual Checks (complete before deploying)
${MANUAL_CHECKS.map(
    (c) => `- [ ] [${c.id}] ${c.name} (${c.severity})\n  ${c.description}`
  ).join("\n")}

## Sign-off
- [ ] All automated checks pass
- [ ] All manual checks verified  
- [ ] Tests passing: \`npx hardhat test\`
- [ ] Coverage acceptable: \`npx hardhat coverage\`
- [ ] Deployed to testnet first
- [ ] Testnet version tested thoroughly
- Signed: _______________  Date: _______________
`;

  fs.writeFileSync(resultPath, report);
  console.log(c.green(`  📄 Checklist saved: ${resultPath}\n`));

  process.exit(autoFail > 0 ? 1 : 0);
}

main().catch(console.error);
