import { forwardRef, useState, useEffect } from 'react';
import { formatEther } from "ethers";
import ConnectBtn from './ConnectBtn.jsx';

const NavBar = forwardRef((props, ref) => {
  const { crowdfundContract, walletDetected, setWalletDetected, address, setCurrentTab, contractAddress, provider, signer, setSigner, networkId, setWalletError, disableNav, currentTab } = props;

  const [totalBalance, setTotalBalance] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);

  function changeTab(tab) {
    if (disableNav) return;
    setCurrentTab(tab);
  }

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
    <div ref={ref}>
      <div className="navbar navbar-top">
        <img src="blockfundr_cover.png" alt="logo"/>
        <div className="contract-balances-container">
          <p className="contract-balance">Total Eth<br />{totalBalance.toString().slice(0, 7)}</p>
          <p className="contract-balance">Contract Eth<br />{contractBalance.toString().slice(0, 7)}</p>
        </div>
        <ConnectBtn walletDetected={walletDetected} setWalletDetected={setWalletDetected} setWalletError={setWalletError} networkId={networkId} address={address} provider={provider} signer={signer} setSigner={setSigner}/>
      </div>
      <nav className="navbar navbar-bottom">
        <div
          className={`navbar-nav ${disableNav ? "disabled" : ""} ${currentTab === "campaigns" ? "active" : ""}`}
          onClick={() => changeTab("campaigns")}
        >
          Campaigns
        </div>
        <div
          className={`navbar-nav ${disableNav ? "disabled" : ""} ${currentTab === "newCampaign" ? "active" : ""}`}
          onClick={() => changeTab("newCampaign")}
        >
          New Campaign
        </div>
        <div
          className={`navbar-nav ${disableNav ? "disabled" : ""} ${currentTab === "contractPanel" ? "active" : ""}`}
          onClick={() => changeTab("contractPanel")}
        >
          Contract
        </div>
      </nav>
    </div>
  );
});

export default NavBar;