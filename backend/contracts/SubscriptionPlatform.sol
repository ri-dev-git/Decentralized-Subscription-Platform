// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SubscriptionPlatform is Ownable {
    struct Plan {
        uint256 id;
        uint256 price; // in wei
        uint256 duration; // in seconds
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

    event PlanCreated(uint256 planId, uint256 price, uint256 duration, address creator);
    event Subscribed(address user, uint256 planId, uint256 startDate, uint256 endDate);

    constructor() Ownable(msg.sender) {}

    function createPlan(uint256 price, uint256 duration) external {
        require(price > 0, "Price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        
        planCount++;
        plans[planCount] = Plan(planCount, price, duration, msg.sender);

        emit PlanCreated(planCount, price, duration, msg.sender);
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
}