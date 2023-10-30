  import {Chain, ConnectorData, getConfig} from "@wagmi/core";
  import {getAddress, http} from "viem";
  import {createPassTransport} from "@0xpass/passport-viem";
  import {AbstractPassConnector, PassOptions} from "./abstract";



  export class PassConnector extends AbstractPassConnector {

    constructor(config: { chains?: Chain[]; options: PassOptions }) {
      super(config);
    }

    async getProvider(config?: { chainId?: number }): Promise<any> {
      if (this.provider) return this.provider;

      if (!(this.sessionSig)) throw new Error("User not logged in");

      const chain = this.getActiveChain(config);
      const transport = createPassTransport(this.sessionSig, chain, http(chain.rpcUrls.default.http[0]));
      this.provider = transport({chain});
      return this.provider
    }

    async getChainId() {
      return this.chain.id
    }

    async connect(config?: { chainId?: number }): Promise<Required<ConnectorData>> {
      this.emit("message", { type: "connecting" });

      console.log("I am here")
      if (! await this.isAuthorized()) {
        const ouathToken = await this.options.loginFn()
        const session = await this.passport.getSession({
          scope_id: this.options.scope,
          verifier_type: this.options.verifier,
          code: ouathToken,
        });
        this.sessionSig = JSON.stringify(session.result);
        if(this.ready) {
          window?.localStorage?.setItem("wagmi.session",this.sessionSig)
        }
      }

      if(this.sessionSig) {
        this.setAddress(this.sessionSig)
      }


      const chain = this.getActiveChain(config)

      // if (provider?.on) {
      //   provider.on("accountsChanged", this.onAccountsChanged);
      //   provider.on("chainChanged", this.onChainChanged);
      //   provider.on("disconnect", this.onDisconnect);
      // }

      return {
        chain: {
          id: chain.id,
          unsupported: false,
        },
        account: await this.getAccount(),
      };
    }


    async getAccount(): Promise<`0x${string}`> {
      if(this.address) return this.address
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
      return this.getPassport({chainId})
    }


    async disconnect(): Promise<void> {
      try {
        this.provider = undefined;
        if(this.ready) {
          window?.localStorage?.removeItem("wagmi.session")
        }
        this.sessionSig = undefined;
        this.address = undefined;
        this.onDisconnect(Error("none"))

      } catch (error) {
        console.error("Error disconnecting from Passport SDK:", error);
      }
    }

    async switchChain(chainId: number) {
      this.provider = undefined
      await this.getProvider({chainId})
      this.onChainChanged(chainId)
      return this.chain;
    }

  }
