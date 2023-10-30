import {Chain, Connector} from "@wagmi/core";
import {checksumAddress, getAddress, http} from "viem";
import {Passport} from "@0xpass/passport";
import {createPassportClient} from "@0xpass/passport-viem";
import {Address} from "wagmi";
import {computeAddress} from "ethers";
import {normalizeChainId} from "@0xpass/wagmi-commons";


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

export interface PassOptions {
    clientId: string;
    scope: string;
    verifier: typeof supportedProviders[number];
    loginFn: () => Promise<any>;
}

export abstract class AbstractPassConnector extends Connector<any,PassOptions> {
    ready = !IS_SERVER;
    readonly id = "pass";
    readonly name = "Pass";
    protected passport = new Passport()
    protected sessionSig: undefined | string;
    protected provider: undefined | any;
    protected address: undefined | `0x${string}`;
    protected chain: Chain

    protected constructor(config: { chains?: Chain[]; options: PassOptions }) {
        super(config);
        this.chain = this.chains[0]
    }

    setAddress(sessionSig: string | Object): void {
        if(!this.address) {
            const session = typeof sessionSig === "string" ? JSON.parse(sessionSig) : sessionSig
            const compressed_key = session?.message?.public_key
            this.address = checksumAddress(computeAddress("0x"+compressed_key) as any)
        }
    }

    getActiveChain(config?: { chainId?: number }): Chain {
        if(config?.chainId) {
            if(config?.chainId !== this.chain?.id) {
                const chain = this.chains.find(chain => chain.id === config.chainId)
                if(!chain) throw Error("Invalid Chain")
                this.chain = chain
            }
        }
        return this.chain
    }


    async getPassport(config?: { chainId?: number }): Promise<any> {
        const activeChain = this.getActiveChain(config)
        return createPassportClient(
            this.sessionSig, http(activeChain.rpcUrls.default.http[0]), activeChain, await this.getAccount()
        )
    }

    async isAuthorized(): Promise<boolean> {
        console.log("i am here authorized")
        if(this.sessionSig === undefined) {
            if(this.ready) {
                this.sessionSig = window?.localStorage.getItem("wagmi.session") || undefined
            }
        }
        return this.sessionSig !== undefined;
    }


    protected onAccountsChanged(accounts: Address[]): void {
        if (accounts.length === 0) this.emit('disconnect')
        else this.emit('change', { account: getAddress(accounts[0]!) })
    }

    protected onChainChanged(chain: number | string): void {
        const id = normalizeChainId(chain)
        const unsupported = this.isChainUnsupported(id)
        this.emit('change', { chain: { id, unsupported } })
    }

    protected onDisconnect(error: Error): void {
        this.emit('disconnect')
    }

    protected onConnect = () => {
        this.emit('connect', {})
    }
}
