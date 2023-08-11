import {MagicAuthConnector} from "../connectors/auth";
import {Wallet} from "../types";
import {MagicWalletConnectorOptions} from "../connectors/types";

export const emailMagicWallet = ({
  chains,
  apiKey,
  shimDisconnect = true,
}: MagicWalletConnectorOptions): Wallet => {
  return {
    id: "email_magic",
    name: "Email",
    format: "email",
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
