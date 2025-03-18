function Card(){
	return (
		<div className="card">
            <a href="#">
                <img id="card-img" src="campaign1.jpg" alt="logo"/>
            </a>
            <div id="card-info">
                <h3>By: 0x12345...bcdef</h3>
                <p>Are we in time to reverse our environmental impact on the planet and preserve its regenerative capacity?</p>
                <ul>
                    <li><strong>4.567 eth</strong><br />raised</li>
                    <li><strong>32 days</strong><br />remaining</li>
                </ul>
                <progress value={75} max={100} />
                <p>75% financed</p>
            </div>
        </div>
	)
}

export default Card