import React, {useState} from 'react';
import {Connector, useAccount, useConnect, useNetwork} from "wagmi";
import {fetchBalance, getNetwork, sendTransaction, signMessage, switchNetwork} from '@wagmi/core'
import {parseEther} from "viem";
import {goerli, polygonMumbai} from "viem/chains";

interface WagmiProps {
    connector: Connector;
}


function Wagmi({ connector }: WagmiProps) {
    const [output, setOutput] = useState("")
    const connect = useConnect({
        connector: connector,
    });
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork()




    async function handleOutput(ops: String) {
        if(ops === "signMessage") {
            const output = await signMessage({
                message: 'gm wagmi frens'
            })
            setOutput(output)
        } else if (ops === "signTransaction") {
            const { hash } = await sendTransaction({
                to: 'moxey.eth',
                value: parseEther('0.01'),
            })
            setOutput(hash)
        } else if (ops === "getBalance") {
            const balance = await fetchBalance({
                address: address!,
            })
            setOutput(`${balance.formatted}`)
        } else if (ops === "switchChain") {
            const network = await switchNetwork({
                chainId: polygonMumbai.id,
            })
            setOutput("Changed to: " + (getNetwork())?.chain?.name)
        }
    }
    return (
        isConnected ? (
            <div className="bg-white p-8 rounded shadow-md">
                <p className="text-xl font-bold mb-4">Welcome Mortal! You will be called by this hash:</p>
                <p className="text-lg text-gray-600 mb-6">{address}</p>
                <br/>
                <p>Connected to {chain?.name}</p>

                <p className="text-xl font-bold mb-4">Choose among these options:</p>
                <button
                    onClick={() => handleOutput("signMessage")}
                    className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
                >
                    Sign Message
                </button>
                <button
                    onClick={() => handleOutput("getBalance")}
                    className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
                >
                    Get My Balance
                </button>
                <button
                    onClick={() => handleOutput("signTransaction")}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Submit Dummy Transaction
                </button>
                <button
                    onClick={() => handleOutput("switchChain")}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    Switch Chain
                </button>

                <div className="mt-6">
                    <p className="text-xl font-bold mb-2">Output</p>
                    <p className="text-lg text-gray-600">{output}</p>
                </div>
            </div>

        ) : (
            <button
                onClick={() => connect.connect()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
                Google Login
            </button>
        )
    );
}

export default Wagmi;
