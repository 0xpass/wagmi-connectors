import {PassConnector, PassOptions, PassProvider, supportedProviders} from "../connectors/base";
import {Chain} from "@wagmi/core";
import {ConnectorOptions, logos, Wallet} from "@0xpass/wagmi-commons";



export interface SocialPassportWalletOptions extends ConnectorOptions, PassOptions {
  chains: Chain[],
}


export const socialPassWallet = (options: SocialPassportWalletOptions): Wallet => {
  return {
    id: `${options.verifier}_passport`,
    name: options.verifier.charAt(0).toUpperCase() + options.verifier.slice(1),
    format: "button",
    iconBackground: "#fff",
    iconUrl: logos[options.verifier],
    createConnector: () => {
      const connector = new PassConnector({
        chains: options.chains,
        options: {
          clientId: options.clientId,
          scope: options.scope,
          provider: options.provider,
          verifier: options.verifier,
          loginFn: options.loginFn
        },
      });
      return {
        connector,
      };
    },
  };
};
