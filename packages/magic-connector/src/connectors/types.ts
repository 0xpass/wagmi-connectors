import { Chain } from "@wagmi/core";
import {ConnectorOptions} from "@0xpass/wagmi-commons";

export interface MagicWalletConnectorOptions extends ConnectorOptions{
  chains: Chain[];
}
