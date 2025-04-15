const path = require("path");
const campaingsJson = require("../frontend/public/campaigns.json");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "You are trying to interact on the Hardhat Network, which" +
        "gets automatically created and destroyed every time. Use the Hardhat" +
        " option '--network localhost'"
    );
  }

  const signers = await ethers.getSigners();
  const interactingSigner = signers[4];
  const deployerAddress = await interactingSigner.getAddress();
  const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
  const contractName = "Crowdfund";
  const contractArtifact = `artifacts/contracts/${contractName}.sol/${contractName}.json`;

  console.log("Interacting Acct:", deployerAddress);

  const crowdFund = await ethers.getContractAt(contractName, contractAddress, interactingSigner);

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

  const tx0 = await crowdFund.connect(interactingSigner).withdrawFunds(10);
  const tx0Receipt = await tx0.wait()
  console.log(tx0Receipt);
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });