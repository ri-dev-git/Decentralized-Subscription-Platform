"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getContract } from "../utils/contract";
import { useRouter } from 'next/navigation';
import { 
  connectWallet, 
  isWalletConnected, 
  isOnSepoliaNetwork,
  switchToSepolia,
  getWalletAddress,
  onAccountsChanged,
  onChainChanged,
  removeWalletListeners
} from "../utils/connectWallet";

interface EthereumProvider {
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean>(false);
  const [networkLoading, setNetworkLoading] = useState<boolean>(false);
  const router = useRouter();

  // Check subscription status
  const checkSubscription = async (address: string) => {
    try {
      if (!window.ethereum) {
        throw new Error("Ethereum provider not found");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
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

  // Check wallet connection and network on component mount
  const checkWalletStatus = async () => {
    try {
      const connected = await isWalletConnected();
      setIsConnected(connected);
      
      if (connected) {
        const address = await getWalletAddress();
        if (address) {
          setWalletAddress(address);
          
          const onSepolia = await isOnSepoliaNetwork();
          setIsOnCorrectNetwork(onSepolia);
          
          if (onSepolia) {
            await checkSubscription(address);
          }
        }
      }
    } catch (err) {
      console.error("Error checking wallet status:", err);
    }
  };

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      const signer = await connectWallet();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      setIsConnected(true);
      setIsOnCorrectNetwork(true);
      
      await checkSubscription(address);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async () => {
    try {
      setNetworkLoading(true);
      await switchToSepolia();
      setIsOnCorrectNetwork(true);
      
      if (walletAddress) {
        await checkSubscription(walletAddress);
      }
    } catch (err) {
      console.error("Network switch failed:", err);
      alert("Failed to switch to Sepolia network");
    } finally {
      setNetworkLoading(false);
    }
  };

  // Handle account changes
  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length > 0) {
      const newAddress = accounts[0];
      setWalletAddress(newAddress);
      setIsConnected(true);
      
      const onSepolia = await isOnSepoliaNetwork();
      setIsOnCorrectNetwork(onSepolia);
      
      if (onSepolia) {
        await checkSubscription(newAddress);
      }
    } else {
      setWalletAddress("");
      setIsConnected(false);
      setIsOnCorrectNetwork(false);
    }
  };

  // Handle network changes
  const handleChainChanged = async () => {
    const onSepolia = await isOnSepoliaNetwork();
    setIsOnCorrectNetwork(onSepolia);
    
    if (onSepolia && walletAddress) {
      await checkSubscription(walletAddress);
    }
  };

  // Setup event listeners
  useEffect(() => {
    checkWalletStatus();
    
    // Setup event listeners
    onAccountsChanged(handleAccountsChanged);
    onChainChanged(handleChainChanged);
    
    return () => {
      removeWalletListeners();
    };
  }, []);

  // Render different states based on wallet connection and network
  const renderWalletButton = () => {
    if (!isConnected) {
      return (
        <button
          onClick={handleConnectWallet}
          disabled={loading}
          className="group relative inline-flex items-center justify-center px-8 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl hover:shadow-blue-500/25 hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></span>
          <span className="relative flex items-center space-x-3">
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Connect Wallet</span>
              </>
            )}
          </span>
        </button>
      );
    }

    if (!isOnCorrectNetwork) {
      return (
        <button
          onClick={handleSwitchNetwork}
          disabled={networkLoading}
          className="group relative inline-flex items-center justify-center px-8 sm:px-12 py-4 sm:py-5 text-lg sm:text-xl font-semibold text-white bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl shadow-2xl hover:shadow-red-500/25 hover:scale-105 transform transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-600 to-orange-600 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></span>
          <span className="relative flex items-center space-x-3">
            {networkLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Switching...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Switch to Sepolia</span>
              </>
            )}
          </span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
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
          
          {walletAddress && (
            <div className="flex items-center space-x-3">
              {/* Network Status Indicator */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm ${
                isOnCorrectNetwork 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isOnCorrectNetwork ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{isOnCorrectNetwork ? 'Sepolia' : 'Wrong Network'}</span>
              </div>
              
              {/* Wallet Address */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2">
                <span className="text-white text-sm font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Decentralized
              <span className="block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Subscription Platform
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
              Experience the future of subscriptions with blockchain technology. 
              Secure, transparent, and truly decentralized.
            </p>
          </div>

          {/* CTA Section */}
          <div className="space-y-6 sm:space-y-8">
            {renderWalletButton()}

            <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto px-4">
              {!isConnected 
                ? "Connect your Rainbow Wallet, MetaMask, or any Web3 wallet to get started" 
                : !isOnCorrectNetwork 
                ? "Please switch to Sepolia network to continue"
                : "By using this platform, you agree to our terms of service and privacy policy"
              }
            </p>
          </div>

          {/* Features Grid */}
          <div className="mt-16 sm:mt-20 lg:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4">
            {[
              {
                icon: "🔒",
                title: "Secure",
                description: "Built on blockchain for maximum security"
              },
              {
                icon: "🌐",
                title: "Decentralized",
                description: "No central authority, truly peer-to-peer"
              },
              {
                icon: "⚡",
                title: "Fast",
                description: "Lightning-fast transactions and updates"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105"
              >
                <div className="text-3xl sm:text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 border-t border-white/10">
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