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
  console.log("Deployer balance:", (await deployer.provider.getBalance(deployerAddress)).toString());

  const CrowdFund = await ethers.getContractFactory(contractName);
  const crowdfund = await CrowdFund.deploy();
  await crowdfund.waitForDeployment();

  const contractAddress = await crowdfund.getAddress();
  console.log("Contract address:", contractAddress);

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

  let metadataUrl = campaingsJson[0].ipfsUrl;
	let goal = ethers.parseEther(campaingsJson[0].goal.toString());
	let duration = parseInt(campaingsJson[0].duration) * 24 * 60 * 60

  const campaign0 = await createCampaign(deployer, metadataUrl, goal, duration);
  await fundCampaign(signer1, campaign0, "1.236");
  await fundCampaign(signer2, campaign0, "0.555");
  await fundCampaign(signer1, campaign0, "0.900");

  metadataUrl = campaingsJson[1].ipfsUrl;
	goal = ethers.parseEther(campaingsJson[1].goal.toString());
	duration = parseInt(campaingsJson[1].duration) * 24 * 60 * 60
  
  const campaign1 = await createCampaign(deployer, metadataUrl, goal, duration);
  await fundCampaign(signer1, campaign1, "1");
  await fundCampaign(signer2, campaign1, "0.02");
  await fundCampaign(deployer, campaign1, "1.25");

  metadataUrl = campaingsJson[2].ipfsUrl;
	goal = ethers.parseEther(campaingsJson[2].goal.toString());
	duration = parseInt(campaingsJson[2].duration) * 24 * 60 * 60
  
  const campaign2 = await createCampaign(signer1, metadataUrl, goal, duration);
  await fundCampaign(signer1, campaign2, "0.01");
  await fundCampaign(deployer, campaign2, "1.2");
  await fundCampaign(deployer, campaign2, "0.25");

  metadataUrl = campaingsJson[3].ipfsUrl;
	goal = ethers.parseEther(campaingsJson[3].goal.toString());
	duration = parseInt(campaingsJson[3].duration) * 24 * 60 * 60

  const campaign3 = await createCampaign(signer1, metadataUrl, goal, duration);
  await fundCampaign(signer1, campaign3, "0.11");
  await fundCampaign(signer2, campaign3, "0.75");
  await fundCampaign(signer2, campaign3, "1.05");
  
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
