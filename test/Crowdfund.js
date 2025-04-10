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

	async function fundCampaignFixture() {
		const { owner, signer1, crowdfund, campaignId } = await loadFixture(createCampaignFixture);

		const amount = ethers.parseEther("5");
		const tx = await crowdfund.fundCampaign(campaignId, {value: amount});
		await tx.wait();

		return { owner, signer1, crowdfund, campaignId, amount };
	}

	async function withdrawCampaignFundsFixture() {
		const { owner, signer1, crowdfund } = await loadFixture(deployContractFixture);
		const tx = await crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration);
		await tx.wait();
		
		const campaignId = (await crowdfund.campaignCount()) - 1n;
		
		const amount = goal; // Making it withdrawable without expiring by reaching goal
		const tx2 = await crowdfund.fundCampaign(campaignId, {value: amount})
		await tx2.wait();
		
		const withdrawAmount = await crowdfund.calculateWithdrawAmount(campaignId);
		const campaignObj = await crowdfund.campaigns(campaignId);
		const amountRaised = campaignObj[5];

		const tx3 = await crowdfund.connect(signer1).withdrawFunds(campaignId);
		await tx3.wait();

		const withdrawable = amountRaised - withdrawAmount;

		return { owner, signer1, crowdfund, campaignId, amount, withdrawAmount, amountRaised, withdrawable};
	}

	async function safeModeFixture() {
		const { owner, signer1, crowdfund, campaignId } = await loadFixture(createCampaignFixture);
		const tx = await crowdfund.setSafeMode(true);
		await tx.wait();

		return {owner, signer1, crowdfund, campaignId};
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

		it ("Should be reverted if max campaigns count(3) reached", async ()=>{
			const { crowdfund, signer1 } = await loadFixture(deployContractFixture);
			
			const tx1 = crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx2 = crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx3 = crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			
			await Promise.all([tx1, tx2, tx3])

			await expect(crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration))
				.to.be.revertedWith("Max campaigns reached. Close some to create new ones");
		});

		it ("Should not revert if is owner and max campaigns count(3) reached", async ()=>{
			const { crowdfund, signer1 } = await loadFixture(deployContractFixture);
			
			const tx1 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx2 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx3 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			const tx4 = crowdfund.createCampaign(metadataUrl, goal, duration).then((tx)=> tx.wait());
			
			await Promise.all([tx1, tx2, tx3, tx4]);

			await expect(crowdfund.createCampaign(metadataUrl, goal, duration))
				.not.to.be.reverted;
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

		it("Should revert if campaign is closed(funds withdrawn)", async () => {
			const { crowdfund, campaignId } = await loadFixture(createCampaignFixture);
			const amount = ethers.parseEther("15");
			const tx = await crowdfund.fundCampaign(campaignId, {value: amount});
			await tx.wait();
			const tx2 = await crowdfund.withdrawFunds(campaignId);
			await tx2.wait();

			await expect(crowdfund.fundCampaign(campaignId, {value: amount}))
				.to.be.revertedWith("Campaign is closed");
		});

		// TODO: revert if stopped
	});

	describe("Withdraw campaign funds", () => {
		it("Should update balances after withdrawing (one backer)", async () => {
			const {owner, crowdfund, campaignId} = await loadFixture(fundCampaignFixture);

			const amount = ethers.parseEther("15");
			const tx = await crowdfund.fundCampaign(campaignId, {value: amount})
			await tx.wait();

			const withdrawAmount = await crowdfund.calculateWithdrawAmount(campaignId);

			await expect(crowdfund.withdrawFunds(campaignId))
				.to.changeEtherBalances([owner, crowdfund], [withdrawAmount, - withdrawAmount])

		});

		it("Should update contractBalance after withdrawing", async () => {
			const {owner, crowdfund, campaignId} = await loadFixture(fundCampaignFixture);

			const amount = ethers.parseEther("15");
			const tx = await crowdfund.fundCampaign(campaignId, {value: amount})
			await tx.wait();

			const withdrawAmount = await crowdfund.calculateWithdrawAmount(campaignId);
			const campaignObj = await crowdfund.campaigns(campaignId);
			const amountRaised = campaignObj[5];

			const tx2 = await crowdfund.withdrawFunds(campaignId);
			await tx2.wait();

			expect(await crowdfund.contractBalance())
				.to.equal(amountRaised - withdrawAmount);
		});

		// TODO: should reduce the number of user campaigns by 1
		// TODO: should emit ContractFundsIncreased

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

		it("Should revert if campaign is closed(funds already withdrawn)", async () => {
			const {crowdfund, campaignId} = await loadFixture(fundCampaignFixture);
			await time.increase(duration);
			await crowdfund.withdrawFunds(campaignId);

			await expect(crowdfund.withdrawFunds(campaignId))
				.to.be.revertedWith("Campaign is closed. Funds already withdrawn");
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

	describe("Refunding", () => {
		describe("Stopping campaign", () => {
			it("Should stop and close campaign", async () => {
				const {crowdfund, campaignId} = await loadFixture(fundCampaignFixture);
				const tx = await crowdfund.stop(campaignId);
				await tx.wait();
				
				const closed = await crowdfund.campaigns(campaignId);
				const stopped = await crowdfund.stoppedCampaigns(campaignId);
				assert(stopped, "Campaign not stooped");
				assert(closed[7], "Campaign not closed"); // isStopped is at index 7,  use the func isStopped instead
			});

			it("Should revert if is not admin and not creator", async () => {
				const {crowdfund} = await loadFixture(deployContractFixture);
				let [owner, signer1, signer2] = await ethers.getSigners();
				const tx = await crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration);
				await tx.wait();

				const campaignId = (await crowdfund.campaignCount()) - 1n;
				await expect(crowdfund.connect(signer2).stop(campaignId))
					.to.be.revertedWith("Only creator or admin can stop a campaign");
			});

			// TODO: should revert if already stopped or closed
			// TODO: should reduce the number of user campaigns by 1
			// TODO: should emit ContractFundsIncreased

			it("Should transfer creator contribution to contract balance", async () => {
				const {crowdfund} = await loadFixture(deployContractFixture);
				let [owner, signer1] = await ethers.getSigners();
				const tx = await crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration);
				await tx.wait();

				const campaignId = (await crowdfund.campaignCount()) - 1n;
				const amount = ethers.parseEther("5");
				const tx2 = await crowdfund.connect(signer1).fundCampaign(campaignId, {value:amount});
				await tx2.wait();

				const tx3 = await crowdfund.connect(signer1).stop(campaignId);
				await tx3.wait();

				expect(await crowdfund.contractBalance())
					.to.equal(amount);
			});

			it("Should not revert if is campaign creator", async () => {
				const {crowdfund} = await loadFixture(deployContractFixture);
				let [owner, signer1] = await ethers.getSigners();
				const tx = await crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration);
				await tx.wait();

				const campaignId = (await crowdfund.campaignCount()) - 1n;
				await expect(crowdfund.connect(signer1).stop(campaignId))
					.not.to.be.reverted;
			});

			it("Should not revert if is admin", async () => {
				const {crowdfund} = await loadFixture(deployContractFixture);
				let [owner, signer1] = await ethers.getSigners();
				const tx = await crowdfund.connect(signer1).createCampaign(metadataUrl, goal, duration);
				await tx.wait();

				const campaignId = (await crowdfund.campaignCount()) - 1n;
				await expect(crowdfund.connect(owner).stop(campaignId))
					.not.to.be.reverted;
			});

			it("Should revert if campaign has expired", async () => {
				const { crowdfund, campaignId, owner } = await loadFixture(createCampaignFixture);
				const expiryTime = (await time.latest()) + duration
				await time.increase(duration);
				
				await expect(crowdfund.connect(owner).stop(campaignId))
					.to.be.revertedWith("Campaign has expired");
			});

			it("Should emit stopped event", async () => {
				const { crowdfund, campaignId } = await loadFixture(createCampaignFixture);
				
				await expect(crowdfund.stop(campaignId))
					.to.emit(crowdfund, "Stopped");
			});
		});

		describe("Taking refund", () => {
			it("Should revert if campaign is not stopped", async () => {
				const { crowdfund, campaignId } = await loadFixture(fundCampaignFixture);
				
				await expect(crowdfund.takeRefund(campaignId))
					.to.be.revertedWith("Refund is only available for stopped campaigns");
			});

			it("Should revert if user has not made contribution", async () => {
				const { crowdfund, campaignId, signer1 } = await loadFixture(fundCampaignFixture);
				const tx = await crowdfund.stop(campaignId);
				await tx.wait();

				await expect(crowdfund.connect(signer1).takeRefund(campaignId))
					.to.be.revertedWith("No funds available for refund");
			});

			// TODO: not revert if user has made contribution

			it("Should revert if is creator", async () => {
				const { crowdfund, campaignId, signer1 } = await loadFixture(fundCampaignFixture);
				const tx = await crowdfund.stop(campaignId);
				await tx.wait();

				await expect(crowdfund.takeRefund(campaignId))
					.to.be.revertedWith("Campaign creator can't take refund");
			});

			it("Should update balances after refunding", async () => {
				const { crowdfund, campaignId, signer1 } = await loadFixture(fundCampaignFixture);
				const amount = ethers.parseEther("6.32");
				const fundingTx = await crowdfund.connect(signer1).fundCampaign(campaignId, {value:amount});
				await fundingTx.wait();

				const tx = await crowdfund.stop(campaignId);
				await tx.wait();

				await expect(crowdfund.connect(signer1).takeRefund(campaignId))
					.to.changeEtherBalances([crowdfund, signer1], [-amount, amount]);
			});

			// TODO: Should reduce amount raised after withdrawing

			it("Should emit refunded event", async () => {
				const { crowdfund, campaignId, signer1 } = await loadFixture(fundCampaignFixture);
				const amount = ethers.parseEther("6.32");
				const fundingTx = await crowdfund.connect(signer1).fundCampaign(campaignId, {value:amount});
				await fundingTx.wait();

				const tx = await crowdfund.stop(campaignId);
				await tx.wait();

				await expect(crowdfund.connect(signer1).takeRefund(campaignId))
					.to.emit(crowdfund, "Refunded");
			});

			it("Should set contribution to 1 after taking refund", async () => {
				const { crowdfund, campaignId, signer1 } = await loadFixture(fundCampaignFixture);
				const amount = ethers.parseEther("6.32");
				const fundingTx = await crowdfund.connect(signer1).fundCampaign(campaignId, {value:amount});
				await fundingTx.wait();

				const tx = await crowdfund.stop(campaignId);
				await tx.wait();

				const tx2 = await crowdfund.connect(signer1).takeRefund(campaignId);
				await tx2.wait();

				expect(await crowdfund.connect(signer1).getContribution(campaignId, signer1.address)).to.equal(1);
			});

			it("Should revert if trying to re-refund", async () => {
				const { crowdfund, campaignId, signer1 } = await loadFixture(fundCampaignFixture);
				const amount = ethers.parseEther("6.32");
				const fundingTx = await crowdfund.connect(signer1).fundCampaign(campaignId, {value:amount});
				await fundingTx.wait();

				const tx = await crowdfund.stop(campaignId);
				await tx.wait();

				const tx2 = await crowdfund.connect(signer1).takeRefund(campaignId);
				await tx2.wait();

				await expect(crowdfund.connect(signer1).takeRefund(campaignId))
					.to.be.reverted;
			});
		});
	});

	describe("Taking funds out of contract", () => {
		describe("Withdraw contract funds", () => {
			it("Should revert if not admin", async () => {
				const { crowdfund, signer1 , amount} = await loadFixture(fundCampaignFixture);
				await expect(crowdfund.connect(signer1).withdraw(amount / 2n))
					.to.be.revertedWith("Only contract owner can withdraw");
			});
	
			it("Should revert if withdrawAmount > contractBalance ", async () => {
				const { crowdfund, amount } = await loadFixture(withdrawCampaignFundsFixture);
				await expect(crowdfund.withdraw(amount / 2n))
					.to.be.revertedWith("No available withdrawable funds");
			});

			it("Should update balances", async () => {
				const { owner, crowdfund, withdrawable} = await loadFixture(withdrawCampaignFundsFixture);
				await expect(crowdfund.withdraw(withdrawable))
					.to.changeEtherBalances([owner, crowdfund], [withdrawable, -withdrawable]);
			});

			it("Should update contractBalance", async () => {
				const { owner, crowdfund, withdrawable} = await loadFixture(withdrawCampaignFundsFixture);
				const tx = await crowdfund.withdraw(withdrawable);
				await tx.wait();

				expect(await crowdfund.contractBalance())
					.to.equal(0n);
			});

			it("Should emit ContractFundsWithdrawn event", async () => {
				const {crowdfund, withdrawable} = await loadFixture(withdrawCampaignFundsFixture);
				await expect(crowdfund.withdraw(withdrawable))
					.to.emit(crowdfund, "ContractFundsWithdrawn");
			});
		});

		describe("Transfer contract funds", () => {
			it("Should revert if not admin", async () => {
				const { crowdfund, signer1 , amount} = await loadFixture(fundCampaignFixture);
				await expect(crowdfund.connect(signer1).transfer(amount / 2n, signer1.address))
					.to.be.revertedWith("Only contract owner can transfer");
			});
			
			it("Should revert if admin is the receiver", async () => {
				const { crowdfund , amount, owner} = await loadFixture(fundCampaignFixture);
				await expect(crowdfund.transfer(amount / 2n, owner))
					.to.be.revertedWith("Owner should use withdraw function");
			});

			it("Should revert if withdrawAmount > contractBalance ", async () => {
				const { crowdfund, amount, signer1 } = await loadFixture(withdrawCampaignFundsFixture);
				await expect(crowdfund.transfer(amount / 2n, signer1))
					.to.be.revertedWith("No available transferrable funds");
			});

			it("Should update balances", async () => {
				const { signer1, crowdfund, withdrawable} = await loadFixture(withdrawCampaignFundsFixture);
				await expect(crowdfund.transfer(withdrawable, signer1))
					.to.changeEtherBalances([signer1, crowdfund], [withdrawable, -withdrawable]);
			});

			it("Should update contractBalance", async () => {
				const { owner, crowdfund, withdrawable, signer1} = await loadFixture(withdrawCampaignFundsFixture);
				const tx = await crowdfund.transfer(withdrawable / 2n, signer1);
				await tx.wait();

				expect(await crowdfund.contractBalance())
					.to.equal(withdrawable / 2n);
			});

			it("Should emit ContractFundsTransferred event", async () => {
				const {crowdfund, withdrawable, signer1} = await loadFixture(withdrawCampaignFundsFixture);
				await expect(crowdfund.transfer(withdrawable, signer1))
					.to.emit(crowdfund, "ContractFundsTransferred");
			});
		});
		
	});

	describe("Safe Mode", () => {
		it("Should turn on safe mode", async () => {
			const {crowdfund} = await loadFixture(deployContractFixture);
			const tx = await crowdfund.setSafeMode(true);
			await tx.wait();

			expect(await crowdfund.inSafeMode()).to.equal(true);
		});
		
		it("Should revert on creating campaign", async () => {
			const {crowdfund} = await loadFixture(safeModeFixture);
			await expect(crowdfund.createCampaign(metadataUrl, goal, duration))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert on sending funds", async () => {
			const {crowdfund, campaignId} = await loadFixture(safeModeFixture);
			const amount = ethers.parseEther("5");
			await expect(crowdfund.fundCampaign(campaignId, {value: amount}))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert on withdrawing campaign funds", async () => {
			const {crowdfund, campaignId} = await loadFixture(safeModeFixture);
			await expect(crowdfund.withdrawFunds(campaignId))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert on stopping a campaign", async () => {
			const {crowdfund, campaignId} = await loadFixture(safeModeFixture);
			await expect(crowdfund.stop(campaignId))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert on requesting refund", async () => {
			const {crowdfund, campaignId} = await loadFixture(safeModeFixture);
			await expect(crowdfund.takeRefund(campaignId))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert on withdrawing contract funds", async () => {
			const {crowdfund} = await loadFixture(safeModeFixture);
			const amount = ethers.parseEther("5");
			await expect(crowdfund.withdraw(amount))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert on transferring contract funds", async () => {
			const {crowdfund, signer1} = await loadFixture(safeModeFixture);
			const amount = ethers.parseEther("5");
			await expect(crowdfund.transfer(amount, signer1))
				.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
		});

		it("Should revert if caller is not deployer", async () => {
			const {crowdfund, signer1} = await loadFixture(deployContractFixture);
			await expect(crowdfund.connect(signer1).setSafeMode(true))
				.to.be.revertedWith("Only deployer can call this function");
		});

		it("Should revert if already in safe mode", async () => {
			const {crowdfund} = await loadFixture(deployContractFixture);
			const tx = await crowdfund.setSafeMode(true);
			await tx.wait();

			await expect(crowdfund.setSafeMode(true))
				.to.be.revertedWith("Contract is already in this state");
		});

		it("Should revert if setting safe mode to false while already false", async () => {
			const {crowdfund} = await loadFixture(deployContractFixture);
			
			await expect(crowdfund.setSafeMode(false))
				.to.be.revertedWith("Contract is already in this state");
		});

		it("Should not revert read-only functions", async () => {
			const {crowdfund, signer1, campaignId} = await loadFixture(safeModeFixture);
			
			await expect(crowdfund.getContribution(campaignId, signer1))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.calculateWithdrawAmount(campaignId))
				.not.to.be.reverted;
			await expect(crowdfund.isStopped(campaignId))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.isClosed(campaignId))
				.not.to.be.reverted;
			await expect(crowdfund.owner())
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.campaignCount())
				.not.to.be.reverted;
		});

		it("Should deactivate safe mode", async () => {
			const {crowdfund} = await loadFixture(safeModeFixture);
			const tx = await crowdfund.setSafeMode(false);
			await tx.wait();

			expect(await crowdfund.inSafeMode()).to.equal(false);
		});

		it("Should revert if deactivation by non deployer", async () => {
			const {crowdfund, signer1} = await loadFixture(safeModeFixture);
			
			await expect(crowdfund.connect(signer1).setSafeMode(false))
			.to.be.revertedWith("Only deployer can call this function");
		});

		it("Should not revert txs after deactivation", async () => {
			const {crowdfund, signer1, campaignId} = await loadFixture(safeModeFixture);
			const tx = await crowdfund.setSafeMode(false);
			await tx.wait();
			assert(await crowdfund.inSafeMode() === false, "Still in safe mode");

			const amount = ethers.parseEther("5");

			await expect(crowdfund.createCampaign(metadataUrl, goal, duration))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.fundCampaign(campaignId, {value: amount}))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.withdrawFunds(campaignId))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.stop(campaignId))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.takeRefund(campaignId))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.withdraw(amount * 2n))  // Should be > amount bcoz .stop has made all funds withdrawable
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			await expect(crowdfund.transfer(amount * 2n, signer1))
				.not.to.be.revertedWith("Contract is in safe mode (READ ONLY)");
			
		});
	});
});