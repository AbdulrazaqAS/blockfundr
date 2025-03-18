import { useState } from 'react'
import NavBar from './components/NavBar.jsx'
import Card from './components/Card.jsx'
//import reactLogo from './assets/react.svg'
//import viteLogo from '/vite.svg'
//import './App.css'

const HARDHAT_NETWORK_ID = '31337';

function App() {
  return (
    <div>
      <NavBar />
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
