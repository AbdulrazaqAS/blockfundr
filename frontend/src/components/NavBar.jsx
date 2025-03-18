import ConnectBtn from './ConnectBtn.jsx'

function NavBar({address}){
	return (
		<div className="navbar">
			<img src="/goteo-white.svg" alt="logo"/>
			<ConnectBtn address={address} />
		</div>
	)
}

export default NavBar