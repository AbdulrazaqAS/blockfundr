import ConnectBtn from './ConnectBtn.jsx'

function NavBar({address, showForm, setShowForm, loadingNewCampaign}){
	return (
		<div className="navbar">
			<img src="blockfundr_cover.png" alt="logo"/>
			<button onClick={() => setShowForm(!showForm)} disabled={loadingNewCampaign}>
				{showForm ? "Close Form" : "New Campaign"}
			</button>
			<ConnectBtn address={address} />
		</div>
	)
}

export default NavBar