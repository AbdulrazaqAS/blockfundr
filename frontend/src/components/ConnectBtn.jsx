function ConnectBtn({walletDetected, address}){
	return (
		<button className="connectBtn" disabled={!walletDetected}>
			{address ? (address.toString().slice(0, 7) + "..." + address.toString().slice(37)) : ("Connect Wallet")}
		</button>
	)
}

export default ConnectBtn