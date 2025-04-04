import { forwardRef, useState, useEffect } from 'react';
import { formatEther } from "ethers";
import ConnectBtn from './ConnectBtn.jsx';

const NavBar = forwardRef((props, ref) => {
  const { crowdfundContract, walletDetected, address, contractAddress, provider, signer, setSigner, networkId, setWalletError, showForm, setShowForm, loadingNewCampaign, showCampaignInfo, setShowCampaignInfo } = props;

  const [totalBalance, setTotalBalance] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);

  useEffect(() => {
    const fetchContractBalance = async () => {
      if (provider && contractAddress && crowdfundContract) {
        try {
          const totalBalance = provider.getBalance(contractAddress);
          const contractBalance = crowdfundContract.contractBalance();
          Promise.all([totalBalance, contractBalance]).then((arr) => {
            setTotalBalance(formatEther(arr[0]));
            setContractBalance(formatEther(arr[1]));
          });
        } catch (error) {
          setTotalBalance(0);
          setContractBalance(0);
          console.error("Error fetching contract balance:", error);
        }
      }
    };

    fetchContractBalance();

    const interval = setInterval(fetchContractBalance, 10000);
    return () => clearInterval(interval);
  }, [provider, crowdfundContract]);

  return (
    <nav ref={ref} className="navbar">
      <img src="blockfundr_cover.png" alt="logo"/>
      <div className="contract-balances-container">
        <p className="contract-balance">Total Eth<br />{totalBalance.toString().slice(0, 7)}</p>
        <p className="contract-balance">Contract Eth<br />{contractBalance.toString().slice(0, 7)}</p>
      </div>
      <button onClick={() => setShowForm(!showForm)} disabled={loadingNewCampaign}>
        {showForm ? "Close Form" : "New Campaign"}
      </button>
      {showCampaignInfo && (
        <button onClick={() => setShowCampaignInfo(null)} >
          Close Info
        </button>
      )}
      <ConnectBtn walletDetected={walletDetected} setWalletError={setWalletError} networkId={networkId} address={address} provider={provider} signer={signer} setSigner={setSigner}/>
    </nav>
  );
});

export default NavBar;