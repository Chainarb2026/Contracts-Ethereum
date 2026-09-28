/**
 * Constructor arguments for ProductionToken
 * These are passed to the deploy script automatically
 *
 * Arguments match constructor:
 * constructor(string name, string symbol, address owner, address treasury)
 */
module.exports = function (deployerAddress, network) {
  const args = {
    sepolia: [
      "Chainarb's Utility Token",           // name
      "CARB",                              // symbol
      deployerAddress,                     // owner — change to multisig for mainnet
      deployerAddress,                     // treasury — change to separate wallet
    ],
    mainnet: [
      "Chainarb's Utility Token",
      "CARB",
      "0x_MULTISIG_ADDRESS_HERE",          // must be Gnosis Safe for mainnet
      "0x_TREASURY_ADDRESS_HERE",
    ],
    localhost: [
      "Chainarb's Utility Token",
      "CARB",
      deployerAddress,
      deployerAddress,
    ],
    hardhat: [
      "Chainarb's Utility Token",
      "CARB",
      deployerAddress,
      deployerAddress,
    ],
  };

  return args[network] || args.localhost;
};
