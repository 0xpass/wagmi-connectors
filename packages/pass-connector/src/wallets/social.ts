import {PassConnector} from "../connectors/base";
import {Chain} from "@wagmi/core";
import {ConnectorOptions, logos, Wallet} from "@0xpass/wagmi-commons";
import {PassOptions} from "../connectors/abstract";



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
