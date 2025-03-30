import { useState, useEffect } from 'react'
import { ethers } from "ethers";

// TODO: Handle files not found(same as handling contract not deployed)
import crowdfundArtifact from "./contracts/Crowdfund.json";
import contractAddress from "./contracts/contract-address.json";


import NavBar from './components/NavBar.jsx'
import Card from './components/Card.jsx'
import NewCampaignForm from './components/NewCampaignForm.jsx';
import CampaignInfoCard from './components/CampaignInfoCard';
import NoWalletDetected from './components/NoWalletDetected';
import ErrorMessage from './components/ErrorMessage.jsx';
import {testCampaign} from './components/CampaignInfoCard';

const HARDHAT_NETWORK_ID = '31337';
const PRIVATE_KEY = import.meta.env.VITE_Private_Key0;

// const provider = ethers.getDefaultProvider("http://localhost:8545/");
// const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
//TODO: What is the contract is not yet deployed
// const crowdfundContract = new ethers.Contract(contractAddress.Crowdfund, crowdfundArtifact.abi, wallet);
// const crowdfundContract = new ethers.Contract(contractAddress.crowdfund, crowdfundArtifact.abi, provider);

function App() {
  const [walletDetected, setWalletDetected] = useState(true);
  const [provider, setProvider] = useState(null);
  const [crowdfundContract, setCrowdfundContract] = useState(null);
  const [currentAddress, setCurrentAddress] = useState("");
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingNewCampaign, setLoadingNewCampaign] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [showCampaignInfo, setShowCampaignInfo] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [initError, setInitError] = useState(null);
  
  async function createCard(){
    const totalCampaigns = await crowdfundContract.campaignCount();

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

    // Maybe in hardhat localhost, since blocks are not getting created until when a tx
    // happens, modifying this file leads to rerunning this func even though a new CampaignCreated
    // event is not fired. Maybe it is bcoz modifying the file leads to requerying the local provider
    // and since a new block is not added, the old one (if it has the event) will make this func fire.
    // THis 'if' block is taking care of that. THIS IS JUST AN EMPIRICALLY. Does it apply to main/test nets.
    setTotalCampaigns(totalCampaigns.toString());
    setCampaigns((prev)=>{
      if (prev.length < totalCampaigns.toString())
        return [...prev, campaignObj]
      else
        return prev
    });
  }

  useEffect(() => {
    let deployed = false;
    if (window.ethereum === undefined) setWalletDetected(false);
    else {
      try {
        setWalletDetected(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        const network = provider.getNetwork();
        network.then((val) => {
          console.log("Network Name", val.name);
          console.log("Network", val)
        });

        const code = provider.getCode(contractAddress.Crowdfund);
        // TODO: show loading message while waiting to resolve
        code.then((val) => {
          try {
            if (val !== '0x'){
              const crowdfundContract = new ethers.Contract(contractAddress.Crowdfund, crowdfundArtifact.abi, provider);
              crowdfundContract.on("CampaignCreated", createCard);
              setCrowdfundContract(crowdfundContract);
              setDeployed(true);
              deployed = true;
              console.log("Contract Code:", val.slice(0, 10) + "..." + val.slice(-10));
            } else {
              throw new Error(`No contract deployed at ${contractAddress.Crowdfund}`);
            }
          } catch (error) {
            console.error("Error getting contract:", error);
            deployed = false;
            setInitError(error);
            const reload = setInterval(() => {
              console.log("Retrying to connect to contract...");
              const code = provider.getCode(contractAddress.Crowdfund);
              code.then((val) => {
                if (val !== '0x'){
                  const crowdfundContract = new ethers.Contract(contractAddress.Crowdfund, crowdfundArtifact.abi, provider);
                  crowdfundContract.on("CampaignCreated", createCard);
                  setCrowdfundContract(crowdfundContract);
                  setDeployed(true);
                  deployed = true;
                  clearInterval(reload);
                } else {
                  setInitError(error);
                }
              });
            }, 10000);
          }
        }); 
      } catch (error) {
        console.error("Error connecting to provider:", error);
        setInitError(error);
      }
    }


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
      } catch (error) {
        console.error("Contract loading campaigns:", error);
        setInitError(error);
      }
    }
    
    if (deployed) loadCampaigns();
    
    return () => {
      try {
        crowdfundContract.off("CampaignCreated", createCard);
      } catch (error) {
        console.error("Error removing event listener", error);
      }
    };
  }, [])
  
  if (!deployed) {
    return <h1>No contract deployed at {contractAddress.Crowdfund}</h1>
  }

  return (
    <div>
      <NavBar
        walletDetected={walletDetected}
        address={currentAddress}
        setCurrentAddress={setCurrentAddress}
        networkId={HARDHAT_NETWORK_ID}
        setWalletError={setWalletError}
        showForm={showForm}
        setShowForm={setShowForm}
        loadingNewCampaign={loadingNewCampaign}
        showCampaignInfo={showCampaignInfo}
        setShowCampaignInfo={setShowCampaignInfo}
      />
      { !walletDetected && <NoWalletDetected /> }
      { walletError && <ErrorMessage message={walletError.message} setErrorMessage={setWalletError}/> }
      { initError && <ErrorMessage message={initError.message} setErrorMessage={setInitError}/> }
      {
        showForm && (
          <NewCampaignForm
            crowdfundContract={crowdfundContract}
            loadingNewCampaign={loadingNewCampaign}
            setLoadingNewCampaign={setLoadingNewCampaign}
          />
        )
      }
      {
        showCampaignInfo && (
          <CampaignInfoCard campaign={{...testCampaign, ...showCampaignInfo, ...campaigns[showCampaignInfo.id]}} />
        )
      }
      <h2 className="active-campaigns-h2">Active Campaigns ({totalCampaigns})</h2>
      <ul className="active-campaigns-container">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <Card
              id={campaign.id}
              creator={campaign.creator}
              metadataUrl={campaign.metadataUrl}
              goal={campaign.goal} deadline={campaign.deadline}
              fundsRaised={campaign.fundsRaised}
              setShowCampaignInfo={setShowCampaignInfo}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
