import { XhrNetworkClient } from './browser'
import { WeixinNetworkClient } from './miniprogram'

function createNetwork() {
  if (wx != null) {
    return new WeixinNetworkClient()
  }
  return new XhrNetworkClient()
}

export const network = createNetwork()
