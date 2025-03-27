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

async function sendFunds(amount){
  try {
    if (amount <= 0) throw new Error("Invalid amount");

    const amountInWei = ethers.parseEther(amount);
    console.log("You have sent", amountInWei, "wei");
  } catch (error) {
    console.error(error);
  }
}

const CampaignDetails = ({ crowdfundContract, campaign }) => {
  const [fundAmount, setFundAmount] = useState(0);
  const [txStatus, setTxStatus] = useState(null);

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
        <input type="number" min="0" value={Math.abs(fundAmount)} placeholder="Enter amount in Eth" onChange={(e) => {setFundAmount(e.target.value)}} />
        <button onClick={() => sendFunds(fundAmount)}>Send Funds</button>
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
