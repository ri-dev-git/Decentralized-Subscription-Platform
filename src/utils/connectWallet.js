import { ethers } from "ethers";

export const connectWallet = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      return signer;
    } catch (err) {
      console.error("Error connecting to wallet:", err);
    }
  } else {
    alert("MetaMask is not installed. Please install it to continue.");
  }
};
