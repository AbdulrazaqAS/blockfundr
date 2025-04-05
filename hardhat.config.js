require("@nomicfoundation/hardhat-toolbox");
const { vars } = require("hardhat/config");

const PRIVATE_KEY = vars.get("PRIVATE_KEY");
const INFURA_API_KEY = vars.get("INFURA_API_KEY");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    eth_sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY],
    }
  }
};
