import { forwardRef, useState, useEffect } from 'react';
import { formatEther } from "ethers";
import ConnectBtn from './ConnectBtn.jsx';

const NavBar = forwardRef((props, ref) => {
  const { walletDetected, address, contractAddress, provider, signer, setSigner, networkId, setWalletError, showForm, setShowForm, loadingNewCampaign, showCampaignInfo, setShowCampaignInfo } = props;

  const [contractBalance, setContractBalance] = useState(0);

  useEffect(() => {
    const fetchContractBalance = async () => {
      if (provider && contractAddress) {
        try {
          const balance = await provider.getBalance(contractAddress);
          setContractBalance(formatEther(balance));
        } catch (error) {
          setContractBalance(0);
          console.error("Error fetching contract balance:", error);
        }
      }
    };

    fetchContractBalance();

    const interval = setInterval(fetchContractBalance, 10000);
    return () => clearInterval(interval);
  }, [provider]);

  return (
    <nav ref={ref} className="navbar">
      <img src="blockfundr_cover.png" alt="logo"/>
      <p id="contract-balance">Balance:<br />{contractBalance.toString().slice(0, 7)} Eth</p>
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