import { useState } from "react";
import {ethers} from "ethers";

function ConnectBtn({setWalletDetected, network, address, signer, setSigner, setWalletError}){
	const [isConnecting, setIsConnecting] = useState(false);

	async function connectWallet(){
		setWalletDetected(true);  // remove the error bar if present
		if (window.ethereum === undefined) {
		  setWalletDetected(false);
		  return;
		}
		
		try {
			setIsConnecting(true);
			const metamaskProvider = new ethers.BrowserProvider(window.ethereum);
			const newSigner = await metamaskProvider.getSigner(0);
			if (signer && (newSigner.address === signer.address)) {
				throw new Error("Already connected to this account. Use the wallet to disconnect or change account.");
			}

			console.log("Connected Signer:", newSigner);
			setSigner(newSigner);
			changeToNetwork(network.chainId); // Not working: Always not finding network in wallet
		} catch (error) {
			setWalletError(error.message);
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
			let msg = "";
			if (error.code === 4902) {
				msg = `Network ${network} not found, please add it to your wallet. Or switch to it manually.`
			} else if (error.code === 4001) {
				msg = "User rejected request."
			} else {
				msg = "Error switching network.";
			}

			console.error(msg, error);
			setWalletError(msg);
		}	
	}

	async function addSepoliaNetwork() {
		const networkId = 11155111;
		try {
			await window.ethereum.request({
				method: "wallet_addEthereumChain",
				params: [
					{
					chainId: `0x${networkId.toString(16)}`,
					chainName: "Sepolia Testnet",
					nativeCurrency: {
						name: "SepoliaETH",
						symbol: "SepoliaETH",
						decimals: 18,
					},
					rpcUrls: ["https://sepolia.infura.io/v3/"],
					blockExplorerUrls: ["https://sepolia.etherscan.io/"],
					},
				],
			});
		} catch (error) {
			console.error("Error adding network:", error);
			setWalletError("Error adding network. Please add it manually.");
		}
	}

	return (
		<button className="connectBtn" onClick={connectWallet} disabled={isConnecting || !network}>  {/* SHould be disabled if network obj has not been populated */}
			{address ? (address.toString().slice(0, 7) + "..." + address.toString().slice(37))
				: isConnecting ? "Connecting..." : ("Connect Wallet")
			}
		</button>
	)
}

export default ConnectBtn