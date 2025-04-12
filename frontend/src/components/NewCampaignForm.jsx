import { useEffect, useState } from "react";
import axios from "axios";
import {parseEther, formatEther} from "ethers";

import ErrorMessage from "./ErrorMessage";

function convertDateToSeconds(date){
    return Math.floor(new Date(date).getTime() / 1000);
}

function calculateDuration(date){
    const dateInSeconds = convertDateToSeconds(date);
    const currentTime = Math.floor(Date.now() / 1000);
    return dateInSeconds - currentTime;
}

export default function CreateCampaign({ crowdfundContract, setWalletDetected, signer, setDisableNav, inSafeMode, blockExplorerUrl }) {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [newCampaignTxHash, setNewCampaignTxHash] = useState("");
  const [error, setError] = useState(null);
  const [minGoal, setMinGoal] = useState();
  const [minDuration, setMinDuration] = useState();
  const [maxUserCampaigns, setMaxUserCampaigns] = useState(0);
  const [userCampaigns, setUserCampaigns] = useState(0);
  const [isDeployer, setIsDeployer] = useState(false); // Contract deployer
  const [loadingNewCampaign, setLoadingNewCampaign] = useState(false);
  const [noNewCampaignsMode, setNoNewCampaignsMode] = useState(false);

  useEffect(() => {
    if (!crowdfundContract) return;

    try {
      const minDuration = crowdfundContract.MIN_DURATION();
      const minGoal = crowdfundContract.MIN_GOAL();
      const noNewCampaignsMode = crowdfundContract.noNewCampaigns();
      Promise.all([minDuration, minGoal, noNewCampaignsMode]).then((arr)=>{
        setMinDuration(arr[0]);
        setMinGoal(arr[1]);
        setNoNewCampaignsMode(arr[2]);

        // bigint => number won't lose precision here. Added one day to account for passed hrs of the current day.
        const minSeconds = (Date.now() / 1000) + Number(arr[0]) + (24 * 60 * 60);
        const minDate = new Date(minSeconds * 1000).toISOString().split("T")[0];
        setDeadline(minDate);
        setGoal(formatEther(arr[1]));
      });
    } catch (error) {
      console.error("Error reading values from contract:", error);
      setError(error);
    }
  }, [crowdfundContract]);

  useEffect(() => {
    if (!signer || !crowdfundContract) return;

    try {
      const userCampaigns = crowdfundContract.usersCampaigns(signer.address);
      const maxUserCampaigns = crowdfundContract.MAX_CAMPAIGNS();
      const deployerAddress = crowdfundContract.owner();
      Promise.all([userCampaigns, maxUserCampaigns, deployerAddress]).then((arr)=>{
        setUserCampaigns(arr[0]);
        setMaxUserCampaigns(arr[1]);
        setIsDeployer(arr[2] === signer.address);
      });
    } catch (error) {
      console.error("Error reading values from contract:", error);
      setError(error);
    }
  }, [signer, crowdfundContract]);

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  async function newCampaign(metadataUrl, goal, duration){
    try {
      const txResponse = await crowdfundContract.connect(signer).createCampaign(metadataUrl, goal, duration);
      const txReceipt = await txResponse.wait();
      //TODO: Display tx link on etherscan
      return txReceipt;
    } catch (error) {
      console.error("Error creating new campaign:", error);
      return null;
    }
  }

  const uploadToIPFS = async () => {
    try {
      const formData = new FormData();
      formData.set("image", image);
      formData.set("title", title);
      formData.set("description", description);
      formData.set("location", location);
      formData.set("totalCampaigns", await crowdfundContract.campaignCount());
      
      // Detect local vs production
      // const isLocalhost = window.location.hostname === "localhost";
      const isDev = import.meta.env.DEV; // true in dev, false in build
      
      const endpoint = isDev
        ? "http://localhost:5000/api/uploadToIPFS"
        : "/api/uploadToIPFS";
      console.log("Endpoint:", endpoint);
  
      const response = await axios.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Response:", response);
      const result = response.data;

      // const response1 = await fetch(endpoint, {
      //   method: "POST",
      //   body: formData,  // No need for content-type header, fetch will set it automatically (doing so might break the boundary).
      // });
      // const result1 = await response1.json();  // .json() is used to parse the response body
      // if (response.ok) {}  // ok if status is 200-299
      
      // console.log("Response:", response1);
      // console.log("Response: awaited .json:", result1);
  
      if (response.statusText === "OK" || response.status === 200) {
        setIpfsUrl(result.metadataUrl);
        return result.metadataUrl;
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      setIpfsUrl("");
      console.error("Error uploading to IPFS:", error);
      setError(error);
      return null;
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    setWalletDetected(true);  // remove the error bar if present
    if (window.ethereum === undefined) {
      setWalletDetected(false);
      return;
    }

    if (!signer) {
      setError(new Error("Please connect an account to proceed."));
      return;
    }

    setLoadingNewCampaign(true);
    setDisableNav(true);  // Disable nav bar while creating campaign
    setIpfsUrl("");  // Clear previous IPFS URL
    setNewCampaignTxHash("");
    setError(null);  // Clear previous error

    const ipfsLink = await uploadToIPFS();
    if (!ipfsLink){
      setLoadingNewCampaign(false);
      setDisableNav(false);
      return;
    }

    console.log("IPFS Link:", ipfsLink);

    const duration = calculateDuration(deadline);
    const goalInWei = parseEther(goal);
    const txReceipt = await newCampaign(ipfsLink, goalInWei, duration);

    if (!txReceipt){
      setLoadingNewCampaign(false);
      setDisableNav(false);
      alert("Failed to create new campaign. Please try again.");
      return;
    }
    setNewCampaignTxHash(txReceipt.transactionHash);
    console.log("New campaign created successfully:", txReceipt);

    if (signer){ // signer maybe null if just connected by clicking the create campaign button due async nature of updating state var.
      crowdfundContract.usersCampaigns(signer.address).then((val)=>{
        setUserCampaigns(val);
      }).catch((error)=>{
        console.error("Error reading user campaigns count:", error);
        setError(error);
      });
    }

    setLoadingNewCampaign(false);
    setDisableNav(false);
    setTitle("");
    setDescription("");
    setLocation("");
    setGoal(formatEther(minGoal));
    
    // bigint => number won't lose precision here. Added one day to account for passed hrs of the current day.
    const minSeconds = (Date.now() / 1000) + Number(minDuration) + (24 * 60 * 60);
    const minDate = new Date(minSeconds * 1000).toISOString().split("T")[0];
    setDeadline(minDate);
  };

  return (
    <div id="newCampaignContainer">
      <form onSubmit={handleSubmit}>
        <h2>Create a New Campaign</h2>
        {signer && !isDeployer && crowdfundContract && <p style={{textAlign:"center"}}>Non-contract deployer can only have {maxUserCampaigns} active campaigns. You have {userCampaigns} active campaigns.</p>}
        {noNewCampaignsMode && <ErrorMessage message={"Contract creation is currently disabled. Try again later."} />}
        {error && <ErrorMessage message={error.message} />}
        <div className="formFieldBox">
            <label>Cover Image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} required/>
        </div>
        
        <div className="formFieldBox">
            <label>Title</label>
            <input type="text" minLength="30" maxLength="70" value={title} placeholder="Enter campaign title..." onChange={(e) => setTitle(e.target.value)} required/>
        </div>

        <div className="formFieldBox">
            <label>Description</label>
            <textarea minLength="100" maxLength="300" value={description} placeholder="Enter campaign description..." onChange={(e) => setDescription(e.target.value)} required/>
        </div>

        <div className="formFieldBox">
            <label>Location</label>
            <input minLength="4" maxLength="20" value={location} placeholder="City, Country" onChange={(e) => setLocation(e.target.value)} required/>
        </div>

        <div className="formFieldBox">
            <label>Goal (ETH)</label>
            <input type="number" placeholder="Target amount" value={goal} onChange={(e) => setGoal(e.target.value)} required />
            {minGoal && goal < formatEther(minGoal) && <p className="red-p">Minimum goal is {formatEther(minGoal)} ETH</p>}
        </div>

        <div className="formFieldBox">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            {minDuration && calculateDuration(deadline) < minDuration && <p className="red-p">Minimum duration is {minDuration} seconds</p>}
        </div>
        {ipfsUrl && (
          <p style={{marginBottom:"10px"}}>
            IPFS Link: <a href={ipfsUrl} target="_blank" rel="noopener noreferrer">{ipfsUrl}</a>
          </p>
        )}
        {newCampaignTxHash && (
          <p style={{marginBottom:"10px"}}>
            Tx Hash: <a href={blockExplorerUrl + newCampaignTxHash} target="_blank" rel="noopener noreferrer">{newCampaignTxHash}</a>
          </p>
        )}
        
        <button type="submit" disabled={
            noNewCampaignsMode ||
            !crowdfundContract ||
            inSafeMode ||
            loadingNewCampaign || 
            error || 
            (minGoal && goal < formatEther(minGoal)) || 
            (minDuration && calculateDuration(deadline) < minDuration) ||
            (signer && !isDeployer && userCampaigns >= maxUserCampaigns)  // considering signer so that if the user is not connected, the button is enabled to get connected. Bcoz if no signer userCampaigns = maxUserCampaigns = 0 and that will disable the btn.
            }
        >
          {loadingNewCampaign ? ipfsUrl ? "Creating campaign..." : "Uploading to IPFS..." : "Create Campaign"}
        </button>
      </form>
    </div>
  );
}