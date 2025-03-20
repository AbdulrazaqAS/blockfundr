import { ethers } from "ethers"
import ConnectBtn from './ConnectBtn.jsx'

function NavBar({address, crowdfund}){
	// TODO: clicking the btn multiple time quickly should be handled.
	// Only if the first has been mined, else discard the subsequent clicks.
	let newCampaign = async () => {
		const metadataUrl = "https://cominglater.com/json"
		const goal = ethers.parseEther("10");
		const duration = 24 * 60 * 60 // 1 day
		const tx = await crowdfund.createCampaign(metadataUrl, goal, duration);
		await tx.wait();
		
		// const campaigns = await crowdfund.campaignCount();
		// setTotalCampaigns(campaigns.toString());
	}

	return (
		<div className="navbar">
			<img src="/goteo-white.svg" alt="logo"/>
			<button onClick={newCampaign}>New Campaign</button>
			<ConnectBtn address={address} />
		</div>
	)
}

export default NavBar