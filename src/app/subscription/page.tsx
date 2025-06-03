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
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const router = useRouter();
// Add this to your component state
const [walletBalance, setWalletBalance] = useState<string>("0");

const fetchBalance = async (address: string) => {
  try {
    if (!window.ethereum) return;
    
    const provider = new ethers.BrowserProvider(window.ethereum as Eip1193Provider);
    const balance = await provider.getBalance(address);
    setWalletBalance(ethers.formatEther(balance));
  } catch (err) {
    console.error("Error fetching balance:", err);
  }
};

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

// Subscribe to a plan with improved error handling
const subscribe = async (planId: string, price: string) => {
  if (!walletAddress) {
    alert("Please connect your wallet first.");
    return;
  }

  if (typeof window !== "undefined" && window.ethereum) {
    try {
      setLoading(true);
      setSelectedPlan(planId);
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Check balance before proceeding
      const balance = await provider.getBalance(walletAddress);
      const requiredAmount = ethers.parseEther(price);
      
      // Estimate gas fees
      const contract = getContract(signer);
      let gasEstimate;
      try {
        gasEstimate = await contract.subscribe.estimateGas(planId, {
          value: requiredAmount,
        });
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        alert("Transaction simulation failed. Please check your wallet balance and try again.");
        return;
      }
      
      const gasPrice = await provider.getFeeData();
      const estimatedGasCost = gasEstimate * (gasPrice.gasPrice || 0n);
      const totalRequired = requiredAmount + estimatedGasCost;
      
      if (balance < totalRequired) {
        const balanceInEth = ethers.formatEther(balance);
        const requiredInEth = ethers.formatEther(totalRequired);
        alert(
          `Insufficient funds!\n` +
          `Your balance: ${parseFloat(balanceInEth).toFixed(6)} ETH\n` +
          `Required: ${parseFloat(requiredInEth).toFixed(6)} ETH\n` +
          `(${price} ETH + ~${ethers.formatEther(estimatedGasCost)} ETH gas fees)`
        );
        return;
      }
      
      // Proceed with transaction
      const tx = await contract.subscribe(planId, {
        value: requiredAmount,
        gasLimit: gasEstimate + (gasEstimate / 10n), // Add 10% buffer
      });
      
      alert("Transaction submitted! Waiting for confirmation...");
      await tx.wait();
      alert("Subscription successful!");
      router.push('/dashboard');
      
    } catch (err: any) {
      console.error("Error during subscription:", err);
      
      // Handle specific error types
      if (err.code === 'INSUFFICIENT_FUNDS') {
        alert("Insufficient funds! Please add more ETH to your wallet.");
      } else if (err.code === 'USER_REJECTED') {
        alert("Transaction cancelled by user.");
      } else if (err.code === 'NETWORK_ERROR') {
        alert("Network error. Please check your connection and try again.");
      } else if (err.message?.includes('insufficient funds')) {
        alert("Insufficient funds! Please add more ETH to your wallet for the subscription and gas fees.");
      } else {
        alert(`Subscription failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      setSelectedPlan("");
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
              fetchBalance(accounts[0]);
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

  // Logout functionality
  const handleLogout = () => {
    router.push('/');
  };

  // Get plan names and features
  const getPlanName = (planId: string) => {
    const planNames = { '1': 'Basic', '2': 'Standard', '3': 'Premium', '4': 'Ultimate' };
    return planNames[planId as keyof typeof planNames] || `Plan ${planId}`;
  };

  const getPlanIcon = (planId: string) => {
    const icons = { '1': '📱', '2': '💻', '3': '🖥️', '4': '🏆' };
    return icons[planId as keyof typeof icons] || '📺';
  };

  const getPlanGradient = (planId: string) => {
    const gradients = {
      '1': 'from-blue-500 to-cyan-500',
      '2': 'from-purple-500 to-pink-500',
      '3': 'from-orange-500 to-red-500',
      '4': 'from-yellow-400 to-orange-500'
    };
    return gradients[planId as keyof typeof gradients] || 'from-blue-500 to-purple-500';
  };

  const isPopular = (planId: string) => planId === '2'; // Make Standard plan popular

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
  <div className="flex items-center space-x-3">
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2">
      <span className="text-white text-sm font-mono">
        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
      </span>
    </div>
    <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full px-3 py-2">
      <span className="text-green-200 text-sm font-medium">
        {parseFloat(walletBalance).toFixed(4)} ETH
      </span>
    </div>
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
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Choose Your
              <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Perfect Plan
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Unlock premium content with our decentralized subscription plans. 
              Pick the plan that fits your streaming needs.
            </p>
          </div>

          {/* Pricing Plans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105 ${
                  isPopular(plan.id) ? 'ring-2 ring-purple-400 ring-opacity-50' : ''
                }`}
              >
                {/* Popular Badge */}
                {isPopular(plan.id) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${getPlanGradient(plan.id)} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <span className="text-2xl">{getPlanIcon(plan.id)}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {getPlanName(plan.id)}
                  </h3>
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {parseFloat(plan.price).toFixed(3)}
                    </span>
                    <span className="text-lg text-gray-300">ETH</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">per month</p>
                </div>

                {/* Plan Features */}
                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300 text-sm">{plan.resolution} Resolution</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300 text-sm">{plan.devices} Device Support</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300 text-sm">{plan.simultaneousStreams} Simultaneous Streams</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-300 text-sm">{plan.downloadDevices} Download Devices</span>
                  </div>
                </div>

                {/* Subscribe Button */}
                <button
                  onClick={() => subscribe(plan.id, plan.price)}
                  disabled={loading && selectedPlan === plan.id}
                  className={`group relative w-full inline-flex items-center justify-center px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r ${getPlanGradient(plan.id)} rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <span className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${getPlanGradient(plan.id)} opacity-0 group-hover:opacity-100 blur transition-opacity duration-300`}></span>
                  <span className="relative flex items-center space-x-2">
                    {loading && selectedPlan === plan.id ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Subscribe Now</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Features Comparison */}
          <div className="mt-16 sm:mt-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Why Choose DecentSubs?
              </h2>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Experience the future of streaming with blockchain-powered subscriptions
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  icon: "🔐",
                  title: "Blockchain Security",
                  description: "Your subscription is secured by smart contracts on the blockchain"
                },
                {
                  icon: "🌍",
                  title: "Truly Decentralized",
                  description: "No central authority controls your subscription or content access"
                },
                {
                  icon: "💰",
                  title: "Transparent Pricing",
                  description: "All fees are transparent and recorded on the blockchain"
                },
                {
                  icon: "⚡",
                  title: "Instant Activation",
                  description: "Your subscription activates immediately after blockchain confirmation"
                },
                {
                  icon: "🔄",
                  title: "Easy Management",
                  description: "Manage your subscription directly from your crypto wallet"
                },
                {
                  icon: "🛡️",
                  title: "Privacy First",
                  description: "Your personal data stays private with our decentralized approach"
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 border-t border-white/10 mt-12">
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