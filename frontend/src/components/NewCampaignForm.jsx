import { useState } from "react";
import axios from "axios";
import {parseEther} from "ethers";

// TODO: clicking the btn multiple time quickly should be handled.
//       Only if the first has been mined, else discard the subsequent clicks.
async function newCampaign(crowdfundContract, metadataUrl, goal, duration){
    const tx = await crowdfundContract.createCampaign(metadataUrl, goal, duration);
    await tx.wait();
    //TODO: Display tx link on etherscan
}

function convertDateToSeconds(date){
    return Math.floor(new Date(date).getTime() / 1000);
}

function calculateDuration(date){
    const dateInSeconds = convertDateToSeconds(date);
    const currentTime = Math.floor(Date.now() / 1000);
    return dateInSeconds - currentTime;
}

export default function CreateCampaign({ crowdfundContract, loadingNewCampaign,  setLoadingNewCampaign}) {
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");

  const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
  const pinataSecret = import.meta.env.VITE_PINATA_API_SECRET;

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

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

    try {
      // TODO: Delete uploaded ifps file if can't create new campaign
      // TODO: wrap all interactions with contract in a try-catch
      const duration = calculateDuration(deadline);
      const minDuration = await crowdfundContract.MIN_DURATION();
      
      if (duration < minDuration.toString()) {
          alert("Invalid deadline");
          throw new Error("Invalid deadline");
      }

      const goalInEther = parseEther(goal);
      const minGoal = await crowdfundContract.MIN_GOAL();

      if (goalInEther < minGoal.toString()){
          alert("Invalid Goal");
          throw new Error("Invalid Goal");
      }

      await newCampaign(crowdfundContract, ipfsLink, goalInEther, duration);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNewCampaign(false);
    }
  };

  // TODO: Implement minimum for goal and deadline
  return (
    <div id="newCampaignContainer">
      <form onSubmit={handleSubmit}>
        <h2>Create a New Campaign</h2>
        <div className="formFieldBox">
            <label>Cover Image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        
        <div className="formFieldBox">
            <label>Description</label>
            <textarea value={description} placeholder="Enter campaign description..." onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="formFieldBox">
            <label>Goal (ETH)</label>
            <input type="number" placeholder="Target amount" value={goal} onChange={(e) => setGoal(e.target.value)} required />
        </div>

        <div className="formFieldBox">
            <label>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
        </div>

        <button type="submit" disabled={loadingNewCampaign}>
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