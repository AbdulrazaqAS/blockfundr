const path = require("path");
const campaingsJson = require("../frontend/public/campaigns.json");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to deploy a contract to the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  const [deployer, signer1, signer2] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const contractName = "Crowdfund";

  console.log("Deployer:", deployerAddress);

  const deployerBal = await deployer.provider.getBalance(deployerAddress);
  console.log("Deployer balance:", ethers.formatEther(deployerBal), "eth");

  const CrowdFund = await ethers.getContractFactory(contractName);
  const crowdfund = await CrowdFund.deploy();
  await crowdfund.waitForDeployment();
  const txResponse = crowdfund.deploymentTransaction();
  const txReceipt = await txResponse.wait();
  const contractAddress = txReceipt.contractAddress;
  console.log("Contract address:", contractAddress || "Error getting blocknunber");
  console.log("Deployment block number:", txReceipt?.blockNumber || "Error getting blocknumber");
  console.log("Deployment fee:", ethers.formatEther(txReceipt?.fee || 0), "eth");

  async function createCampaign(signer, metadataUrl, goal, duration) {
    const tx = await crowdfund.connect(signer).createCampaign(metadataUrl, goal, duration);
    await tx.wait();
    
    const campaignId = (await crowdfund.campaignCount()) - 1n;
    return campaignId;
  }

  async function fundCampaign(signer, campaignId, amountInEth) {
    const amountInWei = ethers.parseEther(amountInEth);
    const tx = await crowdfund.connect(signer).fundCampaign(campaignId, {value: amountInWei});
    await tx.wait();
  }

  for (let i=0; i< 6; i++){
    const metadataUrl = campaingsJson[i].ipfsUrl;
    let goal = ethers.parseEther(campaingsJson[i].goal.toString());
    let duration = parseInt(campaingsJson[i].duration) * 24 * 60 * 60

    try {
      // Hardcoded values for testing
      if (i === 0) duration = await crowdfund.MIN_DURATION();
      if (i === 0) goal = await crowdfund.MIN_GOAL();

      let acctIdx = Math.floor(Math.random() * 3);
      let acct = acctIdx === 0 ? deployer : acctIdx === 1 ? signer1 : signer2;
      const campaignId = await createCampaign(acct, metadataUrl, goal, duration);
      
      const fundings = 10;
      for (let j=0;j<fundings;j++) {
        let amount = Math.random() * 0.5 + 0.05;
        amount = amount.toFixed(5);
        let acctIdx = Math.floor(Math.random() * 3);
        let acct = acctIdx === 0 ? deployer : acctIdx === 1 ? signer1 : signer2;
        await fundCampaign(acct, campaignId, amount);
      }
    } catch (error) {
      console.error("Error:", error.name);
    }
  }
  
  // Save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(crowdfund, contractName, contractAddress);
}

function saveFrontendFiles(contract, contractName, contractAddress) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ [contractName]: contractAddress }, undefined, 2)
  );

  const ContractArtifact = artifacts.readArtifactSync(contractName);

  fs.writeFileSync(
    path.join(contractsDir, `${contractName}.json`),
    JSON.stringify(ContractArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
