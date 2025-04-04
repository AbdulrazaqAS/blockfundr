import { useEffect, useState } from "react";
import {formatEther} from "ethers";

function timeRemaining(deadlineInSeconds) {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    let remaining = deadlineInSeconds - now;

    if (remaining <= 0) {
        return {days:0, hours:0, minutes:0, seconds:0};
    }

    const days = Math.floor(remaining / (24 * 3600));
    remaining %= 24 * 3600;  // Factor out days
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;  // Factor out hours
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return {days, hours, minutes, seconds};
}

function getTimeRemaining(deadlineInSeconds) {
    const time = timeRemaining(deadlineInSeconds);
    if (time.days) return ["Days", time.days];
    if (time.hours) return ["Hrs", time.hours];
    if (time.minutes) return ["Mins", time.minutes];
    return ["Secs", time.seconds];
}

function getPercentage(part, total) {
    if (total === 0) return null;
    return Math.floor((part / total) * 100);
}


function Card({id, creator, metadataUrl, goal, deadline, fundsRaised, isClosed, isStopped, setShowCampaignInfo, scrollToCampaignInfo}){
    const [metadata, setMetadata] = useState(null);

    const defaultTitle = "Error loading description. Try refreshing.";
    const timeRemainingStr = getTimeRemaining(deadline.toString()); // returns [str, int]

    async function loadMetadata(url) {
        try {
            const response = await fetch(url);
            const metadata = await response.json();
            
            return metadata;
        } catch (error) {
            console.error("Error loading metadata:", error);
            return null;
        }
    }

    function handleClick() {
        setShowCampaignInfo({id, metadata, isClosed});
        scrollToCampaignInfo();
    }

    useEffect(() => {
        loadMetadata(metadataUrl).then((val) => {
            setMetadata(val);
        });
    }, []);

	return (
		<div className="card" onClick={handleClick}>
            <img id="card-img" src={metadata ? metadata.image : "blockfundr_profile.png"} alt="campaign-cover-image"/>
            <div id="card-info">
                <h3>By: {creator.slice(0, 7) + "....." + creator.slice(37)}</h3>
                <p className="card-description">{metadata ? metadata.title : defaultTitle}</p>
                <ul>
                    <li><strong>{formatEther(fundsRaised).toString().slice(0, 7)} Eth</strong><br />raised</li>
                    <li className="divider-line"></li>
                    {!isClosed ?
                        (<li><strong>{timeRemainingStr[1]} {timeRemainingStr[0]}</strong><br />remaining</li>) :
                        isStopped ?
                            (<h1 className="card-refund-text">Refundable</h1>) :
                            (<h1 className="card-closed-text">Closed</h1>)
                    }
                </ul>
                <progress value={fundsRaised.toString()} max={goal.toString()} />
                <p>{getPercentage(fundsRaised.toString(), goal.toString())}% financed</p>
            </div>
        </div>
	)
}

export default Card