"use client";

import { useState, useEffect } from "react";
import { ethers, Eip1193Provider } from "ethers";
import { getContract } from "../../utils/contract";
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

interface EthereumProvider {
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}


interface Plan {
  id: string;
  price: string;
  resolution: string;
  devices: string;
  simultaneousStreams: number;
  downloadDevices: number;
}

export default function Subscription() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // Fetch subscription plans
  const fetchPlans = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not found");
      }

      const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
      const contract = getContract(provider);
      const planCount = await contract.planCount();
      const fetchedPlans: Plan[] = [];

      for (let i = 1; i <= planCount; i++) {
        const plan = await contract.plans(i);
        fetchedPlans.push({
          id: plan.id.toString(),
          price: ethers.formatEther(plan.price),
          resolution: plan.resolution,
          devices: plan.devices,
          simultaneousStreams: plan.simultaneousStreams,
          downloadDevices: plan.downloadDevices,
        });
      }

      setPlans(fetchedPlans);
    } catch (err) {
      console.error("Error fetching plans:", err);
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

  // Check wallet connection on load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      }
    };

    checkWalletConnection();
    fetchPlans();
  }, []);

  // Listen for account changes
  useEffect(() => {
    const ethereum = window.ethereum as EthereumProvider;

    if (ethereum && ethereum.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          checkSubscription(accounts[0]);
        } else {
          setWalletAddress("");
          router.push('/');
        }
      };

      ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }
  }, [router]);

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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Choose the plan that’s right for you</h1>
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
              disabled={loading}
            >
              {loading ? "Subscribing..." : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}