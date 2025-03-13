//const hre = require("hardhat");
const {expect, assert} = require("chai");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Crowdfund", ()=>{
	const metadataUrl = "https://cominglater.com/json"
	const goal = ethers.parseEther("10");
	const duration = 24 * 60 * 60 // 1 day

	async function deployContractFixture(){
		let [owner] = await ethers.getSigners();

		const CrownFund = await ethers.getContractFactory("Crowdfund");
		const crowdfund = await CrownFund.deploy();

		return { owner, crowdfund };
	}

	describe ("Creating campaign", ()=>{
		it ("Should emit create event", async ()=>{
			const { crowdfund } = await loadFixture(deployContractFixture);
			expect(await crowdfund.createCampaign(metadataUrl, goal, duration))
						.to.emit(crowdfund, "CampaignCreated");
		});

		it ("Should increment campaigns count by 1", async ()=>{
			const { crowdfund } = await loadFixture(deployContractFixture);
			const count1 = await crowdfund.campaignCount();
			await crowdfund.createCampaign(metadataUrl, goal, duration);
			const count2 = await crowdfund.campaignCount();
			assert(count2 - count1 === 1n);
		});

		it("Should be reverted if duration is less than MIN_DURATION", async function () {
			const { crowdfund } = await loadFixture(deployContractFixture);
			const duration = 60 * 60; // 1 sec
	      	expect(crowdfund.createCampaign(metadataUrl, goal, duration))
	      		.to.be.revertedWith(
	        		"Duration must be greater than MIN_DURATION"
	        	);
	    });

	    it("Should be reverted if goal is less than MIN_GOAL", async function () {
			const { crowdfund } = await loadFixture(deployContractFixture);
			const goal = 1;  // ether
	      	expect(crowdfund.createCampaign(metadataUrl, goal, duration))
	      		.to.be.revertedWith(
	        		"Goal must be greater than MIN_GOAL"
	        	);
	    });
	});

	describe ("Funding campaign", () => {
			const amount = ethers.parseEther("5");
		async function createCampaignFixture(contract) {
			const campaignId = await contract.createCampaign(metadataUrl, goal, duration);
			console.log("Campaign ID", campaignId);
			console.log("Campaign", await contract.campaigns(campaignId));

			await contract.campaigns(campaignId).fundCampaign(campaignId, {value: amount});

			return {campaignId, amount};
		}

		it("Should fund campaign", async () => {
			const { crowdfund } = await loadFixture(deployContractFixture);
			const { campaignId, amount } = await loadFixture(createCampaignFixture(crowdfund));

			expect(crowdfund.campaigns[campaignId].fundsRaised).to.equal(amount);
		});

	});
});