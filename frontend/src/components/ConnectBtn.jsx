function ConnectBtn({walletDetected, address, setWalletError, networkId, setCurrentAddress}){
	async function connectWallet(){
		try {
			console.log("NetworkID", networkId);
			const [address] = await window.ethereum.request({method: 'eth_requestAccounts'});
			setCurrentAddress(address);
			changeToNetwork(networkId);
		} catch (error) {
			setWalletError(error);
			if (error.code === 4001) {
				console.log("User rejected request");
			} else if (error.code === -32002) {
				console.log("Request already pending");
			} else {
				console.error("Error connecting to wallet", error);
			}
			setCurrentAddress(null);
		}
	}

	// Checks/changes network
	function changeToNetwork(networkId){
		if (window.ethereum.networkVersion !== networkId) {
			switchNetwork(networkId);
		}
	}

	// Switches network
	async function switchNetwork(networkId){
		try {
			const networkIdHex = `0x${networkId.toString(16)}`;
			await window.ethereum.request({
				method: "wallet_switchEthereumChain",
				params: [{chainId: networkIdHex}]
			});
		} catch (error) {
			setWalletError(error);
			if (error.code === 4902) {
				console.error("Network not found, please add it to your wallet");
			} else if (error.code === 4001) {
				console.error("User rejected request");
			} else {
				console.error("Error switching network", error);
			}
			setCurrentAddress(null);
		}	
	}

	return (
		<button className="connectBtn" onClick={connectWallet} disabled={!walletDetected}>
			{address ? (address.toString().slice(0, 7) + "..." + address.toString().slice(37)) : ("Connect Wallet")}
		</button>
	)
}

export default ConnectBtn