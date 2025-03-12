// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Crowdfund {
    struct Campaign {
        address creator;
        string metadataUrl;
        uint256 goal;
        uint256 deadline;
        uint256 fundsRaised;
        bool goalReached;
        mapping(address => uint256) contributions;
    }

    uint public campaignCount;
    mapping(uint => Campaign) public campaigns;

    uint256 public MIN_GOAL = 0.0005 ether;
    uint256 public MIN_DURATION = 1 days;

    event CampaignCreated(uint indexed campaignId, address creator, uint goal, uint deadline);
    event Funded(uint indexed campaignId, address backer, uint amount);
    event Withdrawn(uint indexed campaignId, address creator, uint amount);
    event Refunded(uint indexed campaignId, address backer, uint amount);

    function createCampaign(string memory _metadataUrl, uint _goal, uint _duration) external {
        require(_goal >= MIN_GOAL, "Goal must be greater than MIN_GOAL");
        require(_duration >= MIN_DURATION, "Duration must be greater than MIN_DURATION");
        // TODO: Check for _metadataUrl
        // TODO: Add max open campaigns for an account
        
        campaignCount++;
        Campaign storage campaign = campaigns[campaignCount];
        campaign.creator = msg.sender;
        campaign.metadataUrl = _metadataUrl;
        campaign.goal = _goal;
        campaign.deadline = block.timestamp + _duration;

        emit CampaignCreated(campaignCount, msg.sender, _goal, campaign.deadline);
    }
}