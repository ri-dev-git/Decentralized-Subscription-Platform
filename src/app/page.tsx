"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getContract } from "../utils/contract.js";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        setWalletAddress(await signer.getAddress());
        fetchPlans(signer);
      } catch (err) {
        console.error("Wallet connection failed:", err);
      }
    } else {
      alert("MetaMask is not installed!");
    }
  };

  // Fetch subscription plans
  const fetchPlans = async (signer) => {
    try {
      const contract = getContract(signer);
      const planCount = await contract.planCount();
      const fetchedPlans = [];
      for (let i = 1; i <= planCount; i++) {
        const plan = await contract.plans(i);
        fetchedPlans.push({
          id: plan.id.toString(),
          price: ethers.formatEther(plan.price),
          duration: plan.duration.toString(),
        });
      }
      setPlans(fetchedPlans);
    } catch (err) {
      console.error("Error fetching plans:", err);
    }
  };

  // Subscribe to a plan
  const subscribe = async (planId, price) => {
    if (!walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const tx = await contract.subscribe(planId, {
        value: ethers.parseEther(price),
      });
      await tx.wait();
      alert("Subscription successful!");
    } catch (err) {
      console.error("Error during subscription:", err);
      alert("Subscription failed!");
    }
  };

  return (
    <div className="min-h-screen bg-black-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4">Decentralized Subscription Platform</h1>
      {walletAddress ? (
        <p className="text-green-600">Connected Wallet: {walletAddress}</p>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg mt-4"
        >
          Connect Wallet
        </button>
      )}

      <div className="mt-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Available Subscription Plans</h2>
        <ul className="space-y-4">
          {plans.map((plan) => (
            <li key={plan.id} className="bg-white p-4 rounded-lg shadow">
              <p>
                <strong>Plan ID:</strong> {plan.id}
              </p>
              <p>
                <strong>Price:</strong> {plan.price} ETH
              </p>
              <p>
                <strong>Duration:</strong> {plan.duration} seconds
              </p>
              <button
                onClick={() => subscribe(plan.id, plan.price)}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
              >
                Subscribe
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}