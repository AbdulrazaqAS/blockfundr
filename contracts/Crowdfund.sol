// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Crowdfund {
    struct Campaign {
        uint256 id;
        address creator;
        string metadataUrl;
        uint256 goal;
        uint256 deadline;
        uint256 fundsRaised;
        uint256 contributors;
        mapping(address => uint256) contributions;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;

    uint256 public MIN_GOAL = 0.0005 ether;
    uint256 public MIN_DURATION = 1 days;
    uint256 public WITHDRAW_PERCENT = 95;

    event CampaignCreated(uint256 indexed campaignId, address creator, uint256 goal, uint256 deadline);
    event Funded(uint256 indexed campaignId, address backer, uint256 amount);
    event Withdrawn(uint256 indexed campaignId, address creator, uint256 amount, uint256 time);
    // TODO: implement refund

    function createCampaign(string memory _metadataUrl, uint256 _goal, uint256 _duration) external {
        require(_goal >= MIN_GOAL, "Goal must be greater than MIN_GOAL");
        require(_duration >= MIN_DURATION, "Duration must be greater than MIN_DURATION");
        // TODO: Check for _metadataUrl
        // TODO: Add max open campaigns for an account

        Campaign storage campaign = campaigns[campaignCount];
        campaign.id = campaignCount;
        campaign.creator = msg.sender;
        campaign.metadataUrl = _metadataUrl;
        campaign.goal = _goal;
        campaign.deadline = block.timestamp + _duration;

        campaignCount++;
        emit CampaignCreated(campaignCount, msg.sender, _goal, campaign.deadline);
    }

    function fundCampaign(uint256 _campaignId) external payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp < campaign.deadline, "Campaign expired");
        require(msg.value > 0, "Must send ETH");

        // If is new contributor
        if (campaign.contributions[msg.sender] == 0){
            campaign.contributors++;
        }

        campaign.fundsRaised += msg.value;
        campaign.contributions[msg.sender] += msg.value;


        emit Funded(_campaignId, msg.sender, msg.value);
    }

    function withdrawFunds(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only creator can withdraw");
        require(campaign.fundsRaised >= campaign.goal || block.timestamp > campaign.deadline, 
            "Wait for campaign to expire or reach funding goal");

        uint256 amount = (campaign.fundsRaised * WITHDRAW_PERCENT) / 100;

        payable(msg.sender).transfer(amount);
        emit Withdrawn(_campaignId, msg.sender, amount, block.timestamp);
    }

    function getContribution(uint256 _campaignId, address _contributor) external view returns (uint256) {
        return campaigns[_campaignId].contributions[_contributor];
    }

    function calculateWithdrawAmount(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        return (campaign.fundsRaised * WITHDRAW_PERCENT) / 100;
    }
}