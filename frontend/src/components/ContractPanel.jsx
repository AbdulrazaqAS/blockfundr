import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

export default function ContractPanel({crowdfundContract, signer, provider, contractAddress, blockExplorerUrl, setDisableNav, reloadContractPanelVar }){
    const [isDeployer, setIsDeployer] = useState(false);
    const [amount, setAmount] = useState(0);
    const [isWithdraw, setIsWithdraw] = useState(true);
    const [receiverAddr, setReceiverAddr] = useState("");
    const [contractBalance, setContractBalance] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [fundsHistory, setFundsHistory] = useState([]);

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
            throw error;
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
            throw error;
        } finally {
            setIsSending(false);
            setDisableNav(false);
        }
    }

    async function getWithdrawEvents() {
        try {
            const filter = crowdfundContract.filters.ContractFundsWithdrawn();
            const events = await crowdfundContract.queryFilter(filter);
            
            const withdrawEvents = await Promise.all(
                events.map(async event => {
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
            const events = await crowdfundContract.queryFilter(filter);
            
            const withdrawEvents = await Promise.all(
                events.map(async event => {
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
            return withdrawEvents;
        } catch (error) {
            console.error("Error fetching funds increase events:", error);
            return [];
        }
    }

    async function getTransferEvents() {
        try {
            const filter = crowdfundContract.filters.ContractFundsTransferred();
            const events = await crowdfundContract.queryFilter(filter);
            
            const transferEvents = await Promise.all(
                events.map(async (event) => {
                const block = await provider.getBlock(event.blockNumber);
                return {
                    type: "transfer",
                    amount: ethers.formatEther(event.args.amount),
                    receiver: event.args.receiver,
                    transactionHash: event.transactionHash,
                    timestamp: block.timestamp,
                };
                }
            ));
            return transferEvents;
        } catch (error) {
            console.error("Error fetching transfer events:", error);
            return [];
        }
    }

    useEffect(() => {
        if (!provider || !contractAddress || !crowdfundContract) return;

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
    
        const interval = setInterval(fetchContractBalance, 1500);
        return () => clearInterval(interval);
      }, [provider, crowdfundContract]);

    useEffect(() => {
        if (!crowdfundContract) return;
        const fetchEvents = async () => {
            const withdrawEvents = await getWithdrawEvents();
            const transferEvents = await getTransferEvents();
            const increaseEvents = await getFundsIncreaseEvents();
            const allEvents = [...withdrawEvents, ...transferEvents, ...increaseEvents];
            allEvents.sort((a, b) => b.timestamp - a.timestamp);
            setFundsHistory(allEvents);
            console.log("Reloaded history");
        };
        fetchEvents();
        console.log("Called");
    }, [crowdfundContract, reloadContractPanelVar]);

    useEffect(() => {
        if (!crowdfundContract || !signer) return;
        const checkDeployer = async () => {
            const signerAddr = await signer.address;
            const contractOwner = await crowdfundContract.owner();
            setIsDeployer(signerAddr === contractOwner);
        };
        checkDeployer();
    }, [crowdfundContract, signer]);

    return (
        <div className="contract-panel">
            {isDeployer && <form onSubmit={(e) => {
                e.preventDefault();
                isWithdraw ? withdraw(amount) : transfer(amount, receiverAddr);
            }}>
                <h2>Contract Panel</h2>
                <fieldset>
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
                        </div>
                    }
                </div>
                <button
                    disabled={!signer || isSending || amount <= 0 || amount > contractBalance.toString() || (!isWithdraw && receiverAddr.length < 20)}
                    type="submit"
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
            </section>
        </div>
    )
}