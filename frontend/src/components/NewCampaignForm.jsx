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

export default function CreateCampaign({ crowdfundContract, provider, signer, setSigner, loadingNewCampaign,  setLoadingNewCampaign}) {
  const [image, setImage] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [error, setError] = useState(null);
  const [minGoal, setMinGoal] = useState();
  const [minDuration, setMinDuration] = useState();

  const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
  const pinataSecret = import.meta.env.VITE_PINATA_API_SECRET;

  useEffect(() => {
    try {
      // TODO: show "loading min value" below these fields in the form. Even though they will be loaded fast.
      const minDuration = crowdfundContract.MIN_DURATION();
      const minGoal = crowdfundContract.MIN_GOAL();
      Promise.all([minDuration, minGoal]).then((arr)=>{
        setMinDuration(arr[0]);
        setMinGoal(arr[1]);

        // bigint => number won't lose precision here
        const minSeconds = (Date.now() / 1000) + Number(arr[0]) + (24 * 60 * 60);
        const minDate = new Date(minSeconds * 1000).toISOString().split("T")[0];
        setDeadline(minDate);
        setGoal(formatEther(arr[1]));
      });
    } catch (error) {
      console.error("Error reading min values from contract:", error);
      setError(error);
    }
  }, []);

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  async function newCampaign(metadataUrl, goal, duration){
    let signer0 = signer;
    if (!signer){
      try {
        signer0 = await provider.getSigner(0);
        console.log("Connected Signer:", signer0);
        setSigner(signer0);
      } catch (error) {
        // TODO: Show error message in the form
        console.error("Error connecting a signer:", error);
        setSigner(null);
        return null;
      }
    }

    try {
      const tx = await crowdfundContract.connect(signer0).createCampaign(metadataUrl, goal, duration);
      await tx.wait();
      //TODO: Display tx link on etherscan
      return tx;
    } catch (error) {
      console.error("Error creating new campaign:", error);
      return null;
    }
  }

  const uploadToIPFS = async () => {
    if (!image || !description) {
      alert("Please provide an image and a description.");
      return null;
    }

    // setLoadingNewCampaign(true);
    try {
      // 1. Upload Image
      const formData = new FormData();
      formData.append("file", image);

      const imgResponse = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecret,
        },
      });

      const imageUrl = `https://gateway.pinata.cloud/ipfs/${imgResponse.data.IpfsHash}`;

      // 2. Upload JSON metadata (description)
      const metadata = {
        description,
        image: imageUrl,
      };

      const totalCampaigns = await crowdfundContract.campaignCount();
      const fileName = `campaign_metadata_${totalCampaigns}`;

      const jsonResponse = await axios.post(
           "https://api.pinata.cloud/pinning/pinJSONToIPFS",
           {
               pinataContent: metadata,
               pinataMetadata: {
                   name: fileName
               }
            },
            {
                headers: {
                "Content-Type": "application/json",
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecret,
                },
            }
        );

      const metadataUrl = `https://gateway.pinata.cloud/ipfs/${jsonResponse.data.IpfsHash}`;
      setIpfsUrl(metadataUrl);
    //   setLoadingNewCampaign(false);

      alert("File uploaded successfully!");
      return metadataUrl;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      // setLoadingNewCampaign(false);
      alert("Failed to upload to IPFS.");
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoadingNewCampaign(true);

    // TODO: WIll uisng ipfsUrl work here? If yes, use it and delete ipfsLink
    // TODO: Add a place to put ipfs link then hide image and description fields
    // const ipfsLink = await uploadToIPFS();
    const ipfsLinks = ["https://gateway.pinata.cloud/ipfs/QmbvNRUvX6387rg9SuzMHoTBnRxx2dKtUaqxXXcwZJtdXy",
                      "https://gateway.pinata.cloud/ipfs/QmNRBiYMq5XBrJiNNxr3vs6Bswhvmizzs8Rcj8ihtmzuib",
                      "https://gateway.pinata.cloud/ipfs/QmQmswLAdaQdqxTx9qy9Qve1tLKVwUZkq5hoBtE2WWqskn"]
    const ipfsLink = ipfsLinks[Math.floor(Math.random() * ipfsLinks.length)];
    if (!ipfsLink){
      setLoadingNewCampaign(false);
      return;
    }

    // TODO: Delete uploaded ifps file if can't create new campaign
    const duration = calculateDuration(deadline);
    const goalInWei = parseEther(goal);
    const txReceipt = await newCampaign(ipfsLink, goalInWei, duration);

    if (!txReceipt){
      setLoadingNewCampaign(false);
      alert("Failed to create new campaign. Please try again.");
      return;
    }
    console.log("New campaign created successfully:", txReceipt);

    setLoadingNewCampaign(false);
    setImage("");
    setTitle("");
    setDescription("");
    setGoal("");
    setDeadline("");
  };

  // TODO: Implement minimum for goal and deadline
  return (
    <div id="newCampaignContainer">
      <form onSubmit={handleSubmit}>
        <h2>Create a New Campaign</h2>
        {error && <ErrorMessage message={error.message} />}
        <div className="formFieldBox">
            <label>Cover Image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        
        <div className="formFieldBox">
            <label>Title</label>
            <input type="text" value={title} placeholder="Enter campaign title..." onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="formFieldBox">
            <label>Description</label>
            <textarea value={description} placeholder="Enter campaign description..." onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="formFieldBox">
            <label>Location</label>
            <input minLength="4" maxLength="20" value={location} onChange={(e) => setLocation(e.target.value)} />
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

        <button type="submit" disabled={loadingNewCampaign || error || (minGoal && goal < formatEther(minGoal)) || (minDuration && calculateDuration(deadline) < minDuration)}>
          {loadingNewCampaign ? "Uploading..." : "Create Campaign"}
        </button>
      </form>

      {ipfsUrl && (
        <p>
          IPFS Link: <a href={ipfsUrl} target="_blank" rel="noopener noreferrer">{ipfsUrl}</a>
        </p>
      )}
    </div>
  );
}