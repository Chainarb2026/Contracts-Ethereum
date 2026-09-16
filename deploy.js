/**
 * Universal Deploy Script
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deploy.js --network sepolia
 *   npx hardhat run scripts/deploy/deploy.js --network localhost
 *
 * Set CONTRACT_NAME in .env or pass as env var:
 *   CONTRACT_NAME=MyToken npx hardhat run scripts/deploy/deploy.js --network sepolia
 */

require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ── Colour helpers ──────────────────────────────────────────────────
const c = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

async function main() {
  // ── Pre-flight checks ─────────────────────────────────────────────
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEth = hre.ethers.formatEther(balance);

  console.log(c.bold(c.cyan("\n╔═══════════════════════════════════╗")));
  console.log(c.bold(c.cyan("║  BatMan — Deploy Engine            ║")));
  console.log(c.bold(c.cyan("╚═══════════════════════════════════╝")));
  console.log(`\nNetwork:   ${c.cyan(network)}`);
  console.log(`Deployer:  ${c.cyan(deployer.address)}`);
  console.log(`Balance:   ${c.cyan(balanceEth + " ETH")}`);

  // Safety check for mainnet
  if (network === "mainnet") {
    console.log(c.red("\n⚠️  MAINNET DEPLOYMENT"));
    console.log(c.red("   This costs real ETH and is permanent."));
    console.log(c.yellow("   Waiting 5 seconds — Ctrl+C to cancel...\n"));
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Minimum balance check
  const minBalance = network === "mainnet" ? 0.01 : 0.001;
  if (parseFloat(balanceEth) < minBalance) {
    console.error(c.red(`\n❌ Insufficient balance: ${balanceEth} ETH`));
    console.error(
      c.yellow(
        `   Get testnet ETH from: https://sepoliafaucet.com\n`
      )
    );
    process.exit(1);
  }

  // ── Get contract to deploy ─────────────────────────────────────────
  const contractName =
    process.env.CONTRACT_NAME ||
    process.argv.find((a) => a.startsWith("--contract="))?.split("=")[1];

  if (!contractName) {
    console.error(c.red("\n❌ CONTRACT_NAME not specified"));
    console.log(
      c.yellow(
        "   Usage: CONTRACT_NAME=MyToken npx hardhat run scripts/deploy/deploy.js --network sepolia\n"
      )
    );
    process.exit(1);
  }

  console.log(`\nContract:  ${c.cyan(contractName)}`);

  // ── Load constructor args ──────────────────────────────────────────
  // Each contract can have its own args file: scripts/deploy/args/{ContractName}.js
  const argsFile = path.join(
    __dirname,
    "args",
    `${contractName}.js`
  );
  let constructorArgs = [];
  if (fs.existsSync(argsFile)) {
    constructorArgs = require(argsFile)(deployer.address, network);
    console.log(`Args:      ${c.cyan(JSON.stringify(constructorArgs))}`);
  }

  // ── Deploy ─────────────────────────────────────────────────────────
  console.log(c.cyan("\nDeploying..."));
  const startTime = Date.now();

  const Contract = await hre.ethers.getContractFactory(contractName);
  const contract = await Contract.deploy(...constructorArgs);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const deployTx = contract.deploymentTransaction();
  const receipt = await deployTx.wait();
  const gasUsed = receipt.gasUsed.toString();

  // ── Log results ───────────────────────────────────────────────────
  console.log(c.green(`\n✅ DEPLOYED SUCCESSFULLY`));
  console.log(`Address:   ${c.cyan(address)}`);
  console.log(`Gas used:  ${c.cyan(gasUsed)}`);
  console.log(`Tx hash:   ${c.cyan(deployTx.hash)}`);
  console.log(`Time:      ${c.cyan(deployTime + "s")}`);

  // ── Etherscan links ───────────────────────────────────────────────
  const explorerUrls = {
    sepolia: `https://sepolia.etherscan.io/address/${address}`,
    mainnet: `https://etherscan.io/address/${address}`,
    localhost: `http://localhost:8545 (local node)`,
  };

  if (explorerUrls[network]) {
    console.log(`Explorer:  ${c.cyan(explorerUrls[network])}`);
  }

  // ── Save deployment record ────────────────────────────────────────
  const deploymentsFile = "deployments.json";
  let deployments = {};
  if (fs.existsSync(deploymentsFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsFile));
  }

  if (!deployments[network]) deployments[network] = {};
  deployments[network][contractName] = {
    address,
    deployer: deployer.address,
    txHash: deployTx.hash,
    gasUsed,
    timestamp: new Date().toISOString(),
    constructorArgs,
    blockNumber: receipt.blockNumber,
  };

  fs.writeFileSync(deploymentsFile, JSON.stringify(deployments, null, 2));
  console.log(c.green(`\n📄 Deployment saved: deployments.json`));

  // ── Verification ──────────────────────────────────────────────────
  if (network !== "localhost" && network !== "hardhat") {
    console.log(c.cyan("\n⏳ Waiting 30s for Etherscan indexing..."));
    await new Promise((resolve) => setTimeout(resolve, 30000));

    try {
      await hre.run("verify:verify", {
        address,
        constructorArguments: constructorArgs,
      });
      console.log(c.green("✅ Verified on Etherscan"));
      console.log(c.cyan(`   ${explorerUrls[network]}#code`));
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log(c.green("✅ Already verified on Etherscan"));
      } else {
        console.log(c.yellow(`\n⚠️  Verification failed: ${err.message}`));
        console.log(
          c.yellow("   Run manually: npx hardhat verify --network " + network + " " + address)
        );
      }
    }
  }

  // ── Next steps ────────────────────────────────────────────────────
  console.log(c.yellow("\n📋 NEXT STEPS:"));
  console.log(`  1. Update audit report with address: ${address}`);
  console.log(`  2. Share Etherscan link with client`);
  console.log(`  3. Transfer ownership to multisig if needed`);
  console.log(`  4. Test on-chain with small amounts first\n`);

  return address;
}

main().catch((err) => {
  console.error(`\n❌ Deploy failed: ${err.message}`);
  process.exit(1);
});
