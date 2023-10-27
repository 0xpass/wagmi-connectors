"use client";
import {CodeResponse, TokenResponse, useGoogleLogin} from "@react-oauth/google";
import axios from "axios";
import {mainnet} from "viem/chains";
import {createPublicClient, http} from "viem";
import {configureChains, createConfig, WagmiConfig} from "wagmi";
import {publicProvider} from "wagmi/providers/public";
import {PassConnector} from "@0xpass/pass-connector";
import {PassOptions} from "@0xpass/pass-connector/dist/connectors/base";
import {useRef, useState} from "react";
import Wagmi from "@/src/app/components/wagmi";

export default function Home() {
  const alchemyUrl = "https://eth-mainnet.g.alchemy.com/v2/nao4_KIpBs-R4MV2KNK-XXIypdyvi9T4"
  const fallbackProvider = http(alchemyUrl)
  const { chains, publicClient } = configureChains(
      [
        mainnet,
      ],
      [ publicProvider()])

  async function getAccessTokenFromCode(code: any): Promise<String> {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const data = {
      code: code,
      client_id:
          "878158413281-7crfata4i7j1qvn3hesqa7qeqa48eavd.apps.googleusercontent.com",
      client_secret: "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",
      redirect_uri: process.env.NEXT_PUBLIC_URL,
      grant_type: "authorization_code",
    };

    try {
      const response = await axios.post(tokenUrl, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Extract the access token (and optionally the refresh token)
      return response.data.access_token;
    } catch (error) {
      console.error("Error fetching access token");
      throw error;
    }
  }
    const result = useRef<String|null>(null)
    const error = useRef<any>(null)

    const googleLogin = useGoogleLogin({
      flow: "auth-code",
      onSuccess: async (response) => {
          const code = await getAccessTokenFromCode(response.code)
          result.current = code
          return code

      },
      onError: (errorResponse) => {
          error.current = errorResponse;
          console.log(errorResponse)
      },
    })

    const asyncLoginFn = async (): Promise<String> => {


        googleLogin(); // This triggers the login flow

        return new Promise((resolve, reject) => {
            // Poll until a result or error is available or a timeout occurs
            const intervalId = setInterval(() => {
                if (result.current) {
                    resolve(result.current);
                    clearInterval(intervalId);
                } else if (error.current) {
                    reject(error.current);
                    clearInterval(intervalId);
                }
            }, 100); // Check every 100ms

            // Fail-safe timeout
            setTimeout(() => {
                clearInterval(intervalId);
                if (!result && !error) {
                    reject(new Error("Login operation timeout"));
                }
            }, 10000); // 10 seconds
        });
    };


  const wagmiProps: PassOptions = {
    clientId: "0x",
    scope: "1",
    provider: http(),
    verifier: "google",
    loginFn: asyncLoginFn,
    get storage() {
       return typeof window !== 'undefined' ? window.localStorage : undefined;
    }
  }

  const config = createConfig({
    autoConnect: true,
    publicClient: createPublicClient({
      chain: mainnet,
      transport: http()
    }),
  })


  // async function signMessage() {
  //    const client: WalletClient = createPassportClient(signature,fallbackProvider,mainnet)
  //
  //   client.signMessage({
  //     account: "0x00",
  //     message: 'hello world',
  //   }).then(res => alert(JSON.stringify(res))).catch(err => alert(JSON.stringify(err)))
  //
  // }

  // async function fetchAddress() {
  //   const client: WalletClient = createPassportClient(signature,fallbackProvider,mainnet)
  //
  //   client.requestAddresses().then(res => alert(JSON.stringify(res))).catch(err => alert(JSON.stringify(err)))
  //
  // }

  // async function signTrx() {
  //   const client: WalletClient = createPassportClient(signature,fallbackProvider,mainnet)
  //
  //   const transaction = await client.prepareTransactionRequest({
  //     account: "0x4A67aED1aeE7c26b7063987E7dD226f5f5207ED2",
  //     to: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  //     value: BigInt(1000000000000000),
  //     chain: mainnet
  //   })
  //
  //   client.signTransaction(transaction).then(res => alert(JSON.stringify(res))).catch(err => alert(JSON.stringify(err)))
  //
  // }

    const connector = new PassConnector({chains,options:wagmiProps});

  return (
      <WagmiConfig config={config}>
        <main className="flex space-y-5 flex-col items-center justify-between p-24">
            {/*<button onClick={() => connector.connect()}>Click me</button>*/}
            <Wagmi connector={connector} />
          {/*<button*/}
          {/*  onClick={googleLogin}*/}
          {/*  className="p-2 border border-1 border-black rounded"*/}
          {/*>*/}
          {/*  Login with Google ✨*/}
          {/*</button>*/}

          {/*<div className="space-x-2">*/}
          {/*  */}
          {/*  <br/>*/}
          {/*  <br/>*/}
          {/*  <button onClick={ () => {*/}
          {/*    signMessage()*/}
          {/*  }}>Click Me to Sign Message</button>*/}
          {/*  <br/>*/}
          {/*  <br/>*/}
          {/*  <button onClick={ () => {*/}
          {/*    fetchAddress()*/}
          {/*  }}>Click Me to Get Address</button>*/}
          {/*  <br/>*/}
          {/*  <br/>*/}
          {/*  <button onClick={ () => {*/}
          {/*    signTrx()*/}
          {/*  }}>Click Me to Sign Transaction</button>*/}
          {/*</div>*/}
        </main>
      </WagmiConfig>
  );

}
