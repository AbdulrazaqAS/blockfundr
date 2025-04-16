# BlockFundr
## Blockchain Fundraiser App

### About
This is a decentralize platform for fundraising. Users can create fundraiser campaigns providing the following details:
- Description
- Cover picture
- Target eth amount
- Duration of campaign
- Location

Currently only supports the deployment network native currency.

Will backers/donators will then send eth to the campaign. Only when the raised funds surpass the target, or when the duration is reached, can the campaign creator withdraw the funds. On withrawal, 95% of the total funds goes to the campaign creator and 5% goes to the contract spendable balance for maintenance. All funds belonging to campaigns are locked and therefore not spendable by the contract.

The campaign creator can decide to stop (not withdraw) a campaign before the goal or duration is reached. In that case, the raised funds will be available for refund to the backers. Each backer can request for refund and have his funds back. But if the campaign creator has sent funds to the campaign, it will not be available for refund to him. This is to discourage the stopping of campaigns. This amount will be added to the contract balance.

The deployer (admin) of the contract has more previlages than other users. The admin can:
- Stop any campaign (making it refundable) incase the campaign is inappropriate or deceiptful.
- Also create as many campaigns as possible while others can only have three active campaigns at a time.
- Also disable creation of new campaigns.
- Activate the failsafe mode of the contract and make it readonly incase of any issue.
- Transfer or withdraw the contract balance.

All these activities are logged to the frontend as history tables to provide transparency.

Visit [Blockfudr](https://crowdfunding-nu-two.vercel.app/) to interact with a version of the contract deployed on Ethereum Sepolia testnet.


### Cloning the project
Smart contract part (Solidity + Hardhat)
1. Clone the project
1. Run `npm install` in the root.
1. You can now run `npx hardhat test` to run the tests in *tests* dir.
1. To be able to deploy to a network, add the following env vars using Hardhat. `PRIVATE_KEY` is from your wallet account. Visit [alchemy](https://www.alchemy.com/) to create an api key or use any other node provider. Run:
    - `npx hardhat vars set PRIVATE_KEY`
    - `npx hardhat vars set ALCHEMY_API_KEY`
1. Run `npx hardhat run scripts/deploy.js --network eth_sepolia` to deploy to ethereum Sepolia testnet.
1. Copy the contract address. It will also be saved in *frontend/src/contracts/contract-address.json*.

Frontend (Node project with Vite + REACT)
1. Run `npm install` inside *frontend* dir.
1. Paste the contract address to `CONTRACT_ADDRESS` inside *frontend/src/App.jsx*.
1. To be able to create campaigns, visit [Pinata](https://pinata.cloud/) and create an API key to upload files to IPFS.
    - Create a file called *.env* in *frontend* root and paste your Pinata creadentials.
    - `PINATA_API_KEY = <YOUR KEY>`
    - `PINATA_API_SECRET = <YOUR SECRET>`
1. Add your alchemy api key to the *.env* file
    - `VITE_ALCHEMY_API_KEY = <YOUR KEY>`
1. Run `npm run dev`
1. Open `http://localhost:5173/`

Note: If you're willing to push to production, make your alchemy API key to only accept requests from your domain else someone might spam it. This is because vars starting with `VITE_` can be seen in frontend using browser devtools.

Branches:
- **main**: For Production
- **updates**: For development
- **localnode**: For running app on local node. Uses metamask wallet as provider.
- **private-key**: Used for testing. Directly uses a private key to sign transactions.
