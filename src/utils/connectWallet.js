import { ethers } from "ethers";

// Sepolia network configuration
const SEPOLIA_NETWORK = {
  chainId: "0xAA36A7", // 11155111 in hex
  chainName: "Sepolia Test Network",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.infura.io/v3/YOUR_INFURA_KEY"], // Replace with your RPC URL
  blockExplorerUrls: ["https://sepolia.etherscan.io/"],
};

// Check if wallet is connected
export const isWalletConnected = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      return accounts.length > 0;
    } catch (err) {
      console.error("Error checking wallet connection:", err);
      return false;
    }
  }
  return false;
};

// Check if user is on Sepolia network
export const isOnSepoliaNetwork = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      return chainId === SEPOLIA_NETWORK.chainId;
    } catch (err) {
      console.error("Error checking network:", err);
      return false;
    }
  }
  return false;
};

// Switch to Sepolia network
export const switchToSepolia = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_NETWORK.chainId }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to the wallet
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [SEPOLIA_NETWORK],
          });
        } catch (addError) {
          console.error("Error adding Sepolia network:", addError);
          throw addError;
        }
      } else {
        console.error("Error switching to Sepolia network:", switchError);
        throw switchError;
      }
    }
  }
};

// Connect wallet with Rainbow Wallet support
export const connectWallet = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      
      // Check if on correct network
      const onSepolia = await isOnSepoliaNetwork();
      if (!onSepolia) {
        const shouldSwitch = confirm(
          "You're not connected to Sepolia network. Would you like to switch?"
        );
        if (shouldSwitch) {
          await switchToSepolia();
        } else {
          throw new Error("Please switch to Sepolia network to continue.");
        }
      }
      
      const signer = await provider.getSigner();
      return signer;
    } catch (err) {
      console.error("Error connecting to wallet:", err);
      throw err;
    }
  } else {
    const error = "No Web3 wallet detected. Please install MetaMask, Rainbow Wallet, or another Web3 wallet.";
    alert(error);
    throw new Error(error);
  }
};

// Get wallet address
export const getWalletAddress = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return await signer.getAddress();
    } catch (err) {
      console.error("Error getting wallet address:", err);
      return null;
    }
  }
  return null;
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
  if (typeof window.ethereum !== "undefined") {
    window.ethereum.on("accountsChanged", callback);
  }
};

// Listen for network changes
export const onChainChanged = (callback) => {
  if (typeof window.ethereum !== "undefined") {
    window.ethereum.on("chainChanged", callback);
  }
};

// Remove event listeners
export const removeWalletListeners = () => {
  if (typeof window.ethereum !== "undefined") {
    window.ethereum.removeAllListeners("accountsChanged");
    window.ethereum.removeAllListeners("chainChanged");
  }
};