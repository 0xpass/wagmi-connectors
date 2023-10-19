import {Chain, Connector, ConnectorData, ConnectorNotFoundError, getConfig} from "@wagmi/core";
import {getAddress, Transport} from "viem";
import {normalizeChainId} from "../utils/normalize-chain-id";
import {Passport} from "@0xpass/passport";
import {createPassportClient, createPassTransport} from "@0xpass/passport-viem";


const IS_SERVER = typeof window === "undefined";
export type PassProvider = Transport


export interface PassOptions {
  clientId: string;
  scope: string;
  provider: PassProvider;
  verifier: string
  loginFn: any;
}


export abstract class PassConnector extends Connector<PassProvider,PassOptions> {
  ready = !IS_SERVER;
  readonly id = "pass";
  readonly name = "Pass";
  shimDisconnect = false;
  protected shimDisconnectKey = `${this.id}.shimDisconnect`;
  protected passport = new Passport()
  protected sessionSig: undefined | string;
  protected provider: undefined | any;
  protected constructor(config: { chains?: Chain[]; options: PassOptions }) {
    super(config);
  }

  async getProvider(config?: { chainId?: number }): Promise<any> {
    if(this.provider) {
      return this.provider
    }
    if (!this.sessionSig) {
      throw new Error("User not logged in")
    }
    const chain = (config?.chainId) ? (this.chains.find(chain => chain.id == config?.chainId)): undefined
    this.provider = createPassTransport(this.sessionSig,chain || this.chains[0] ,this.options.provider)
    return this.provider
  }

  async isAuthorized() {
    return this.sessionSig !== undefined;
  }

  async getChainId() {
    const provider = await this.getProvider()
    if (!provider) throw new ConnectorNotFoundError()
    return provider.request({ method: 'eth_chainId' }).then(normalizeChainId)
  }

  async connect(): Promise<Required<ConnectorData>> {
    this.emit("message", { type: "connecting" });


    if (await this.isAuthorized()) {
      const ouathToken = await this.options.loginFn();

      const session = await this.passport.getSession({
        scope_id: this.options.scope,
        verifier_type: this.options.verifier,
        code: ouathToken.toString(),
      });

      this.sessionSig = session.result.session_signature
      getConfig().storage?.setItem("session",this.sessionSig)
    } else {
      this.sessionSig = getConfig().storage?.getItem("session") || "";
    }
    // if (provider?.on) {
    //   provider.on("accountsChanged", this.onAccountsChanged);
    //   provider.on("chainChanged", this.onChainChanged);
    //   provider.on("disconnect", this.onDisconnect);
    // }

    return {
      chain: {
        id: await this.getChainId(),
        unsupported: false,
      },
      account: await this.getAccount(),
    };
  }


  async getAccount() {
    const provider = await this.getProvider();
    const accounts = await provider?.request({
      method: "eth_accounts",
    });
    return getAddress(accounts[0] as string);
  }

  async getWalletClient({ chainId }: { chainId?: number } = {}): Promise<any> {
    if(!this.sessionSig) {
      throw new Error("Session not found");
    }
    const provider = await this.getProvider();
    const chain = this.chains.find((x) => x.id === chainId) || await this.getChainId();
    createPassportClient(this.sessionSig,provider,chain)
  }


  async disconnect(): Promise<void> {
    try {
      this.provider = undefined;
      getConfig().storage?.removeItem("session")
      this.sessionSig = undefined;
      this.emit("disconnect");

    } catch (error) {
      console.error("Error disconnecting from Passport SDK:", error);
    }
  }

  async switchChain(chainId: number) {
    try {
      const chainToBeSet = this.chains.find((chain) => chainId === chain.id);
      if (!chainToBeSet) {
        throw Error(`Unsupported Chain: ${chainId}`);
      }
      this.provider = undefined;
      await this.getProvider({chainId})
      return chainToBeSet
    } catch (e: any) {
      console.error(e);
      throw Error(`Chain switching failed: , ${e.message}`);
    }
  }

}
