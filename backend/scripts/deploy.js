const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const SubscriptionPlatform = await hre.ethers.getContractFactory("SubscriptionPlatform");

  // Deploy the contract
  const subscription = await SubscriptionPlatform.deploy();

  // Wait for the contract to be deployed
  await subscription.waitForDeployment();

  // Get the deployed contract's address
  const subscriptionAddress = await subscription.getAddress();

  console.log("SubscriptionPlatform deployed to:", subscriptionAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});