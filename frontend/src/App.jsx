import { ethers } from "ethers";
// import 'dotenv/config'

import crowdfundArtifact from "./contracts/Crowdfund.json";
import contractAddress from "./contracts/contract-address.json";

import { useState, useEffect } from 'react'
import NavBar from './components/NavBar.jsx'
import Card from './components/Card.jsx'
import NewCampaignForm from './components/NewCampaignForm.jsx';
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
//import './App.css'

const HARDHAT_NETWORK_ID = '31337';
const PRIVATE_KEY = import.meta.env.VITE_Private_Key0;

const provider = ethers.getDefaultProvider("http://localhost:8545/");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
//TODO: What is the contract is not yet deployed
const crowdfundContract = new ethers.Contract(contractAddress.Crowdfund, crowdfundArtifact.abi, wallet);
// const crowdfundContract = new ethers.Contract(contractAddress.crowdfund, crowdfundArtifact.abi, provider);

function App() {
  const [currentAddress, setCurrentAddress] = useState(wallet.address);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingNewCampaign, setLoadingNewCampaign] = useState(false);
  const [deployed, setDeployed] = useState(false);
  
  async function createCard(){
    const totalCampaigns = await crowdfundContract.campaignCount();

    // Maybe in hardhat localhost, since blocks are not getting created until when a tx
    // happens, modifying this file leads to rerunning this func even though a new CampaignCreated
    // event is not fired. Maybe it is bcoz modifying the file leads to requerying the local provider
    // and since a new block is not added, the old one (if it has the event) will make this func fire.
    // THis 'if' block is taking care of that. THIS IS JUST AN EMPIRICALLY. Does it apply to main/test nets.
    // if (totalCampaigns <= campaigns.length)
    // {
    //   if (totalCampaigns < campaigns.length){
    //     console.warn("Inconsistency in number of campaigns in contract vs frontend",
    //                 `${totalCampaigns.toString()} != ${campaigns.length}`);
    //   }
    //   return;
    // }

    // TODO: totalCampaigns - campaigns.length should be 1, else something is wrong

    const campaign = await crowdfundContract.campaigns(totalCampaigns - 1n); // index of campaign
    const campaignObj = {
      id: campaign[0],
      creator: campaign[1],
      metadataUrl: campaign[2],
      goal: campaign[3],
      deadline: campaign[4],
      fundsRaised: campaign[5],
      contributors: campaign[6],
    }

    console.log("Calling createCard");
    setTotalCampaigns(totalCampaigns.toString());
    setCampaigns((prev)=>{
      return [...prev, campaignObj]
    });
  }

  useEffect(() => {
    crowdfundContract.on("CampaignCreated", createCard);

    async function loadCampaigns(){
      try {
        let totalCampaigns = await crowdfundContract.campaignCount();
        totalCampaigns = totalCampaigns.toString();
        setTotalCampaigns(totalCampaigns);

        // TODO: use Promise.all here to load faster
        const loadedCampaigns = [];
        for (let i=0;i<totalCampaigns;i++){
          const campaign = await crowdfundContract.campaigns(i);

          const campaignObj = {
            id: campaign[0],
            creator: campaign[1],
            metadataUrl: campaign[2],
            goal: campaign[3],
            deadline: campaign[4],
            fundsRaised: campaign[5],
            totalContributors: campaign[6],
          }

          loadedCampaigns.push(campaignObj);
        }
        setCampaigns(loadedCampaigns);
        setDeployed(true);
      } catch (error) {
        setDeployed(false);
        console.error("Contract error", error);
      }
    }
    
    loadCampaigns();
    
    return () => {
      crowdfundContract.off("CampaignCreated", createCard);
    };
  }, [])
  
  if (!deployed) {
    return <h1>No contract deployed at {contractAddress.Crowdfund}</h1>
  }

  return (
    <div>
      <NavBar address={currentAddress} showForm={showForm} setShowForm={setShowForm} loadingNewCampaign={loadingNewCampaign}/>
      {
        showForm && (
          <NewCampaignForm
            crowdfundContract={crowdfundContract}
            loadingNewCampaign={loadingNewCampaign}
            setLoadingNewCampaign={setLoadingNewCampaign}
          />
        )
      }
      <h2 className="active-campaigns-h2">Active Campaigns ({totalCampaigns})</h2>
      <ul className="active-campaigns-container">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Card id={campaign.id} creator={campaign.creator} metadataUrl={campaign.metadataUrl} goal={campaign.goal} deadline={campaign.deadline} fundsRaised={campaign.fundsRaised} totalContributors={campaign.totalContributors}/>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
