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
import { UserRejectedRequestError } from "viem";
import { MagicConnector, MagicOptions } from "./base";

export type MagicAuthConnectOptions = {
  chainId?: number;
  email?: string;
  phoneNumber?: string;
};

interface MagicAuthOptions extends MagicOptions {
  oauthOptions?: {
    provider: OAuthProvider;
    callbackUrl?: string;
  };
  magicSdkConfiguration?: MagicSDKAdditionalConfiguration<
    string,
    OAuthExtension[]
  >;
  shimDisconnect?: boolean;
}

/**
 * Magic Auth Connector class used to connect to wallet using Magic Auth.
 * It uses modal UI defined in our package which also takes in various styling options
 * for custom experience.
 *
 * @example
 * ```typescript
 * import { MagicConnectConnector } from '@everipedia/wagmi-magic-connector';
 * const connector = new MagicConnectConnector({
 *  options: {
 *     apiKey: YOUR_MAGIC_LINK_API_KEY, //required
 *    //...Other options
 *  },
 * });
 * ```
 * @see https://github.com/EveripediaNetwork/wagmi-magic-connector#-usage
 * @see https://magic.link/docs/connect/overview
 */

export class MagicAuthConnector extends MagicConnector {
  magicSDK?: InstanceWithExtensions<SDKBase, OAuthExtension[]>;
  magicSdkConfiguration?: MagicSDKAdditionalConfiguration<
    string,
    MagicSDKExtensionsOption<OAuthExtension["name"]>
  >;
  oauthOptions?: {
    provider: OAuthProvider;
    callbackUrl?: string;
  };
  magicOptions: MagicOptions;
  connectOption?: MagicAuthConnectOptions;
  shimDisconnect: boolean;

  constructor({
    chains = [],
    options,
  }: {
    chains?: Chain[];
    options: MagicAuthOptions;
  }) {
    super({ chains, options });
    this.magicSdkConfiguration = options.magicSdkConfiguration;
    this.magicOptions = options;
    this.oauthOptions = options.oauthOptions;
    this.shimDisconnect = options.shimDisconnect ?? false;
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

  // setEmail(email: string) {

  // }

  /**
   * Connect method attempts to connect to wallet using Magic Connect modal
   * this will open a modal for the user to select their wallet
   */
  async connect(): Promise<Required<ConnectorData>> {
    if (!this.magicOptions.apiKey) {
      throw new Error("Magic API Key is not provided.");
    }
    if (this.shimDisconnect) {
      getConfig().storage?.removeItem(this.shimDisconnectKey);
    }

    const provider = await this.getProvider();

    if (provider?.on) {
      provider.on("accountsChanged", this.onAccountsChanged);
      provider.on("chainChanged", this.onChainChanged);
      provider.on("disconnect", this.onDisconnect);
    }
    this.emit("message", { type: "connecting" });

    // Check if we have a chainId, in case of error just assign 0 for legacy
    let chainId: number;
    try {
      chainId = await this.getChainId();
    } catch {
      chainId = 0;
    }

    // if there is a user logged in, return the user
    if (await this.isAuthorized()) {
      return {
        chain: {
          id: chainId,
          unsupported: false,
        },
        account: await this.getAccount(),
      };
    }

    const magic = this.getMagicSDK();

    // LOGIN WITH MAGIC LINK WITH EMAIL
    if (this.connectOption?.email) {
      await magic.auth.loginWithMagicLink({
        email: this.connectOption.email,
        showUI: true,
      });
    }
    // LOGIN WITH MAGIC LINK WITH PHONE NUMBER
    else if (this.connectOption?.phoneNumber) {
      await magic.auth.loginWithSMS({
        phoneNumber: this.connectOption.phoneNumber,
      });
    } else {
      throw new Error(
        "Invalid options: Either provide and email / phoneNumber when using Magic Auth"
      );
    }

    if (await magic.user.isLoggedIn()) {
      if (this.shimDisconnect) {
        getConfig().storage?.setItem(this.shimDisconnectKey, true);
      }
      return {
        account: await this.getAccount(),
        chain: {
          id: chainId,
          unsupported: false,
        },
      };
    }
    throw new UserRejectedRequestError(Error("User Rejected Request"));
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
      if (
        this.shimDisconnect &&
        !getConfig().storage?.getItem(this.shimDisconnectKey)
      ) {
        return false;
      }

      const magic = this.getMagicSDK();

      const isLoggedIn = await magic.user.isLoggedIn();
      if (isLoggedIn) return true;

      const result = await magic.oauth.getRedirectResult();
      return result !== null;
    } catch (e: any) {
      console.error(e);
      return false
    }
  }
}
