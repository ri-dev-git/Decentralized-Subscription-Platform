// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SubscriptionPlatform is Ownable {
    struct Plan {
        uint256 id;
        uint256 price; // in wei
        uint256 duration; // in seconds
        string resolution; // e.g., "480p", "720p", "1080p", "4K"
        string devices; // e.g., "Mobile, Tablet, TV"
        uint256 simultaneousStreams; // Number of simultaneous streams allowed
        uint256 downloadDevices; // Number of devices for downloads
        address creator;
    }

    struct Subscription {
        uint256 planId;
        uint256 startDate;
        uint256 endDate;
    }

    uint256 public planCount;
    mapping(uint256 => Plan) public plans;
    mapping(address => Subscription) public subscriptions;

    event PlanCreated(uint256 planId, uint256 price, uint256 duration, string resolution, string devices, uint256 simultaneousStreams, uint256 downloadDevices, address creator);
    event Subscribed(address user, uint256 planId, uint256 startDate, uint256 endDate);

    constructor() Ownable(msg.sender) {
        // Initialize default plans when the contract is deployed
        createPlan(0.01 ether, 30 days, "480p", "Mobile, Tablet", 1, 1);
        createPlan(0.02 ether, 30 days, "720p", "Mobile, Tablet, TV", 1, 1);
        createPlan(0.05 ether, 30 days, "1080p", "Mobile, Tablet, TV", 2, 2);
        createPlan(0.1 ether, 30 days, "4K", "Mobile, Tablet, TV", 4, 6);
    }

    function createPlan(
        uint256 price,
        uint256 duration,
        string memory resolution,
        string memory devices,
        uint256 simultaneousStreams,
        uint256 downloadDevices
    ) public {
        require(price > 0, "Price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        
        planCount++;
        plans[planCount] = Plan(
            planCount,
            price,
            duration,
            resolution,
            devices,
            simultaneousStreams,
            downloadDevices,
            msg.sender
        );

        emit PlanCreated(planCount, price, duration, resolution, devices, simultaneousStreams, downloadDevices, msg.sender);
    }

    function subscribe(uint256 planId) external payable {
        Plan memory plan = plans[planId];
        require(plan.id > 0, "Plan does not exist");
        require(msg.value == plan.price, "Incorrect payment amount");

        subscriptions[msg.sender] = Subscription(
            planId,
            block.timestamp,
            block.timestamp + plan.duration
        );

        emit Subscribed(msg.sender, planId, block.timestamp, block.timestamp + plan.duration);
    }

    function isSubscriber(address user) external view returns (bool) {
        Subscription memory subscription = subscriptions[user];
        return subscription.endDate > block.timestamp;
    }

    // Function to get plan details by ID
    function getPlan(uint256 planId) external view returns (Plan memory) {
        require(planId > 0 && planId <= planCount, "Invalid plan ID");
        return plans[planId];
    }
}