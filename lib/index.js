'use strict'

const Connection = require('./Connection')
const Channels = require('./Channels')
const Message = require('./Message')
const Auth = require('./Auth')

/**
 * Socket client implementation
 * @type {SocketClient}
 */
class SocketClient {

  constructor (options) {
    /**
     * base connectin
     * @type {Connection}
     */
    this.connection = new Connection(this, options)

    /**
     * Channels API (pretty simple)
     * @type {Object}
     */
    this.channels = new Channels(this)
    /**
     * Add auth helper
     * @type {Auth}
     */
    this.auth = new Auth(this)

    this.bindActions()
  }

  /**
   * Bind default actions for connection
   */
  bindActions () {
    this.connection.on('message', this.onMessage.bind(this))
  }

  /**
   * Handle all messages
   * Note that first handler will be in {@link Connection.onMessage()}
   * And this method will be called only after it's validation
   * So `msg` will be validated, parsed and contain `action` key
   * otherwise `message` event wouldn't be fired from {@link Connection}
   * @param {Object} msg
   */
  onMessage (msg) {
    // handle message
    switch (msg.action) {

      case Message.ACTION.ERROR:
        this.channels.handleError(msg)
        this.auth.onError(msg)
        break

      case Message.ACTION.ATTACHED:
        this.channels.handleChannelAttach(msg)
        break

      case Message.ACTION.DETACHED:
        this.channels.handleChannelDetach(msg)
        break

      case Message.ACTION.PRESENCE:
        this.channels.handlePresence(msg)
        break

      case Message.ACTION.MESSAGE:
        this.channels.handleChannelMessage(msg)
        break

      case Message.ACTION.TOKEN:
        this.auth.onResponse(msg)
        break
    }
  }

  /**
   * Close current connection
   */
  close () {
    this.connection.close()
  }
}

global.SocketClient = SocketClient
module.exports = SocketClient
