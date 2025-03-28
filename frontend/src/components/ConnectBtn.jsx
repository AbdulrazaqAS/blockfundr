function ConnectBtn({address}){
	return (
		<button className="connectBtn">
			{address ? (address.toString().slice(0, 7) + "..." + address.toString().slice(37)) : ("Connect Wallet")}
		</button>
	)
}

export default ConnectBtn