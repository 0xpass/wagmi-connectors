"use client";
import {goerli, mainnet, polygonMumbai} from "viem/chains";
import {createPublicClient, http} from "viem";
import {configureChains, createConfig, WagmiConfig} from "wagmi";
import {publicProvider} from "wagmi/providers/public";
import {PassConnector} from "@0xpass/pass-connector";
import {PassOptions} from "@0xpass/pass-connector";
import Wagmi from "@/src/app/components/wagmi";
import {useGoogleAuth} from "@0xpass/oauth";

export default function Home() {
  const { chains, publicClient } = configureChains(
      [
        mainnet, goerli, polygonMumbai
      ],
      [ publicProvider()])

  const { asyncLoginFn } = useGoogleAuth(process.env["NEXT_PUBLIC_URL"] || "http://localhost:3000");
  const wagmiProps: PassOptions = {
    clientId: "0x",
    scope: "1",
    verifier: "google",
    loginFn: asyncLoginFn
  }

  const config = createConfig({
    autoConnect: true,
    publicClient
  })


    const connector = new PassConnector({chains,options:wagmiProps});

  return (
      <WagmiConfig config={config}>
        <main className="flex space-y-5 flex-col items-center justify-between p-24">
            <Wagmi connector={connector} />
        </main>
      </WagmiConfig>
  );

}
