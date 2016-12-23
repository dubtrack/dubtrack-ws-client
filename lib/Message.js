'use strict'

const _ = require('lodash')

/**
 * Base Messages for socket app
 * @type {Message}
 */
const Message = {

  /**
   * Message action
   * @type {Object}
   */
  ACTION: {
    'HEARTBEAT': 0,
    'ACK': 1,
    'NACK': 2,
    'CONNECT': 3,
    'CONNECTED': 4,
    'DISCONNECT': 5,
    'DISCONNECTED': 6,
    'CLOSE': 7,
    'CLOSED': 8,
    'ERROR': 9,
    'ATTACH': 10,
    'ATTACHED': 11,
    'DETACH': 12,
    'DETACHED': 13,
    'PRESENCE': 14,
    'MESSAGE': 15,
    'SYNC': 16,
    'TOKEN': 17
  },

  /**
   * Different presence types
   * @type {Object}
   */
  PRESENCE: {
    ENTER: 0,
    LEAVE: 1,
    UPDATE: 2
  },

  /**
   * Type of mesage that will be sent to channel
   * @type {Object}
   */
  MSG_TYPE: {
    STRING: 'string',
    JSON: 'json'
  },

  /**
   * Send error message
   * @param {Error|String} err
   * @param {?Object} [data]
   */
  error (err, data) {
    if (_.isObject(err) && err.message)
      err = err.message

    return _.merge({
      action: this.ACTIONS.ERROR,
      error: err || 'Something really wrong'
    }, data || {})
  },

  /**
   * Send connected data
   * @param {Object} data any additional data you want to send
   * @return {Object}
   */
  connected (data) {
    if (!_.isPlainObject(data))
      data = {}

    return _.merge(data, {action: this.ACTION.CONNECTED})
  },

  /**
   * Create get channel message
   * @throws {Error}
   * @param {String} channel
   * @return {Object}
   */
  attachChannel (channel) {
    if (!channel)
      throw new Error('No channel passed')

    return {
      action: this.ACTION.ATTACH,
      channel: channel
    }
  },

  /**
   * User leaves channel
   * @throws {Error}
   * @param {String} channel
   * @return {Object}
   */
  leaveChannel (channel) {
    if (!channel)
      throw new Error('No channel passed')
    return {
      action: this.ACTION.DETACH,
      channel: channel
    }
  },

  /**
   * Create attached to channel message
   * @throws {Error}
   * @param {BaseClient} client
   * @param {String} channel
   * @return {Object}
   */
  attached (client, channel) {
    if (!client || !channel)
      throw new Error('No client or channel passed')

    return {
      action: this.ACTION.ATTACHED,
      clientId: client.clientId,
      connectionId: client.socketId,
      channel: channel
    }
  },

  /**
   * User left channel message
   * @throws {Error}
   * @param {BaseClient} client
   * @param {String} channel
   * @return {Object}
   */
  detached (client, channel) {
    if (!client || !channel)
      throw new Error('No client or channel passed')

    return {
      action: this.ACTION.DETACHED,
      channel: channel,
      clientId: client.clientId,
      connectionId: client.socketId
    }
  },

  /**
   * Simple pong message
   * @return {Object}
   */
  pong () {
    return {
      action: this.ACTION.HEARTBEAT
    }
  },

  /**
   * Presence message
   * @see {@link Message.PRESENCE}
   * @throws {Error}
   * @param {BaseClient} client
   * @param {String} channel
   * @param {?Number} [action] enter by default
   * @return {Object}
   */
  presence (client, channel, action) {
    if (!client || !channel)
      throw new Error('No client or channel passed')

    action = action || this.PRESENCE.ENTER
    return {
      action: this.ACTION.PRESENCE,
      channel: channel,
      presence: {
        action: action,
        clientId: client.clientId,
        connectionId: client.socketId,
        data: {}
      }
    }
  },

  /**
   * Send message to channel
   * @see {Message.MSG_TYPE}
   * @throws {Error}
   * @param {String} channel
   * @param {Object|String} message
   * @param {String} event
   * @return {*}
   */
  channelMessage (channel, message, event) {
    if (!channel || !message)
      throw new Error('No channel or message passed')

    let type = this.MSG_TYPE.STRING
    if (_.isObject(message) || _.isArray(message)) {
      message = JSON.stringify(message)
      type = this.MSG_TYPE.JSON
    }

    return {
      action: this.ACTION.MESSAGE,
      channel: channel,
      message: {
        name: event || '*',
        type: type,
        data: message // Need to encode ?
      }
    }
  },

  /**
   * Create token request
   * @param {?String} reqId
   * @param {?String} clientId
   * @return {Object}
   */
  tokenRequest (reqId, clientId) {
    return {
      action: this.ACTION.TOKEN,
      clientId: clientId || '',
      reqId: reqId || ''
    }
  },

  /**
   * Create token request
   * @param {String} token
   * @param {?String} reqId
   * @param {?String} clientId
   * @return {Object}
   */
  token (token, reqId, clientId) {
    return {
      action: this.ACTION.TOKEN,
      token: token,
      clientId: clientId || '',
      reqId: reqId || ''
    }
  }
}

module.exports = Message
