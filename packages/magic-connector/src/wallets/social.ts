import {MagicWalletConnectorOptions} from "../connectors/types";
import {Wallet} from "../types";
import {logos} from "../utils/logos";
import {MagicSocialConnector} from "../connectors/social";


const supportedProviders = [
  "apple",
  "bitbucket",
  "discord",
  "facebook",
  "github",
  "gitlab",
  "google",
  "linkedin",
  "microsoft",
  "twitch",
  "twitter",
] as const;

export interface SocialMagicWalletConnectorOptions
  extends MagicWalletConnectorOptions {
  provider: typeof supportedProviders[number];
}

export const socialMagicWallet = ({
  chains,
  apiKey,
  provider,
  shimDisconnect = false,
}: SocialMagicWalletConnectorOptions): Wallet => {
  return {
    id: `${provider}_magic`,
    name: provider.charAt(0).toUpperCase() + provider.slice(1),
    format: "button",
    iconBackground: "#fff",
    iconUrl: logos[provider],
    createConnector: () => {
      const connector = new MagicSocialConnector({
        chains: chains,
        options: {
          chain: chains[0],
          oauthOptions: {
            provider: provider,
          },
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
