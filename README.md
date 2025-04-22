# BlockFundr
## Blockchain Fundraiser App

### About

This is a decentralized fundraising platform where users can create and manage fundraising campaigns. Campaign creators provide key details such as:

- Description
- Cover picture
- Target ETH amount
- Campaign duration
- Location

Currently, the platform only supports the deployment network's native currency.

**How it works:**

Backers donate ETH to campaigns. Campaign creators can withdraw funds only if the raised amount exceeds the target goal or when the campaign duration ends. Upon withdrawal, 95% of the total funds are sent to the campaign creator, while 5% goes to the contract balance for maintenance. All campaign funds are locked and cannot be spent by the contract.

**Campaign Management:**

Campaign creators can choose to stop a campaign before the goal or duration is reached. If a campaign is stopped, the funds raised are available for refund to backers. However, campaign creators cannot refund their own contributions to the campaign to discourage arbitrary cancellations. These funds will be added to the contract balance.

**Admin Privileges:**

The contract deployer (admin) has additional privileges over regular users. The admin can:

- Stop any campaign and make it refundable if it’s deemed inappropriate or deceptive.
- Create an unlimited number of campaigns, while other users can only have three active campaigns at a time.
- Disable the creation of new campaigns.
- Activate the contract's failsafe mode, making the contract read-only in case of issues.
- Transfer or withdraw the contract balance.

All activities are logged and displayed on the frontend, ensuring transparency with history tables.

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
