'use strict'

const crypto = require('crypto')
const _ = require('lodash')
const Message = require('./Message')

/**
 * Auth helepr
 * @type {Auth}
 */
module.exports = class Auth {

  constructor(client) {
    this.client = client
    this.cb = {}
  }

  /**
   * Get current clientId
   * @return {String}
   */
  get clientId () {
    return this.client.connection.clientId
  }

  /**
     * Generate random req identifier
     */
  generateReqId() {
    return crypto.randomBytes(16).toString('hex')
  }

  /**
     * Create new Token for client
     * @param {Object} opts
     * @param {Function} cb
     */
  createTokenRequest(opts, cb) {
    cb = cb || _.noop
    if (!this.client || !this.client.connection.isConnected())
      return cb(new Error('No connection'))

    const reqId = this.generateReqId()
    this.cb[reqId] = cb
    this.client.connection.send(Message.tokenRequest(reqId, opts.clientId))
  }

  onResponse(message) {
    if (!message || !message.reqId)
      return

    if (!_.isFunction(this.cb[message.reqId]))
      return

    this.cb[message.reqId](null, message)
    delete this.cb[message.reqId]
  }

  onError(message) {
    if (!message || !message.reqId)
      return

    if (!_.isFunction(this.cb[message.reqId]))
      return

    this.cb[message.reqId](message)
    delete this.cb[message.reqId]
  }
}
