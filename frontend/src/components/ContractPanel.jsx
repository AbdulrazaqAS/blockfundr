import { ethers } from "ethers";
import { useEffect, useState } from "react";

export default function ContractPanel({crowdfundContract, signer, provider, contractAddress}){
    const [isDeployer, setIsDeployer] = useState(false);
    const [amount, setAmount] = useState(0);
    const [isWithdraw, setIsWithdraw] = useState(true);
    const [receiverAddr, setReceiverAddr] = useState("");
    const [contractBalance, setContractBalance] = useState(0);
    const [isSending, setIsSending] = useState(false);

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

    async function withdraw(amount){
        try {
            setIsSending(true);
            const amountInWei = ethers.parseEther(amount);
            const tx = await crowdfundContract.connect(signer).withdraw(amountInWei);
            const txReceipt = await tx.wait();
            console.log("Funds succesfully withdrawn:", txReceipt);

            setAmount(0);
        } catch (error) {
            throw error;
        } finally {
            setIsSending(false);
        }
    }

    async function transfer(amount, address){
        try {
            setIsSending(true);
            const amountInWei = ethers.parseEther(amount);
            const tx = await crowdfundContract.connect(signer).transer(amountInWei, address);
            const txReceipt = await tx.wait();
            console.log("Funds succesfully trnaferred:", txReceipt);

            setAmount(0);
            setReceiverAddr("");
        } catch (error) {
            throw error;
        } finally {
            setIsSending(false);
        }
    }

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
            <h2>Contract Panel</h2>
            {isDeployer && <form onSubmit={(e) => {
                e.preventDefault();
                isWithdraw ? withdraw(amount) : transfer(amount, address);
            }}>
                <fieldset>
                    <legend>Select action type:</legend>
                    <label><input type="radio" name="action-type" value="withdraw" checked={isWithdraw} onChange={() => setIsWithdraw(true)} />Withdraw</label>
                    <label><input type="radio" name="action-type" value="transfer" checked={!isWithdraw} onChange={() => setIsWithdraw(false)} />Transfer</label>
                </fieldset>
                <div className="">
                    <div className="formFieldBox">
                        <label>Amount</label>
                        <input
                            type="number"
                            placeholder="Amount in eth"
                            min={0}
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
            </form>
            }
        </div>
    )
}