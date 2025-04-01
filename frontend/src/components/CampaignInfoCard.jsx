import {useEffect, useState} from "react";
import {ethers} from "ethers";

async function getFundedEvents(contract, campaignId) {
    // Fetch past `Funded` events related to campaignId
    const events = await contract.queryFilter(
        contract.filters.Funded(campaignId)
    );

    console.log("Funded Events:");
    events.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, {
            campaignId: event.args.campaignId.toString(),
            backer: event.args.backer,
            amount: ethers.formatEther(event.args.amount),
            transactionHash: event.transactionHash
        });
    });
}

const CampaignDetails = ({ crowdfundContract, campaign, signer, setSigner, provider }) => {
  const [fundAmount, setFundAmount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const {
    id,
    title,
    creator,
    goal,
    deadline,
    fundsRaised,
    totalContributors,
    // description,
    location,
    fundingHistory,
    metadata: {
      description,
      image
    }
  } = campaign;
  console.log("Campaign info:", campaign);
  
  async function sendFunds(amount){
    let newSigner = signer;
    if (!newSigner) {
        try {
          newSigner = await provider.getSigner(0);
          console.log("Connected Signer:", newSigner);
          setSigner(newSigner);
        } catch (error) {
          console.error("Error connecting signer:", error);
          setSigner(null);
          return;
        }
    }

    try {
      setIsSending(true);
      const amountInWei = ethers.parseEther(amount);
      const tx = await crowdfundContract.connect(newSigner).fundCampaign(id, { value: amountInWei });
      await tx.wait();
      console.log("Transaction successful:", tx.transactionHash);
    } catch (error) {
      console.error("Error sending funds:", error);
    } finally {
      setIsSending(false);
    }
  }

  
  const timeRemaining = Math.max(0, Math.floor((deadline.toString() * 1000 - Date.now()) / 1000 / 60 / 60 / 24));
  const contributorsList = [];
  useEffect(() => {

    for (let i=0; i<totalContributors;i++){

    }
  }, []);

  return (
    <div className="campaignInfoCard">
      <h1>{title}  #{id}</h1>
      <div className="campaignInfoCard-top">
        <div className="campaignInfoCard-topleft">
          <h3><u>Campaign Description</u></h3>
          <p>{description}</p>
          <p><strong>Creator:</strong> {creator}</p>
          <p><strong>Location:</strong> {location.city}, {location.country}</p>
          <p><strong>Goal:</strong> {ethers.formatEther(goal)} ETH</p>
          <p><strong>Funds Raised:</strong> {ethers.formatEther(fundsRaised)} ETH</p>
          <p><strong>Time Remaining:</strong> {timeRemaining} days</p>
          <p><strong>Backers:</strong> {totalContributors.toString()}</p>
        </div>
        <div className="campaignInfoCard-topright">
          <img src={image} alt="campaign logo" />
        </div>
      </div>
      <div className="campaignInfoCard-middle">
        <input type="number" min="0" value={fundAmount} placeholder="Enter amount in Eth" onChange={(e) => {setFundAmount(e.target.value)}} />
        <button disabled={isSending || fundAmount <= 0} onClick={() => sendFunds(fundAmount)}>
          {isSending ? "Sending..." : "Send Funds"}
        </button>
        {isSending && <p className="red-p">Don't close this card</p>}
      </div>
      <br />
      <hr />
      
      <h2>Funding History</h2>
      <table className="funding-table">
        <thead>
          <tr>
            <th>Backer</th>
            <th>Amount (ETH)</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {fundingHistory.map((entry, index) => (
            <tr key={index}>
              <td>{entry.backer}</td>
              <td>{entry.amount}</td>
              <td>{new Date(entry.date * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CampaignDetails;

/* Test Campaign Object */
export const testCampaign = {
  title: "Solar Power for Rural Schools",
  // description: "Help provide clean energy to schools in remote areas. This campaign aims to install solar panels in rural schools to provide sustainable and uninterrupted electricity for students.",
  location: { city: "Nairobi", country: "Kenya" },
  fundingHistory: [
    { backer: "0x123...abc", amount: 5, date: Math.floor(Date.now() / 1000) - 86400 },
    { backer: "0x456...def", amount: 10, date: Math.floor(Date.now() / 1000) - 43200 },
    { backer: "0x789...ghi", amount: 15, date: Math.floor(Date.now() / 1000) - 21600 },
  ],
};
