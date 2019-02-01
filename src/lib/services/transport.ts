
import { Action } from './actions'
import { InternalMetric } from './metrics'
import { IPCTransport } from '../transports/IPCTransport'
import  EventEmitter from 'events'

export class TransportConfig {
  /**
   * The name of the server as reported in PM2 Enterprise
   *
   * default is os.hostname()
   */
  serverName?: string
  /**
   * Broadcast all the logs from your application to our backend
   */
  sendLogs?: Boolean
  /**
   * Since logs can be forwared to our backend you may want to ignore specific
   * logs (containing sensitive data for example)
   */
  logFilter?: string | RegExp
  /**
   * Proxy URI to use when reaching internet
   * Supporting socks5,http,https,pac,socks4
   * see https://github.com/TooTallNate/node-proxy-agent
   *
   * example: socks5://username:password@some-socks-proxy.com:9050
   */
  proxy?: string
}

export interface Transport extends EventEmitter {
  /**
   * Init the transporter (connection, listeners etc)
   */
  init: (config: TransportConfig) => Transport
  /**
   * Destroy the instance (disconnect, cleaning listeners etc)
   */
  destroy: () => void
  /**
   * Send data to remote endpoint
   */
  send: (channel: string, payload: Object) => void
  /**
   * Declare available actions
   */
  addAction: (action: Action) => void
  /**
   * Declare metrics
   */
  setMetrics: (metrics: InternalMetric[]) => void
  /**
   * Declare options for process
   */
  setOptions: (options: any) => void
}

/**
 * Init a transporter implementation with a specific config
 */
export function createTransport (name: string, config: TransportConfig): Transport {
  switch (name) {
    case 'ipc': {
      const transport = new IPCTransport()
      transport.init(config)
      return transport
    }
  }
  console.error(`Failed to find transport implementation: ${name}`)
  return process.exit(1)
}
