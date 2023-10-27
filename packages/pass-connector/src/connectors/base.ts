  import {Chain, Connector, ConnectorData, ConnectorNotFoundError, getConfig} from "@wagmi/core";
  import {getAddress, Transport} from "viem";
  import {Passport} from "@0xpass/passport";
  import {createPassportClient, createPassTransport} from "@0xpass/passport-viem";
  import {Address} from "wagmi";


  export const supportedProviders = [
    // "apple",
    // "bitbucket",
    // "discord",
    // "facebook",
    // "github",
    // "gitlab",
    "google",
    // "linkedin",
    // "microsoft",
    // "twitch",
    // "twitter",
  ] as const;

  const IS_SERVER = typeof window === "undefined";
  export type PassProvider = Transport

  export interface PassOptions {
    clientId: string;
    scope: string;
    provider: PassProvider;
    verifier: typeof supportedProviders[number];
    loginFn: () => Promise<any>;
    storage: any
  }

  export class PassConnector extends Connector<PassProvider,PassOptions> {
    ready = !IS_SERVER;
    readonly id = "pass";
    readonly name = "Pass";
    shimDisconnect = false;
    protected shimDisconnectKey = `${this.id}.shimDisconnect`;
    protected passport = new Passport()
    protected sessionSig: undefined | string;
    protected provider: undefined | any;

    constructor(config: { chains?: Chain[]; options: PassOptions }) {
      super(config);
    }


    async getProvider(config?: { chainId?: number }): Promise<any> {
      if (this.provider) return this.provider;

      if (!(this.sessionSig)) throw new Error("User not logged in");

      const chain = this.getInitialChain(config);
      const transport = createPassTransport(this.sessionSig, chain, this.options.provider);
      this.provider = transport({chain});
      return this.provider
    }

    getInitialChain(config?: { chainId?: number }): Chain {
      const chain = config?.chainId ? this.chains.find(chain => chain.id === config.chainId) : undefined;
      return chain || this.chains[0]
    }

    async getPassport(config?: { chainId?: number }): Promise<any> {
      const passClient = createPassportClient(
          this.sessionSig,this.options.provider,this.getInitialChain(config),await this.getAccount()
      )
      return passClient
    }

    async isAuthorized(): Promise<boolean> {
      return this.sessionSig !== undefined;
    }

    async getChainId() {
      const publicClient = await this.getPassport()
      if (!publicClient) throw new ConnectorNotFoundError()
      console.log("public client is ")
      console.log(publicClient)
      return publicClient.getChainId();
    }

    async connect(): Promise<Required<ConnectorData>> {
      this.emit("message", { type: "connecting" });


      this.sessionSig = this.options.storage?.getItem("session") || undefined;
      console.log(this.sessionSig)

      if (! await this.isAuthorized()) {
        const ouathToken = await this.options.loginFn()
        const session = await this.passport.getSession({
          scope_id: this.options.scope,
          verifier_type: this.options.verifier,
          code: ouathToken,
        });
        this.sessionSig = JSON.stringify(session.result);
        this.options.storage?.setItem("session", this.sessionSig)
        // getConfig().storage?.setItem("session",this.sessionSig);
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
        method: "eth_requestAccounts",
      });
      return getAddress(accounts[0] as string);
    }

    async getWalletClient({ chainId }: { chainId?: number } = {}): Promise<any> {
      if(!this.sessionSig) {
        throw new Error("Session not found");
      }
      const chain = this.chains.find((x) => x.id === chainId) || await this.getChainId();
      return this.getPassport({chainId})
    }


    async disconnect(): Promise<void> {
      try {
        this.provider = undefined;
        this.options.storage?.removeItem("session")
        // getConfig().storage?.removeItem("session")
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

    protected onAccountsChanged(accounts: Address[]): void {
    }

    protected onChainChanged(chain: number | string): void {
    }

    protected onDisconnect(error: Error): void {
    }

  }
