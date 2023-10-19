import {Wallet} from "../types";
import {MagicWalletConnectorOptions} from "../connectors/types";
import {MagicAuthConnector} from "../connectors/auth";

export const phoneMagicWallet = ({
  chains,
  apiKey,
  shimDisconnect = true,
}: MagicWalletConnectorOptions): Wallet => {
  return {
    id: "phone_magic",
    name: "Phone",
    format: "phone",
    iconBackground: "#fff",
    iconUrl:
      "https://cdn3.iconfinder.com/data/icons/picons-social/57/16-apple-512.png",
    createConnector: () => {
      const connector = new MagicAuthConnector({
        chains: chains,
        options: {
          apiKey: apiKey,
          magicSdkConfiguration: {
            network: {
              chainId: chains[0]?.id,
              rpcUrl: chains[0].rpcUrls.default.http[0],
            },
          },
          shimDisconnect,
        },
      });
      return {
        connector,
      };
    },
  };
};
