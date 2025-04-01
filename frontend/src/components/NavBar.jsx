import { forwardRef } from 'react';
import ConnectBtn from './ConnectBtn.jsx';

const NavBar = forwardRef((props, ref) => {
  const { walletDetected, address, provider, signer, setSigner, networkId, setWalletError, showForm, setShowForm, loadingNewCampaign, showCampaignInfo, setShowCampaignInfo } = props;

  return (
    <nav ref={ref} className="navbar">
      <img src="blockfundr_cover.png" alt="logo"/>
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