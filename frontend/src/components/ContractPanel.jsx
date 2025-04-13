import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import ErrorMessage from "./ErrorMessage";

export default function ContractPanel({crowdfundContract, signer, provider, blockExplorerUrl, logsChunkSize, deploymentBlock, setDisableNav, reloadContractPanelVar, inSafeMode, setInSafeMode }){
    const [isDeployer, setIsDeployer] = useState(false);
    const [deployerAddr, setDeployerAddr] = useState("");
    const [amount, setAmount] = useState(0);
    const [isWithdraw, setIsWithdraw] = useState(true);
    const [receiverAddr, setReceiverAddr] = useState("");
    const [contractBalance, setContractBalance] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [fundsHistory, setFundsHistory] = useState([]);
    const [isSwitchingSafeMode, setIsSwitchingSafeMode] = useState(false);
    const [isSwitchingCampaignsMode, setIsSwitchingCampaignsMode] = useState(false);
    const [noNewCampaignsMode, setNoNewCampaignsMode] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    async function withdraw(amount){
        try {
            setIsSending(true);
            setDisableNav(true);
            const amountInWei = ethers.parseEther(amount);
            const tx = await crowdfundContract.connect(signer).withdraw(amountInWei);
            const txReceipt = await tx.wait();
            console.log("Funds succesfully withdrawn:", txReceipt);

            setAmount(0);
        } catch (error) {
            console.error("Error withdrawing funds:", error);
            if (error.code === "ACTION_REJECTED") setErrorMessage("User rejected request.");
            else if (error.code === "CALL_EXCEPTION") setErrorMessage(error?.reason || error?.revert?.args[0]);
            else setErrorMessage(error.message);
        } finally {
            setIsSending(false);
            setDisableNav(false);
        }
    }

    async function transfer(amount, address){
        try {
            setIsSending(true);
            setDisableNav(true);
            const amountInWei = ethers.parseEther(amount);
            const tx = await crowdfundContract.connect(signer).transfer(amountInWei, address);
            const txReceipt = await tx.wait();
            console.log("Funds succesfully trnaferred:", txReceipt);

            setAmount(0);
            setReceiverAddr("");
        } catch (error) {
            console.error("Error transferring funds:", error);
            if (error.code === "ACTION_REJECTED") setErrorMessage("User rejected request.");
            else if (error.code === "CALL_EXCEPTION") setErrorMessage(error?.reason || error?.revert?.args[0]);
            else setErrorMessage(error.message);
        } finally {
            setIsSending(false);
            setDisableNav(false);
        }
    }

    async function getWithdrawEvents() {
        try {
            const filter = crowdfundContract.filters.ContractFundsWithdrawn();
            const latestBlock = await provider.getBlockNumber();
            const allEvents = [];
    
            for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
                const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
                const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
                allEvents.push(...events);
            }
            
            const withdrawEvents = await Promise.all(
                allEvents.map(async event => {
                const block = await provider.getBlock(event.blockNumber);
                return {
                    type: "withdraw",
                    amount: ethers.formatEther(event.args.amount),
                    transactionHash: event.transactionHash,
                    timestamp: block.timestamp,
                };
                }
            ));
            return withdrawEvents;
        } catch (error) {
            console.error("Error fetching withdraw events:", error);
            return [];
        }
    }
    
    async function getFundsIncreaseEvents() {
        try {
            const filter = crowdfundContract.filters.ContractFundsIncreased();
            const latestBlock = await provider.getBlockNumber();
            const allEvents = [];
    
            for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
                const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
                const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
                allEvents.push(...events);
            }
            
            const increaseEvents = await Promise.all(
                allEvents.map(async event => {
                const block = await provider.getBlock(event.blockNumber);
                return {
                    type: "increased",
                    actionType: event.args.actionType,
                    campaignId: event.args.campaignId,
                    amount: ethers.formatEther(event.args.amount),
                    transactionHash: event.transactionHash,
                    timestamp: block.timestamp,
                };
                }
            ));
            return increaseEvents;
        } catch (error) {
            console.error("Error fetching funds increase events:", error);
            return [];
        }
    }

    async function getTransferEvents() {
        try {
            const filter = crowdfundContract.filters.ContractFundsTransferred();
            const latestBlock = await provider.getBlockNumber();
            const allEvents = [];
    
            for (let fromBlock = deploymentBlock; fromBlock <= latestBlock; fromBlock += logsChunkSize) {
                const toBlock = Math.min(fromBlock + logsChunkSize - 1, latestBlock);
                const events = await crowdfundContract.queryFilter(filter, fromBlock, toBlock);
                allEvents.push(...events);
            }
    
            const transferEvents = await Promise.all(
                allEvents.map(async (event) => {
                    const block = await provider.getBlock(event.blockNumber);
                    return {
                        type: "transfer",
                        amount: ethers.formatEther(event.args.amount),
                        receiver: event.args.receiver,
                        transactionHash: event.transactionHash,
                        timestamp: block.timestamp,
                    };
                })
            );
    
            return transferEvents;
        } catch (error) {
            console.error("Error fetching transfer events:", error);
            return [];
        }
    }    

    async function switchSafeMode() {
        try {
            setIsSwitchingSafeMode(true);
            setDisableNav(true);
            const tx = await crowdfundContract.connect(signer).setSafeMode(!inSafeMode);
            await tx.wait();
            setInSafeMode(!inSafeMode);

            console.log("Succesfully switched safe mode.");
        } catch (error) {
            console.error("Error switching safe mode:", error);
            if (error.code === "ACTION_REJECTED") setErrorMessage("User rejected request.");
            else if (error.code === "CALL_EXCEPTION") setErrorMessage(error?.reason || error?.revert?.args[0]);
            else setErrorMessage(error.message);
        } finally {
            setIsSwitchingSafeMode(false);
            setDisableNav(false);
        }
    }
        
    async function switchNoNewCampaignsMode() {
        try {
            setIsSwitchingCampaignsMode(true);
            setDisableNav(true);
            const tx = await crowdfundContract.connect(signer).setNoNewCampaigns(!noNewCampaignsMode);
            await tx.wait();
            setNoNewCampaignsMode(!noNewCampaignsMode);

            console.log("Succesfully switched campaigns creation mode.");
        } catch (error) {
            console.error("Error switching campaigns creation mode:", error);
            if (error.code === "ACTION_REJECTED") setErrorMessage("User rejected request.");
            else if (error.code === "CALL_EXCEPTION") setErrorMessage(error?.reason || error?.revert?.args[0]);
            else setErrorMessage(error.message);
        } finally {
            setIsSwitchingCampaignsMode(false);
            setDisableNav(false);
        }
    }

    useEffect(() => {
        if (!crowdfundContract) return;
        const fetchEvents = async () => {
            const withdrawEvents = await getWithdrawEvents();
            const transferEvents = await getTransferEvents();
            const increaseEvents = await getFundsIncreaseEvents();
            const allEvents = [...withdrawEvents, ...transferEvents, ...increaseEvents];
            allEvents.sort((a, b) => b.timestamp - a.timestamp);
            setFundsHistory(allEvents);
            setIsLoadingHistory(false);
        };

        const fetchContractBalance = async () => {
            try {
              const contractBalance = await crowdfundContract.contractBalance();
              setContractBalance(ethers.formatEther(contractBalance));
            } catch (error) {
              setContractBalance(0);
              console.error("Error fetching contract balance:", error);
            }
        };

        fetchContractBalance();
        fetchEvents();  // TODO: Fix: reloading 3 events on dependency change from the first block is time consuming 
    
        const interval = setInterval(fetchContractBalance, 1500);  // TODO: Check whether the timer is still required bcoz reloadContractPanelVar as dependency should do the work 
        return () => clearInterval(interval);
    }, [crowdfundContract, reloadContractPanelVar]);

    useEffect(() => {
        if (!crowdfundContract || !signer) return;
        const checkDeployer = async () => {
            const signerAddr = await signer.address;
            const contractOwner = await crowdfundContract.owner();
            const noNewCampaignsMode = await crowdfundContract.noNewCampaigns();
            setDeployerAddr(contractOwner);
            setIsDeployer(signerAddr === contractOwner);
            setNoNewCampaignsMode(noNewCampaignsMode);
        };
        checkDeployer();
    }, [crowdfundContract, signer]);

    return (
        <div className="contract-panel">
            {errorMessage && <ErrorMessage message={errorMessage} setErrorMessage={setErrorMessage} />}
            <h2>Contract State</h2>
            <section className="contract-state-container">
                <fieldset className="contract-state-option">
                    <legend>Safe Mode</legend>
                    <p>{inSafeMode ? "Active": "Inactive"}</p>
                    {isDeployer &&
                        <button className="contract-panel-btn" onClick={switchSafeMode} disabled={isSwitchingSafeMode || isSending || isSwitchingCampaignsMode}>
                            {isSwitchingSafeMode ? "Switching..." : inSafeMode ? "Deactivate" : "Activate"}
                        </button>
                    }
                </fieldset>
                <fieldset className="contract-state-option">
                    <legend>No New Campaigns Mode</legend>
                    <p>{noNewCampaignsMode ? "Active": "Inactive"}</p>
                    {isDeployer &&
                        <button className="contract-panel-btn" onClick={switchNoNewCampaignsMode} disabled={isSwitchingSafeMode || isSending || inSafeMode || isSwitchingCampaignsMode}>
                            {isSwitchingCampaignsMode ? "Switching..." : noNewCampaignsMode ? "Deactivate" : "Activate"}
                        </button>
                    }
                </fieldset>
            </section>
            {isDeployer && <form onSubmit={(e) => {
                e.preventDefault();
                isWithdraw ? withdraw(amount) : transfer(amount, receiverAddr);
            }}>
                <h2>Contract Funds</h2>
                <fieldset id="deployer-panel">
                    <legend>Select action type:</legend>
                    <label><input type="radio" name="action-type" value="withdraw" checked={isWithdraw} onChange={() => setIsWithdraw(true)} />Withdraw</label>
                    <label><input type="radio" name="action-type" value="transfer" checked={!isWithdraw} onChange={() => setIsWithdraw(false)} />Transfer</label>
                </fieldset>
                <div>
                    <div className="formFieldBox">
                        <label>Amount</label>
                        <input
                            type="number"
                            placeholder="Amount in eth"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {amount > contractBalance && <p className="red-p">Max available funds is {contractBalance}</p>}
                    </div>
                    {!isWithdraw &&
                        <div className="formFieldBox">
                            <label>Receiver</label>
                            <input
                                type="text"
                                placeholder="Receiver Address"
                                value={receiverAddr}
                                onChange={(e) => setReceiverAddr(e.target.value)}
                            />
                            {receiverAddr === deployerAddr && <p className="red-p">Receiver address same as deployer address, use "Withdraw" instead</p>}
                        </div>
                    }
                </div>
                <button
                    disabled={isSending || amount <= 0 || amount > contractBalance.toString() || (!isWithdraw && receiverAddr.length < 40) || (!isWithdraw && receiverAddr === deployerAddr) || inSafeMode }
                    type="submit"
                    id="contract-panel-send-btn"
                    className="contract-panel-btn"
                >
                    {isSending ? "Sending..." : isWithdraw ? "Withdraw" : "Transfer"}
                </button>
                <hr />
            </form>
            }
            <section className="overflow-section">
                <h2>Contract Funds History</h2>
                <table className="funding-table">
                    <thead>
                    <tr>
                        <th>Type</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount (ETH)</th>
                        <th>Date</th>
                    </tr>
                    </thead>
                    <tbody>
                    {[...fundsHistory].map((historyObj, index) => (
                        <tr key={index}>
                        <td>
                            {historyObj.type.toUpperCase()}
                            {" "}
                            <a href={blockExplorerUrl + historyObj.transactionHash} target="_blank">
                            <FontAwesomeIcon icon={faLink} />
                            </a>
                        </td>
                        <td>{historyObj.type === "increased" ?
                                "Campaign#" + historyObj.campaignId :
                                "Contract"  // For withdraw and transfer events
                            }
                        </td>
                        <td>
                            {historyObj.type === "transfer" ? historyObj.receiver :
                             historyObj.type === "withdraw" ? "Deployer" :
                             "Contract Balance"
                            }
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
    )
}