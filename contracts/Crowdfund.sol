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
        uint256 totalContributors;
        bool isClosed;
        mapping(address => uint256) contributions;
    }

    address public owner;
    bool public inSafeMode = false;
    uint256 public campaignCount;
    uint256 public closedCampaigns;
    uint256 public contractBalance;
    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256) public usersCampaigns;
    mapping(uint256 => bool) public stoppedCampaigns;

    uint256 public constant MIN_GOAL = 0.01 ether;
    uint256 public constant MIN_DURATION = 1 days;
    uint256 public constant WITHDRAW_PERCENT = 95;
    uint256 public constant MAX_CAMPAIGNS = 3;

    event CampaignCreated(uint256 campaignId, address indexed creator);
    event Funded(uint256 indexed campaignId, address indexed backer, uint256 amount);
    event Withdrawn(uint256 campaignId, address indexed creator, uint256 amount);
    event Refunded(uint256 indexed campaignId, address indexed backer, uint256 amount);
    event Stopped(uint256 campaignId, bool byCreator);
    event ContractFundsIncreased(uint256 indexed actionType, uint256 campaignId, uint256 amount);
    event ContractFundsWithdrawn(uint256 amount);
    event ContractFundsTransferred(address indexed receiver, uint256 amount);

    modifier notInSafeMode() {
        require(!inSafeMode, "Contract is in safe mode (READ ONLY)");
        _;
    }

    constructor () {
        owner = msg.sender;
    }

    // TODO: Make contract stopable by owner (stop creating campaigns)
    // TODO: Add setters
    // TODO: Implement Checks-Effects-Interactions pattern
    function createCampaign(string memory _metadataUrl, uint256 _goal, uint256 _duration) external notInSafeMode {
        require(_goal >= MIN_GOAL, "Goal must be greater than MIN_GOAL");
        require(_duration >= MIN_DURATION, "Duration must be greater than MIN_DURATION");
        require(msg.sender == owner || usersCampaigns[msg.sender] < MAX_CAMPAIGNS,
            "Max campaigns reached. Close some to create new ones");
        // TODO: Check for _metadataUrl validity

        Campaign storage campaign = campaigns[campaignCount];
        campaign.id = campaignCount;
        campaign.creator = msg.sender;
        campaign.metadataUrl = _metadataUrl;
        campaign.goal = _goal;
        campaign.deadline = block.timestamp + _duration;

        usersCampaigns[msg.sender]++;
        campaignCount++;
        emit CampaignCreated(campaignCount, msg.sender);
    }

    function fundCampaign(uint256 _campaignId) external payable notInSafeMode {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp < campaign.deadline, "Campaign expired");
        require(!campaign.isClosed, "Campaign is closed");
        require(msg.value > 0, "Must send ETH");

        // If is new contributor
        if (campaign.contributions[msg.sender] == 0){
            campaign.totalContributors++;
        }

        campaign.fundsRaised += msg.value;
        campaign.contributions[msg.sender] += msg.value;

        emit Funded(_campaignId, msg.sender, msg.value);
    }

    function withdrawFunds(uint256 _campaignId) external notInSafeMode {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.creator, "Only creator can withdraw");
        require(!campaign.isClosed, "Campaign is closed. Funds already withdrawn");
        require(campaign.fundsRaised >= campaign.goal || block.timestamp > campaign.deadline, 
            "Wait for campaign to expire or reach funding goal");
        // TODO: Admins can withdraw campaign funds after long time of creator inactivity

        uint256 amount = (campaign.fundsRaised * WITHDRAW_PERCENT) / 100;
        uint256 contractAmount = campaign.fundsRaised - amount;

        payable(msg.sender).transfer(amount);
        contractBalance += contractAmount;  // Withdrawable/transferable by contract
        campaign.isClosed = true;
        usersCampaigns[msg.sender]--;  // TODO: Avoid setting it to zero to reduce gas
        closedCampaigns++;
        emit Withdrawn(_campaignId, msg.sender, amount);
        emit ContractFundsIncreased(0, _campaignId, contractAmount);
    }

    function stop(uint256 _campaignId) external notInSafeMode {
        Campaign storage campaign = campaigns[_campaignId];
        require(owner == msg.sender || msg.sender == campaign.creator, "Only creator or admin can stop a campaign");
        require(!stoppedCampaigns[_campaignId], "Campaign is already stopped");
        require(!campaign.isClosed, "Campaign is already closed");
        require(block.timestamp < campaign.deadline, "Campaign has expired");

        stoppedCampaigns[_campaignId] = true;
        campaign.isClosed = true;
        usersCampaigns[campaign.creator]--;  //  Bug: usersCampaigns[msg.sender]--
        closedCampaigns++;

        // Penlaty for closing an ongoing campaign. To avoid malicious acts.
        uint256 creatorContribution = getContribution(_campaignId, campaign.creator);
        if (creatorContribution > 0) {
            contractBalance += creatorContribution;
            campaign.fundsRaised -= creatorContribution;
            emit ContractFundsIncreased(1, _campaignId, creatorContribution);
            // No need to change the contributed amount to 0 since creators can't take refund
        }

        emit Stopped(_campaignId, msg.sender == campaign.creator);
    }

    function takeRefund(uint256 _campaignId) external notInSafeMode {
        uint256 contribution = getContribution(_campaignId, msg.sender);
        require(stoppedCampaigns[_campaignId], "Refund is only available for stopped campaigns");
        require(contribution > 1, "No funds available for refund"); // 1 because read below
        
        // TODO: Contract can use a refund that is not taken after a long time.
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.creator != msg.sender, "Campaign creator can't take refund");  // Penalty for stopping

        campaign.fundsRaised -= contribution;
        payable(msg.sender).transfer(contribution);

        campaign.contributions[msg.sender] = 1; // 1 to reduce gas cost of setting a variable to 0
        emit Refunded(_campaignId, msg.sender, contribution);
    }

    function withdraw(uint256 _amount) external notInSafeMode {
        require(msg.sender == owner, "Only contract owner can withdraw");
        require(_amount <= contractBalance, "No available withdrawable funds");
        payable(owner).transfer(_amount);
        contractBalance -= _amount;

        emit ContractFundsWithdrawn(_amount);
    }

    function transfer(uint256 _amount, address _receiver) external notInSafeMode {
        require(msg.sender == owner, "Only contract owner can transfer");
        require(_receiver != owner, "Owner should use withdraw function");
        require(_amount <= contractBalance, "No available transferrable funds");
        payable(_receiver).transfer(_amount);
        contractBalance -= _amount;

        emit ContractFundsTransferred(_receiver, _amount);
    }

    function setSafeMode(bool _inSafeMode) external {
        require(msg.sender == owner, "Only deployer can call this function");
        require(inSafeMode != _inSafeMode, "Contract is already in this state");

        inSafeMode = _inSafeMode;
    }

    function getContribution(uint256 _campaignId, address _contributor) public view returns (uint256) {
        return campaigns[_campaignId].contributions[_contributor];
    }

    function calculateWithdrawAmount(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        return (campaign.fundsRaised * WITHDRAW_PERCENT) / 100;
    }

    function isStopped(uint256 _campaignId) external view returns (bool) {
        return stoppedCampaigns[_campaignId];
    }

    function isClosed(uint256 _campaignId) external view returns (bool) {
        return campaigns[_campaignId].isClosed;
    }
}