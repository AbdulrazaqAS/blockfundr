function ConnectBtn({walletDetected, address, setCurrentAddress}){
	async function connectWallet(){
		const [address] = await window.ethereum.request({method: 'eth_requestAccounts'});
		setCurrentAddress(address);
	}

	// Checks/changes network
	function changeToNetwork(networkId){
		if (window.ethereum.networkVersion !== networkId) {
			switchNetwork();
		}
	}

	// Switches network
	async function switchNetwork(networkId){
		const networkIdHex = `0x${networkId.toString(16)}`;
		await window.ethereum.request({
			method: "wallet_switchEthereumChain",
			params: [{chainId: networkIdHex}]
		});
		
	}

	return (
		<button className="connectBtn" onClick={connectWallet} disabled={!walletDetected}>
			{address ? (address.toString().slice(0, 7) + "..." + address.toString().slice(37)) : ("Connect Wallet")}
		</button>
	)
}

export default ConnectBtn