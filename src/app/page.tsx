"use client";

import { useState } from "react";
import { ethers, Eip1193Provider } from "ethers";
import { getContract } from "../utils/contract";
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

interface Plan {
  id: string;
  price: string; // Price in ETH or tokens
  resolution: string;
  devices: string;
  simultaneousStreams: number;
  downloadDevices: number;
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: "1",
      price: "0.01", // 0.01 ETH
      resolution: "480p",
      devices: "Mobile phone, tablet",
      simultaneousStreams: 1,
      downloadDevices: 1,
    },
    {
      id: "2",
      price: "0.02", // 0.02 ETH
      resolution: "720p (HD)",
      devices: "TV, computer, mobile phone, tablet",
      simultaneousStreams: 1,
      downloadDevices: 1,
    },
    {
      id: "3",
      price: "0.05", // 0.05 ETH
      resolution: "1080p (Full HD)",
      devices: "TV, computer, mobile phone, tablet",
      simultaneousStreams: 2,
      downloadDevices: 2,
    },
    {
      id: "4",
      price: "0.1", // 0.1 ETH
      resolution: "4K (Ultra HD) + HDR",
      devices: "TV, computer, mobile phone, tablet",
      simultaneousStreams: 4,
      downloadDevices: 6,
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // Check subscription status
  const checkSubscription = async (address: string) => {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not found");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const contract = getContract(provider);
      const isSubscribed = await contract.isSubscriber(address);
  
      if (isSubscribed) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
    }
  };


  // Connect wallet
  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        setLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const address = accounts[0];
        setWalletAddress(address);
        await checkSubscription(address);
      } catch (err) {
        console.error("Wallet connection failed:", err);
      } finally {
        setLoading(false);
      }
    } else {
      alert("MetaMask is not installed!");
    }
  };


  // Subscribe to a plan
 const subscribe = async (planId: string, price: string) => {
    if (!walletAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        setLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = getContract(signer);
        const tx = await contract.subscribe(planId, {
          value: ethers.parseEther(price),
        });
        await tx.wait();
        alert("Subscription successful!");
        router.push('/dashboard');
      } catch (err) {
        console.error("Error during subscription:", err);
        alert("Subscription failed!");
      } finally {
        setLoading(false);
      }
    } else {
      alert("MetaMask is not installed!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
    <h1 className="text-3xl font-bold mb-4 text-center">Decentralized Subscription Platform</h1>
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
  
    <div className="mt-6 w-full max-w-4xl">
      <h2 className="text-xl font-semibold mb-4 text-center">Choose the plan that’s right for you</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white p-6 rounded-lg shadow-lg flex flex-col">
            <div className="flex-grow">
              <h3 className="text-xl font-semibold mb-4">Plan {plan.id}</h3>
              <p className="text-2xl font-bold mb-4">{plan.price} ETH</p>
              <ul className="space-y-2">
                <li>
                  <strong>Resolution:</strong> {plan.resolution}
                </li>
                <li>
                  <strong>Devices:</strong> {plan.devices}
                </li>
                <li>
                  <strong>Simultaneous Streams:</strong> {plan.simultaneousStreams}
                </li>
                <li>
                  <strong>Download Devices:</strong> {plan.downloadDevices}
                </li>
              </ul>
            </div>
            <button
              onClick={() => subscribe(plan.id, plan.price)}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Subscribe
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
  );
}