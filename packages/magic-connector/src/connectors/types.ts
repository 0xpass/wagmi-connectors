import { Chain } from "@wagmi/core";

export interface MagicWalletConnectorOptions {
  apiKey: string;
  chains: Chain[];
  shimDisconnect?: boolean;
}
