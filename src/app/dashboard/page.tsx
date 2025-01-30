"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getContract } from "../../utils/contract";
import { ethers } from "ethers";

// Extend the type to include the `on` method
interface EthereumProvider {
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

interface Subscription {
  planId: number;
  startDate: Date;
  endDate: Date;
  plan: {
    resolution: string;
    devices: string;
    simultaneousStreams: number;
    downloadDevices: number;
  };
}

export default function Dashboard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Check subscription status
  const checkSubscription = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = getContract(provider);
        const accounts = await provider.send("eth_accounts", []);
        const address = accounts[0];

        if (!address) {
          router.push("/");
          return;
        }

        const isSubscribed = await contract.isSubscriber(address);

        if (!isSubscribed) {
          router.push("/subscription");
          return;
        }

        // Get subscription details
        const subscription = await contract.subscriptions(address);
        const plan = await contract.plans(subscription.planId);

        setSubscription({
          planId: Number(subscription.planId),
          startDate: new Date(Number(subscription.startDate) * 1000),
          endDate: new Date(Number(subscription.endDate) * 1000),
          plan: {
            resolution: plan.resolution,
            devices: plan.devices,
            simultaneousStreams: plan.simultaneousStreams,
            downloadDevices: plan.downloadDevices,
          },
        });
      } catch (err) {
        console.error("Error checking subscription:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
  };

  // Listen for account changes
  useEffect(() => {
    const ethereum = window.ethereum as EthereumProvider;

    if (ethereum && ethereum.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          checkSubscription();
        } else {
          router.push("/");
        }
      };

      ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }
  }, [router]);

  useEffect(() => {
    checkSubscription();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Subscription Dashboard</h1>
        {subscription && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Current Plan Details</h2>
            <div className="grid gap-4">
              <div>
                <strong>Plan ID:</strong> {subscription.planId}
              </div>
              <div>
                <strong>Start Date:</strong> {subscription.startDate.toLocaleDateString()}
              </div>
              <div>
                <strong>End Date:</strong> {subscription.endDate.toLocaleDateString()}
              </div>
              <div>
                <strong>Resolution:</strong> {subscription.plan.resolution}
              </div>
              <div>
                <strong>Available Devices:</strong> {subscription.plan.devices}
              </div>
              <div>
                <strong>Simultaneous Streams:</strong> {subscription.plan.simultaneousStreams}
              </div>
              <div>
                <strong>Download Devices:</strong> {subscription.plan.downloadDevices}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
