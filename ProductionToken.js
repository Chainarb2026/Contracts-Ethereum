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
      "Production Token",           // name
      "PROD",                        // symbol
      deployerAddress,               // owner — change to multisig for mainnet
      deployerAddress,               // treasury — change to separate wallet
    ],
    mainnet: [
      "Production Token",
      "PROD",
      "0x_MULTISIG_ADDRESS_HERE",   // must be Gnosis Safe for mainnet
      "0x_TREASURY_ADDRESS_HERE",
    ],
    localhost: [
      "Production Token",
      "PROD",
      deployerAddress,
      deployerAddress,
    ],
  };

  return args[network] || args.localhost;
};
