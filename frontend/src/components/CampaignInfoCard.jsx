import {useEffect, useState} from "react";
import {ethers} from "ethers";
import ErrorMessage from "./ErrorMessage";
import CancelBtn from "./CancelBtn";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

function timeRemaining(deadlineInSeconds) {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  let remaining = deadlineInSeconds - now;

  if (remaining <= 0) {
      return {days:0, hours:0, minutes:0, seconds:0};
  }

  const days = Math.floor(remaining / (24 * 3600));
  remaining %= 24 * 3600;  // Factor out days
  const hours = Math.floor(remaining / 3600);
  remaining %= 3600;  // Factor out hours
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return {days, hours, minutes, seconds};
}

const CampaignDetails = ({ crowdfundContract, campaign, signer, provider, deploymentBlock, logsChunkSize, blockExplorerUrl, setDisableNav, setShowCampaignInfo, faucetUrl, inSafeMode, setWalletDetected }) => {
  const [fundAmount, setFundAmount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [fundsHistory, setFundsHistory] = useState([]);
  const [refundHistory, setRefundHistory] = useState([]);
  const [closeEvent, setCloseEvent] = useState(null);
  const [isOwner, setIsOwner] = useState(signer && signer.address === campaign.creator);
  const [error, setError] = useState(null);
  const [timeRemainingStr, setTimeRemainingStr] = useState("");
  const [withdrawable, setWithdrawable] = useState(0);
  const [isDeployer, setIsDeployer] = useState(false); // Contract deployer
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [userBalance, setUserBalance] = useState(null);

  const {
    id,
    creator,
    goal,
    deadline,
    fundsRaised,
    isClosed,
    isStopped,
    totalContributors,
    metadata,
  } = campaign;

  const {
    description="Loading description... Please wait.",
    image="blockfundr_profile.png",
    title="Loading title...",
    location="Loading location...",
  } = metadata || {}; // Default values in case metadata is null

  async function sendFunds(amount){
    setWalletDetected(true);  // remove the error bar if present
    if (window.ethereum === undefined) {
      setWalletDetected(false);
      return;
    }

    if (!signer) {
      setError(new Error("Please connect an account to proceed."));
      return;
    }

    try {
      setIsSending(true);
      setDisableNav(true);
      const amountInWei = ethers.parseEther(amount);
      const tx = await crowdfundContract.connect(signer).fundCampaign(id, { value: amountInWei });
      const txReceipt = await tx.wait();
      console.log("Transaction successful:", txReceipt);
      setFundAmount(0);
      fetchUserBalance();
    } catch (error) {
      console.error("Error sending funds:", error);
      if (error.code === "INSUFFICIENT_FUNDS") setError(new Error("Insufficient funds"));
      else if (error.code === "ACTION_REJECTED") setError(new Error("User rejected request."));
      else if (error.code === "CALL_EXCEPTION") setError(new Error(error?.reason || error.code));
      else setError(error);
    } finally {
      setIsSending(false);
      setDisableNav(false);
    }
  }

  async function withdraw() {
    try {
      setIsWithdrawing(true);
      setDisableNav(true);
      const tx = await crowdfundContract.connect(signer).withdrawFunds(id);
      const txReceipt = await tx.wait();
      console.log("Withdraw successful:", txReceipt);
      fetchUserBalance();
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      if (error.code === "ACTION_REJECTED") setError(new Error("User rejected request."));
      else if (error.code === "CALL_EXCEPTION") setError(new Error(error?.reason || error?.revert?.args[0]));
      else setError(error);
    } finally {
      setIsWithdrawing(false);
      setDisableNav(false);
    }
  }

  async function stopCampaign() {
    try {
      setIsStopping(true);
      setDisableNav(true);
      const tx = await crowdfundContract.connect(signer).stop(id);
      const txReceipt = await tx.wait();
      console.log("Campaign stopped successfully:", txReceipt);
    } catch (error) {
      console.error("Error stopping campaign:", error);
      if (error.code === "ACTION_REJECTED") setError(new Error("User rejected request."));
      else if (error.code === "CALL_EXCEPTION") setError(new Error(error?.reason || error?.revert?.args[0]));
      else setError(error);
    } finally {
      setIsStopping(false);
      setDisableNav(false);
    }
  }

  // TODO: return if account has not made any contributions
  async function requestRefund() {
    try {
      setIsRefunding(true);
      setDisableNav(true);
      const tx = await crowdfundContract.connect(signer).takeRefund(id);
      const txReceipt = await tx.wait();
      console.log("Refund requested successfully:", txReceipt);
      fetchUserBalance();
    } catch (error) {
      console.error("Error requesting refund:", error);
      if (error.code === "ACTION_REJECTED")
        setError(new Error("User rejected request."));
      else
        setError(error);
    } finally {
      setIsRefunding(false);
      setDisableNav(false);
    }
  }

  async function getFundedEvents(campaignId) {
    try {
      const filter = crowdfundContract.filters.Funded(campaignId);
      const latestBlock = await provider.getBlockNumber();
      const allEvents = [];

      for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
          const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
          const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
          allEvents.push(...events);
      }

      const eventsObjs = await Promise.all(
        allEvents.map(async (event) => {
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
    } catch (error) {
      console.error("Error fetching funded events:", error);
      return [];
    }
  }

  async function getRefundEvents(campaignId) {
    try {
      const filter = crowdfundContract.filters.Refunded(campaignId);
      const latestBlock = await provider.getBlockNumber();
      const allEvents = [];

      for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
          const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
          const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
          allEvents.push(...events);
      }

      const eventsObjs = await Promise.all(
        allEvents.map(async (event) => {
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
    } catch (error) {
      console.error("Error fetching funded events:", error);
      return [];
    }
  }

  async function getWithdrawEvent(campaignId) {
    try {
      const filter = crowdfundContract.filters.Withdrawn(null, creator);
      const latestBlock = await provider.getBlockNumber();
      const allEvents = [];

      for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
          const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
          const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
          allEvents.push(...events);
      }

      const filteredEvents = allEvents.filter((event) => event.args.campaignId.toString() === campaignId.toString());
      const event = filteredEvents[0];
      if (!event) return null; // No withdraw event found for this campaign

      const block = await provider.getBlock(event.blockNumber);

      return {
        campaignId: event.args.campaignId.toString(),
        creator: event.args.creator,
        amount: ethers.formatEther(event.args.amount),
        transactionHash: event.transactionHash,
        timestamp: block.timestamp,
      };
    } catch (error) {
      console.error("Error fetching withdraw event:", error);
      return null;
    }
  }

  async function getStopEvent(campaignId) {
    try {
      const filter = crowdfundContract.filters.Stopped();
      const latestBlock = await provider.getBlockNumber();
      const allEvents = [];

      for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
          const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
          const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
          allEvents.push(...events);
      }

      const filteredEvents = allEvents.filter((event) => event.args.campaignId.toString() === campaignId.toString());
      const event = filteredEvents[0];
      if (!event) return null; // No event found for this campaign

      const block = await provider.getBlock(event.blockNumber);

      return {
        campaignId: event.args.campaignId.toString(),
        byCreator: event.args.byCreator,
        transactionHash: event.transactionHash,
        timestamp: block.timestamp,
      };
    } catch (error) {
      console.error("Error fetching stop event:", error);
      return null;
    }
  }

  async function getWithdrawableAmount(){
    try {
      const withdrawableAmount = await crowdfundContract.calculateWithdrawAmount(id);
      setWithdrawable(ethers.formatEther(withdrawableAmount));
    } catch (error){
      console.error("Error fetching withdrawable amount:", error);
      setWithdrawable(0);
    }
  }

  async function fetchUserBalance() {
    if (!signer) return;

    try {
      const balance = await provider.getBalance(signer.address);
      setUserBalance(ethers.formatEther(balance.toString()));
    } catch (error) {
      console.error("Error fetching user balance:", error);
      setUserBalance(null);
    }
  }

  function getTimeRemainingStr(deadlineInSeconds){
    const timeRemainingObj = timeRemaining(deadline.toString());
    return  timeRemainingObj.days + " days " + 
            timeRemainingObj.hours + " hrs " +
            timeRemainingObj.minutes + " mins " +
            timeRemainingObj.seconds + " secs";
  }

  useEffect(() => {
    async function fetchHistory() {
      setIsLoadingHistory(true);
      setFundsHistory([]);
      setRefundHistory([]);
      setCloseEvent(null);

      const fundedEvents = await getFundedEvents(id);
      setFundsHistory(fundedEvents);

      if (isClosed) {
        if (isStopped) {  // Campaign was closed by stopping
          const stopEvent = await getStopEvent(id);
          setCloseEvent(stopEvent);

          const refundEvents = await getRefundEvents(id);  // only stopped campaigns can be refunded
          setRefundHistory(refundEvents);
        } else {  // Campaign was closed by withdrawing funds
          const withdrawEvent = await getWithdrawEvent(id);
          setCloseEvent(withdrawEvent);
        }
      }
      setIsLoadingHistory(false);
    }

    fetchHistory();
    getWithdrawableAmount();
    if (signer)
      setIsOwner(signer.address === campaign.creator);
    else setIsOwner(false);

    setTimeRemainingStr(getTimeRemainingStr(deadline));

    let updateTimeInterval;
    if (!isClosed){
      updateTimeInterval = setInterval(()=>{
      setTimeRemainingStr(getTimeRemainingStr(deadline));
      }, 1000);
    }

    // setError(null);

    return () => {
      if (!isClosed) clearInterval(updateTimeInterval);
    }
  }, [campaign]);

  useEffect(() => {
    if (!signer) {
      setIsOwner(false);
      setIsDeployer(false);
      return;
    }

    setIsOwner(signer.address === campaign.creator);
    fetchUserBalance();

    crowdfundContract.owner().then((deployerAddress) => {
      setIsDeployer(signer.address === deployerAddress);
    }).catch((error)=> {
      console.error("Error fetching deployer address:", error);
      setIsDeployer(false);
    });

  }, [signer]);

  return (
    <div className="campaignInfoCard">
      {error && <ErrorMessage message={error.message} setErrorMessage={setError}/>}
      <CancelBtn onClick={() => setShowCampaignInfo(null)} disabled={isRefunding || isSending || isStopping || isWithdrawing}/>
      <h1>{title}  #{id}</h1>
      <div className="campaignInfoCard-top">
        <div className="campaignInfoCard-topleft">
          <h3><u>Campaign Description</u></h3>
          <p>{description}</p>
          <p><strong>Creator:</strong> {creator}</p>
          <p><strong>Location:</strong> {location}</p>
          <p><strong>Goal:</strong> {ethers.formatEther(goal)} ETH</p>
          <p><strong>Funds Raised:</strong> {ethers.formatEther(fundsRaised)} ETH</p>
          {isOwner && <p><strong>Withdrawable Funds:</strong> {withdrawable} ETH (95%)</p>}
          {/* TODO: Show campaign duration */}
          {isClosed ? (<p><strong>Time Remaining:</strong> 0 days 0 hrs 0 mins 0 secs</p>) :
            (<p><strong>Time Remaining:</strong> {timeRemainingStr}</p>)
          }
          <p><strong>Backers:</strong> {totalContributors.toString()}</p>
        </div>
        <div className="campaignInfoCard-topright">
          <img src={image} alt="campaign logo" />
        </div>
      </div>
      <div className="campaignInfoCard-middle">
        {!isClosed &&
          <div className="camapignInfo-sendAmountContainer">
            {signer && <p>Account Balance: {userBalance === null ? "Loading" : userBalance.slice(0, 8)}</p>}
            <input type="number" min="0" value={fundAmount} placeholder="Enter amount in Eth" onChange={(e) => {setFundAmount(e.target.value)}} />
          </div>
        }
        <div className="camapignInfo-buttons">
          <button disabled={isSending || fundAmount <= 0 || isClosed || isStopping || inSafeMode} onClick={() => sendFunds(fundAmount)}>
            {isSending ? "Sending..." : isStopped ? "Stopped" : isClosed ? "Closed" : "Send Funds"}  {/* Priority left to right */}
          </button>
          {isOwner && !isClosed && (
            <button disabled={isSending || isWithdrawing || isStopping || inSafeMode} onClick={withdraw}>
              {isWithdrawing ? "Withdrawing..." : isClosed ? "Closed" : "Withdraw"}
            </button>
          )}
          {(isOwner || isDeployer) && !isClosed && (
            <button disabled={isSending || isWithdrawing || isStopping || inSafeMode} onClick={stopCampaign}>
              {isStopping ? "Stopping..." : "Stop"}
            </button>
          )}
          {isStopped && signer && !isOwner && (  // onwer can't take refund. Account must be connected to take refund
            <button disabled={isRefunding || inSafeMode} onClick={requestRefund}>
              {isRefunding ? "Sending..." : "Request refund"} {/* TODO: show refund amount */}
            </button>
          )}
        </div>
      </div>
      <div className="faucet-url">
        {!isClosed && faucetUrl && <a href={faucetUrl} target="_blank" rel="noopener noreferrer">Want some free test Ether?</a>}
      </div>
      <br />
      
      {isClosed && (
        <section className="overflow-section">
          <hr />
          <h2>Close History</h2>
          {isLoadingHistory && <p className="isLoadingContextText">Loading history from contract...</p>}
          {closeEvent && (
            <div className="close-event-details-container">
              <p><strong>Close Trigger:</strong> {isStopped ? "Stopped" : "Funds Withdrawn"}</p>
              {isStopped ?
                (<p><strong>Stopped by:</strong> {closeEvent.byCreator ? "By creator" : "By deployer"}</p>) :
                (<p><strong>Amount:</strong> {closeEvent.amount} ETH</p>)
              }
              <p>
                <strong>Transaction Hash:</strong>
                {" "}{closeEvent.transactionHash}{" "}
                <a href={blockExplorerUrl + closeEvent.transactionHash} target="_blank">
                  <FontAwesomeIcon icon={faLink} />
                </a>
              </p>
              <p><strong>Time:</strong> {new Date(closeEvent.timestamp * 1000).toLocaleString()}</p>
            </div>
          )}
          <br />
        </section>
      )}

      { isStopped && refundHistory.length > 0 && (
        <section className="overflow-section">
          <hr />
          <h2>Refunding History</h2>
          <table className="funding-table">
            <thead>
              <tr>
                <th>Backer</th>
                <th>Amount (ETH)</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {[...refundHistory].reverse().map((historyObj, index) => (
                <tr key={index}>
                  <td>
                    {historyObj.backer}{" "}
                    <a href={blockExplorerUrl + historyObj.transactionHash} target="_blank">
                      <FontAwesomeIcon icon={faLink} />
                    </a>
                  </td>
                  <td>{historyObj.amount.toString().slice(0, 12)}</td>
                  <td>{new Date(historyObj.timestamp * 1000).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <br />
        </section>
      )}
      <section className="overflow-section">
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
                <td>
                  {historyObj.backer}{" "}
                  <a href={blockExplorerUrl + historyObj.transactionHash} target="_blank">
                    <FontAwesomeIcon icon={faLink} />
                  </a>
                </td>
                <td>{historyObj.amount.toString().slice(0, 12)}</td>
                <td>{new Date(historyObj.timestamp * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoadingHistory && <p className="isLoadingContextText">Loading history from contract...</p>}
      </section>
    </div>
  );
};

export default CampaignDetails