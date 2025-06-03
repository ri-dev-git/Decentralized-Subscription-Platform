"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { getContract } from "../../utils/contract";
import { ethers } from "ethers";

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

interface EthereumProvider {
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

export default function Dashboard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const router = useRouter();

  // Check subscription status
  const checkSubscription = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = getContract(provider);
        const accounts = await provider.send("eth_accounts", []);
        const address = accounts[0];

        if (!address) {
          router.push('/');
          return;
        }

        setWalletAddress(address);

        const isSubscribed = await contract.isSubscriber(address);

        if (!isSubscribed) {
          router.push('/subscription');
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
        console.error('Error checking subscription:', err);
        router.push('/');
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
          router.push('/');
        }
      };

      ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      };
    }
  }, [router]);

  useEffect(() => {
    checkSubscription();
  }, []);

  // Logout functionality
  const handleLogout = () => {
    router.push('/');
  };

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription) return 0;
    const now = new Date();
    const timeDiff = subscription.endDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  };

  // Get plan name based on planId
  const getPlanName = (planId: number) => {
    const planNames = ['Basic', 'Standard', 'Premium'];
    return planNames[planId] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl text-white">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(156, 146, 172, 0.3) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">DecentSubs</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {walletAddress && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2">
                <span className="text-white text-sm font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 hover:text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm"
            >
              Logout
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Welcome to Your
              <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
              Manage your decentralized subscription and enjoy premium content
            </p>
          </div>

          {subscription && (
            <>
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">📊</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Plan</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {getPlanName(subscription.planId)}
                  </div>
                  <div className="text-sm text-gray-300">Active Subscription</div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">⏰</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Remaining</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {getDaysRemaining()}
                  </div>
                  <div className="text-sm text-gray-300">Days Left</div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">📺</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Streams</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {subscription.plan.simultaneousStreams}
                  </div>
                  <div className="text-sm text-gray-300">Simultaneous</div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">📱</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Devices</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {subscription.plan.downloadDevices}
                  </div>
                  <div className="text-sm text-gray-300">Download</div>
                </div>
              </div>

              {/* Main Subscription Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Subscription Info */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl sm:text-2xl font-semibold text-white">Subscription Details</h2>
                    <div className="bg-green-500/20 border border-green-400/30 text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-gray-300">Plan ID</span>
                      <span className="text-white font-medium">#{subscription.planId}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-gray-300">Start Date</span>
                      <span className="text-white font-medium">
                        {subscription.startDate.toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <span className="text-gray-300">End Date</span>
                      <span className="text-white font-medium">
                        {subscription.endDate.toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-3">
                      <span className="text-gray-300">Resolution</span>
                      <span className="text-white font-medium bg-blue-500/20 border border-blue-400/30 px-2 py-1 rounded text-sm">
                        {subscription.plan.resolution}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plan Features */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8">
                  <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6">Plan Features</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📺</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{subscription.plan.resolution} Streaming</div>
                        <div className="text-gray-400 text-sm">Crystal clear video quality</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📱</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{subscription.plan.devices} Device Support</div>
                        <div className="text-gray-400 text-sm">Watch on multiple devices</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">⚡</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{subscription.plan.simultaneousStreams} Simultaneous Streams</div>
                        <div className="text-gray-400 text-sm">Stream on multiple devices at once</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">💾</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{subscription.plan.downloadDevices} Download Devices</div>
                        <div className="text-gray-400 text-sm">Offline viewing capability</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 mt-8 sm:mt-12">
                <button className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transform transition-all duration-300 w-full sm:w-auto">
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></span>
                  <span className="relative flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Renew Subscription</span>
                  </span>
                </button>
                
                <button className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 border border-white/20 rounded-2xl hover:bg-white/20 transform transition-all duration-300 hover:scale-105 backdrop-blur-sm w-full sm:w-auto">
                  <span className="relative flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Account Settings</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <p className="text-gray-400 text-sm text-center sm:text-left">
            © 2025 DecentSubs. Built with ❤️ for the decentralized future.
          </p>
          <div className="flex space-x-6 text-sm">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}