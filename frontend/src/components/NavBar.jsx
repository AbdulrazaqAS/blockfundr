import ConnectBtn from './ConnectBtn.jsx'

function NavBar({walletDetected, address, setCurrentAddress, showForm, setShowForm, loadingNewCampaign, showCampaignInfo, setShowCampaignInfo}){
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
			<ConnectBtn walletDetected={walletDetected} address={address} setCurrentAddress={setCurrentAddress}/>
		</div>
	)
}

export default NavBar