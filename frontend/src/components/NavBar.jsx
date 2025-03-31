import ConnectBtn from './ConnectBtn.jsx'

function NavBar({walletDetected, address, provider, signer, setSigner, setWalletError, networkId, showForm, setShowForm, loadingNewCampaign, showCampaignInfo, setShowCampaignInfo}){
	return (
		<div className="navbar">
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
		</div>
	)
}

export default NavBar