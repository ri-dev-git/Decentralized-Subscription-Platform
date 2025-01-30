"use client";

import { useState, useEffect } from "react";
import { ethers, Eip1193Provider } from "ethers";
import { getContract } from "../utils/contract";
import { useRouter } from 'next/navigation';


interface EthereumProvider {
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // Check subscription status
  const checkSubscription = async (address: string) => {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not found");
      }

      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const contract = getContract(provider);
      const isSubscribed = await contract.isSubscriber(address);

      if (isSubscribed) {
        router.push('/dashboard');
      } else {
        router.push('/subscription');
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">Decentralized Subscription Platform</h1>
      <button
        onClick={connectWallet}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg mt-4"
        disabled={loading}
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
    </div>
  );
}