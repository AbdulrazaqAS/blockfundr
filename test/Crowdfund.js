//const hre = require("hardhat");
const { expect, assert } = require("chai");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Crowdfund", ()=>{
	const metadataUrl = "https://cominglater.com/json"
	const goal = ethers.parseEther("10");
	const duration = 24 * 60 * 60 // 1 day

	async function deployContractFixture(){
		let [owner, signer1] = await ethers.getSigners();

		const CrownFund = await ethers.getContractFactory("Crowdfund");
		const crowdfund = await CrownFund.deploy();

		return { owner, signer1, crowdfund };
	}

	async function createCampaignFixture() {
		const { owner, signer1, crowdfund } = await loadFixture(deployContractFixture);
		const tx = await crowdfund.createCampaign(metadataUrl, goal, duration);
		await tx.wait();
		
		const campaignId = (await crowdfund.campaignCount()) - 1n;

		return { owner, signer1, crowdfund, campaignId };
	}

	describe ("Creating campaign", ()=>{
		it ("Should emit create event", async ()=>{
			const { crowdfund } = await loadFixture(deployContractFixture);
			await expect(await crowdfund.createCampaign(metadataUrl, goal, duration))
				.to.emit(crowdfund, "CampaignCreated");
		});

		it ("Should increment campaigns count by 1", async ()=>{
			const { crowdfund } = await loadFixture(deployContractFixture);
			const count1 = await crowdfund.campaignCount();
			await crowdfund.createCampaign(metadataUrl, goal, duration);
			const count2 = await crowdfund.campaignCount();
			assert(count2 - count1 === 1n);
		});

		it ("Should increment campaigns count by 3", async ()=>{
			const { crowdfund } = await loadFixture(deployContractFixture);
			const count1 = await crowdfund.campaignCount();
			
			const tx1 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx2 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx3 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			
			await Promise.all([tx1, tx2, tx3])

			const count2 = await crowdfund.campaignCount();
			assert(count2 - count1 === 3n);
		});

		it("Should be reverted if duration is less than MIN_DURATION", async function () {
			const { crowdfund } = await loadFixture(deployContractFixture);
			const duration = 60 * 60; // 1 sec
	      	await expect(crowdfund.createCampaign(metadataUrl, goal, duration))
	      		.to.be.revertedWith(
	        		"Duration must be greater than MIN_DURATION"
	        	);
	    });

	    it("Should be reverted if goal is less than MIN_GOAL", async function () {
			const { crowdfund } = await loadFixture(deployContractFixture);
			const goal = 1;  // ether
	      	await expect(crowdfund.createCampaign(metadataUrl, goal, duration))
	      		.to.be.revertedWith(
	        		"Goal must be greater than MIN_GOAL"
	        	);
	    });
	});

	describe ("Funding campaign", () => {
		const amount = ethers.parseEther("5");

		it("Should emit Funded event", async () => {
			const { owner, crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			
			await expect(crowdfund.fundCampaign(campaignId, {value: amount}))
				.to.emit(crowdfund, "Funded");
		});

		it("Should fund campaign and update balances", async () => {
			const { owner, crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			
			await expect(crowdfund.fundCampaign(campaignId, {value: amount}))
				.to.changeEtherBalances([owner, crowdfund], [-amount, amount]);
		});

		it("Should fund campaign from two backers", async () => {
			const { owner, signer1, crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			
			await crowdfund.fundCampaign(campaignId, {value: amount}).then((tx)=> tx.wait());
			await crowdfund.connect(signer1).fundCampaign(campaignId, {value: amount}).then((tx)=> tx.wait());
			
			expect(await ethers.provider.getBalance(crowdfund)).to.equal(amount * 2n);
		});

		it("Should confirm backers' funds", async () => {
			const { owner, signer1, crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			
			await crowdfund.fundCampaign(campaignId, {value: amount}).then((tx)=> tx.wait());
			await crowdfund.connect(signer1).fundCampaign(campaignId, {value: amount}).then((tx)=> tx.wait());
			
			const ownerContribution = await crowdfund.getContribution(campaignId, owner.address);
			const signer1Contribution = await crowdfund.getContribution(campaignId, signer1.address);
			
			expect(ownerContribution).to.equal(amount);
			expect(signer1Contribution).to.equal(amount);
		});

		it("Should revert if amount is <= zero", async () => {
			const { crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			
			await expect(crowdfund.fundCampaign(campaignId, {value: 0}))
				.to.be.revertedWith("Must send ETH");
		});

		it("Should revert if campaign has finished", async () => {
			const { crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			const expiryTime = (await time.latest()) + duration
			await time.increaseTo(expiryTime);

			await expect(crowdfund.fundCampaign(campaignId, {value: amount}))
				.to.be.revertedWith("Campaign expired");
		});
	});

	describe("Withdraw funds", () => {
		async function fundCampaignFixture() {
			const { owner, signer1, crowdfund, campaignId } = await loadFixture(createCampaignFixture);

			const amount = ethers.parseEther("5");
			const tx = await crowdfund.fundCampaign(campaignId, {value: amount});
			await tx.wait();

			return { owner, signer1, crowdfund, campaignId, amount };
		}

		it("Should update balances after withdrawing (one backer)", async () => {
			const {owner, crowdfund, campaignId} = await loadFixture(fundCampaignFixture);

			const amount = ethers.parseEther("15");
			const tx = await crowdfund.fundCampaign(campaignId, {value: amount})
			await tx.wait();

			const withdrawAmount = await crowdfund.calculateWithdrawAmount(campaignId);

			await expect(crowdfund.withdrawFunds(campaignId))
				.to.changeEtherBalances([owner, crowdfund], [withdrawAmount, - withdrawAmount])

		});

		it("Should update balances after withdrawing (many backers)", async () => {
		    const { owner, signer1, crowdfund, campaignId, amount } = await loadFixture(fundCampaignFixture);
		    const [, , signer2, signer3] = await ethers.getSigners();

		    const amounts = [
		        { signer: signer1, value: ethers.parseEther("6") },
		        { signer: signer2, value: ethers.parseEther("7") },
		        { signer: signer3, value: ethers.parseEther("8") }
		    ];

		    await Promise.all(amounts.map(({ signer, value }) => 
		        crowdfund.connect(signer).fundCampaign(campaignId, { value }).then(tx => tx.wait())
		    ));

		    const withdrawAmount = await crowdfund.calculateWithdrawAmount(campaignId);

		    await expect(crowdfund.withdrawFunds(campaignId))
		        .to.changeEtherBalances([owner, crowdfund], [withdrawAmount, -withdrawAmount]);
		});

		it("Should emit withdrawn event", async () => {
			const {crowdfund, campaignId} = await loadFixture(fundCampaignFixture);
			await time.increase(duration);
			await expect(crowdfund.withdrawFunds(campaignId)).to.emit(crowdfund, "Withdrawn");
		});

		it("Should revert if it is not campaign creator", async () => {
			const {crowdfund, signer1, campaignId} = await loadFixture(fundCampaignFixture);

			await expect(crowdfund.connect(signer1).withdrawFunds(campaignId))
				.to.be.revertedWith("Only creator can withdraw");
		});

		it("Should not revert if not expired but goal reached", async () => {
			const {crowdfund, campaignId} = await loadFixture(fundCampaignFixture);

			const amount = ethers.parseEther("7");
			const tx = await crowdfund.fundCampaign(campaignId, {value: amount});
			await expect(crowdfund.withdrawFunds(campaignId))
				.not.to.be.reverted;
		})

		it("Should not revert if expired but goal not reached", async () => {
			const {crowdfund, campaignId} = await loadFixture(fundCampaignFixture);

			const expireTime = (await time.latest()) + duration;
			await time.increaseTo(expireTime);
			// const tx = await crowdfund.fundCampaign(campaignId, {value: amount});
			await expect(crowdfund.withdrawFunds(campaignId))
				.not.to.be.reverted;
		})

		it("Should revert if not expired and goal not reached", async () => {
			const {crowdfund, campaignId} = await loadFixture(fundCampaignFixture);

			await expect(crowdfund.withdrawFunds(campaignId))
				.to.be.revertedWith("Wait for campaign to expire or reach funding goal");
		})
	})
});