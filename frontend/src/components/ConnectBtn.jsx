import { useState } from "react";

function ConnectBtn({setWalletDetected, address, signer, setSigner, setWalletError, networkId}){
	const [isConnecting, setIsConnecting] = useState(false);

	async function connectWallet(){
		setWalletDetected(true);  // remove the error bar if present
		if (window.ethereum === undefined) {
		  setWalletDetected(false);
		  return;
		}
		
		try {
			setIsConnecting(true);
			console.log("NetworkID", networkId);
			const metamaskProvider = new ethers.BrowserProvider(window.ethereum);
			const newSigner = await metamaskProvider.getSigner(0);
			if (signer && (newSigner.address === signer.address)) {
				throw new Error("Already connected to this account. Use the wallet to disconnect or change account.");
			}

			console.log("Connected Signer:", newSigner);
			setSigner(newSigner);
			//changeToNetwork(networkId); // Seems not working
		} catch (error) {
			setWalletError(error);
			if (error.code === 4001) {
				console.log("User rejected request");
			} else if (error.code === -32002) {
				console.log("Request already pending");
			} else {
				console.error("Error connecting to wallet", error);
			}
			// setSigner(null);
		} finally {
			setIsConnecting(false);
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
			setAddress(null);
		}	
	}

	return (
		<button className="connectBtn" onClick={connectWallet} disabled={isConnecting}>
			{address ? (address.toString().slice(0, 7) + "..." + address.toString().slice(37))
				: isConnecting ? "Connecting..." : ("Connect Wallet")
			}
		</button>
	)
}

export default ConnectBtn