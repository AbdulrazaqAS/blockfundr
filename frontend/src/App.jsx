import { ethers } from "ethers";
// import 'dotenv/config'

import crowdfundArtifact from "./contracts/Crowdfund.json";
import contractAddress from "./contracts/contract-address.json";

import { useState } from 'react'
import NavBar from './components/NavBar.jsx'
import Card from './components/Card.jsx'
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
//import './App.css'

const HARDHAT_NETWORK_ID = '31337';
const PRIVATE_KEY = import.meta.env.VITE_Private_Key0;

const provider = ethers.getDefaultProvider("http://localhost:8545/");
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

function App() {
  const [currentAddress, setCurrentAddress] = useState(wallet.address)
  
  return (
    <div>
      <NavBar address={currentAddress} />
      <h2 className="active-campaigns-h2">Active Campaigns</h2>
      <div className="active-campaigns-container">
        <Card /> 
        <Card /> 
        <Card /> 
        <Card /> 
        <Card /> 
        <Card /> 
      </div>
    </div>
  )
}

export default App
