import { MetaMaskInpageProvider } from "@metamask/providers";
import { Eip1193Provider } from "ethers";
declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
