import {useEffect, useState} from "react";
import {ethers} from "ethers";
import ErrorMessage from "./ErrorMessage";

const CampaignDetails = ({ crowdfundContract, campaign, signer, setSigner, provider }) => {
  const [fundAmount, setFundAmount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [fundsHistory, setFundsHistory] = useState([]);
  const [isOwner, setIsOwner] = useState(signer && signer.address === campaign.creator);
  const [error, setError] = useState(null);
  
  const {
    id,
    title,
    creator,
    goal,
    deadline,
    fundsRaised,
    totalContributors,
    location,
    isClosed=false,
    metadata: {
      description,
      image
    }
  } = campaign;
  console.log("Campaign:", campaign);
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
      console.log("Transaction successful:", tx);
      setFundAmount(0);
      // TODO: Show link to transaction on etherscan
      // window.open(`https://etherscan.io/tx/${tx.transactionHash}`, "_blank");
    } catch (error) {
      console.error("Error sending funds:", error);
    } finally {
      setIsSending(false);
    }
  }

  async function withdraw() {
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
      setIsWithdrawing(true);
      console.log("Id", id);
      const campaign = await crowdfundContract.campaigns(0);
      console.log("Withdraw campaign ID Details:", campaign);
      const tx = await crowdfundContract.connect(newSigner).withdrawFunds(Number(id));
      await tx.wait();
      console.log("Withdraw successful:", tx);
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      setError(error);
    } finally {
      setIsWithdrawing(false);
    }
  }

  async function getFundedEvents(campaignId) {
    const events = await crowdfundContract.queryFilter(
      crowdfundContract.filters.Funded(campaignId)
    );

    const eventsObjs = await Promise.all(
      events.map(async (event) => {
        const block = await provider.getBlock(event.blockNumber);
        return {
          campaignId: event.args.campaignId.toString(),
          backer: event.args.backer,
          amount: ethers.formatEther(event.args.amount),
          transactionHash: event.transactionHash,
          timestamp: block.timestamp,
        };
      })
    );

    return eventsObjs;
  }

  const timeRemaining = Math.max(0, Math.floor((deadline.toString() * 1000 - Date.now()) / 1000 / 60 / 60 / 24));

  useEffect(() => {

  });

  useEffect(() => {
    async function fetchFundingHistory() {
      try {
        const fundedEvents = await getFundedEvents(id);
        setFundsHistory(fundedEvents);
        console.log("Funding history:", fundedEvents);
      } catch (error) {
        console.error("Error fetching funding history:", error);
      }
    }

    fetchFundingHistory();
    setError(null);
    if (signer)
      setIsOwner(signer.address === campaign.creator);
    else setIsOwner(false);
  }, [campaign]);

  useEffect(() => {
    if (signer)
      setIsOwner(signer.address === campaign.creator);
    else setIsOwner(false);
  }, [signer]);

  return (
    <div className="campaignInfoCard">
      {error && <ErrorMessage message={error.message} setErrorMessage={setError}/>}
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
        <div className="camapignInfo-buttons" style={{display: "inline"}}>
          <button disabled={isSending || fundAmount <= 0 || isClosed} onClick={() => sendFunds(fundAmount)}>
            {isSending ? "Sending..." : "Send Funds"}
          </button>
          {isOwner && (
            <button disabled={isSending || isClosed || isWithdrawing} onClick={withdraw}>
              {isWithdrawing ? "Withdrawing..." : isClosed ? "Closed" : "Withdraw"}
            </button>
          )}
        </div>
        {isSending && <p className="red-p">Please don't close this card</p>}
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
          {[...fundsHistory].reverse().map((historyObj, index) => (
            <tr key={index}>
              <td>{historyObj.backer}</td>
              <td>{historyObj.amount}</td>
              <td>{new Date(historyObj.timestamp * 1000).toLocaleString()}</td>
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
};
