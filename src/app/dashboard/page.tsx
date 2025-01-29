'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getContract,contractABI,contractAddress } from "../../utils/contract";
import { ethers, Eip1193Provider } from "ethers";

const Dashboard = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        console.log(accounts)
        
        if (accounts.length === 0) {
          router.push('/');
          return;
        }

        // Get contract ABI and address (you'll need to provide these)
        // const contractABI = contractABI;
        // const contractAddress = contractAddress;

        // Create contract instance
       const provider = new ethers.BrowserProvider(window.ethereum);
       console.log(contractABI)
        const contract =getContract(provider);
        
        const address = accounts[0];
        const isSubscribed = await contract.isSubscriber(address);
        
        if (!isSubscribed) {
          router.push('/');
          return;
        }

        // Get subscription details
        const subscription = await contract.subscriptions(address);
        const plan = await contract.getPlan(subscription.planId);
        
        setSubscription({
          planId: subscription.planId,
          startDate: new Date(Number(subscription.startDate) * 1000),
          endDate: new Date(Number(subscription.endDate) * 1000),
          plan: {
            resolution: plan.resolution,
            devices: plan.devices,
            simultaneousStreams: plan.simultaneousStreams,
            downloadDevices: plan.downloadDevices
          }
        });
        
      } catch (err) {
        console.error('Error checking subscription:', err);
        router.push('/');
      }
    }
    setLoading(false);
  };

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
};

export default Dashboard;