import { OAuthExtension, OAuthProvider } from "@magic-ext/oauth";
import type {
  InstanceWithExtensions,
  MagicSDKAdditionalConfiguration,
  MagicSDKExtensionsOption,
  SDKBase,
} from "@magic-sdk/provider";
import type { Chain, ConnectorData } from "@wagmi/core";
import { getConfig } from "@wagmi/core";
import { Magic } from "magic-sdk";
import { MagicConnector, MagicOptions } from "./base";


interface MagicSocialOptions extends MagicOptions {
  oauthOptions?: {
    provider: OAuthProvider;
    callbackUrl?: string;
  };
  magicSdkConfiguration?: MagicSDKAdditionalConfiguration<
    string,
    OAuthExtension[]
  >;
  shimDisconnect?: boolean;
  chain: Chain
}

/**
 * Magic Social Connector class used to connect to social wallets using Magic Auth.
 * It uses modal UI defined in our package which also takes in various styling options
 * for custom experience.
 */

export class MagicSocialConnector extends MagicConnector {
  magicSDK?: InstanceWithExtensions<SDKBase, OAuthExtension[]>;
  connectedChain: Chain;
  magicSdkConfiguration?: MagicSDKAdditionalConfiguration<
    string,
    MagicSDKExtensionsOption<OAuthExtension["name"]>
  >;
  oauthOptions?: {
    provider: OAuthProvider;
    callbackUrl?: string;
  };
  magicOptions: MagicOptions;
  shimDisconnect: boolean;

  protected isConnectingKey = `autoconnect`

  constructor({
    chains = [],
    options,
  }: {
    chains?: Chain[];
    options: MagicSocialOptions;
  }) {
    super({ chains, options });
    this.magicSdkConfiguration = options.magicSdkConfiguration;
    this.magicOptions = options;
    this.oauthOptions = options.oauthOptions;
    this.shimDisconnect = options.shimDisconnect ?? false;
    this.connectedChain = options.chain
  }

  /**
   * Get the Magic Instance
   * @throws {Error} if Magic API Key is not provided
   */
  getMagicSDK(): InstanceWithExtensions<SDKBase, OAuthExtension[]> {
    if (!this.magicSDK) {
      this.magicSDK = new Magic(this.magicOptions.apiKey, {
        ...this.magicSdkConfiguration,
        extensions: [new OAuthExtension()],
      });
    }
    return this.magicSDK;
  }


  /**
   * Connect method attempts to connect to wallet using Magic Connect modal
   * this will open a modal for the user to select their wallet
   */
  async connect(): Promise<Required<ConnectorData>> {
    try {
      getConfig().storage?.setItem(this.isConnectingKey, true);

      if (!this.magicOptions.apiKey) {
        throw new Error("Magic API Key is not provided.");
      }
      this.emit("message", { type: "connecting" });

      const provider = await this.getProvider();
      if (provider?.on) {
        provider.on("accountsChanged", this.onAccountsChanged);
        provider.on("chainChanged", this.onChainChanged);
        provider.on("disconnect", this.onDisconnect);
      }

      const chainId: number = this.connectedChain?.id ?? 0;
      const magic = this.getMagicSDK();
      let account: `0x${string}` | undefined;

      try {
        if(this.isRedirectResult()) {
          const result = await magic.oauth.getRedirectResult()
          if(typeof window !== "undefined") {
            const urlWithoutQuery = window.location.origin + window.location.pathname;
            window.history.replaceState(null, '', urlWithoutQuery);
          }
          account = result?.magic?.userMetadata?.publicAddress as `0x${string}`
        }
        if(!account){
          account = await this.getAccount()
        }
      } catch (e) {
        console.error("User not logged in, Redirecting now...");
        if (this.oauthOptions) {
          await magic.oauth.loginWithRedirect({
            provider: this.oauthOptions.provider,
            redirectURI: this.oauthOptions.callbackUrl || window?.location?.href,
          });
          account = await this.getAccount();
        } else {
          throw new Error(
            "Invalid options: Provide supported social provider when using Magic Auth"
          );
        }
      }
      getConfig().storage?.removeItem(this.isConnectingKey);
      return {
        chain: {
          id: chainId,
          unsupported: false,
        },
        account
      };
    } catch (e) {
      getConfig().storage?.removeItem(this.isConnectingKey);
      throw e;
    }
  }

  async switchChain(chainId: number) {
    try {
      const chainToBeSet = this.chains.find((chain) => chainId === chain.id);
      if (!chainToBeSet) {
        throw Error(`Unsupported Chain: ${chainId}`);
      }
      this.magicSdkConfiguration = {
        network: {
          chainId: chainToBeSet.id,
          rpcUrl: chainToBeSet.rpcUrls.default.http[0],
        },
      };
      this.magicSDK = new Magic(this.magicOptions.apiKey, {
        ...this.magicSdkConfiguration,
        extensions: [new OAuthExtension()],
      });
      this.connectedChain = chainToBeSet
      await this.connect();
      this.onChainChanged(chainToBeSet.id);
      return chainToBeSet;
    } catch (e: any) {
      console.error(e);
      throw Error(`Chain switching failed: , ${e.message}`);
    }
  }

  /**
   * checks if user is authorized with Magic.
   * It also checks for oauth redirect result incase user
   * comes from OAuth flow redirect.
   *  (without this check, user will not be logged in after oauth redirect)
   */
  async isAuthorized() {
    try {
      getConfig().storage?.removeItem(this.isConnectingKey);
      const isRedirect = this.isRedirectResult()
      if(isRedirect) {
        return true;
      } else {
        const magic = this.getMagicSDK();
        const isLoggedIn = await magic.user.isLoggedIn();
        return isLoggedIn
      }
    } catch (e: any) {
      console.error(e);
      return false;
    }
  }

  protected isRedirectResult(): boolean {
    if(typeof window !== "undefined") {
      const redirectParams = ['provider', 'state', 'scope', 'magic_oauth_request_id']
      const urlParams = new URLSearchParams(window.location.search)
      return redirectParams.every(param => urlParams.has(param))
    } else {
      return false
    }
  }
}
