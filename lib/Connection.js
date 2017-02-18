'use strict'

const EventEmitter = require('events')
const eio = require('engine.io-client')
const _ = require('lodash')
const MessageMaster = require('./MessageMaster')
const Message = require('./Message')
const request = require('superagent')

/**
 * Base SocketClient Connection
 * @type {Connection}
 */
module.exports = class Connection extends EventEmitter {

  /**
   *
   * @param {SocketClient}
   */
  constructor (client, options) {
    super()
    this.client = client
    this.states = {
      initialized: 'initialized',
      connecting: 'connecting',
      connected: 'connected',
      disconnected: 'disconnected',
      closing: 'closing',
      closed: 'closed',
      failed: 'failed'
    }
    this.secure = options.secure || false
    this.state = this.states.initialized
    // client id
    this.clientId = options.clientId || ''
    this.connectionId = null
    // Store auth info
    this.secret = options.secret || null
    this.token = options.token || null
    // Default options for websocket connection
    this.defaultOpts = {
      path: '/ws',
      transports: ['websocket', 'polling']
      // transports: ['websocket']
    }
    if (!options.secret && !options.token && !options.authCallback)
      throw new Error('No auth keys passed')

    this.host = options.host || 'localhost:8081'
    if (this.host.indexOf('wss://') == 0) {
      this.secure = true
      this.host = this.host.replace('wss://', '')
    }

    const prefix = this.secure ? 'wss://' : 'ws://'
    this.url = prefix + this.host + '?connect=1'

    if (_.isFunction(options.authCallback)) {
      options.noAutoConnect = true
      options.authCallback({}, (err, tokenOrData) => {
        if (err)
          return this.fail(err)

        if (_.isString(tokenOrData)) {
          // It's token
          this.token = tokenOrData
        }
        if (_.isObject(tokenOrData) && tokenOrData.token) {
          this.token = tokenOrData.token
        }

        if (!this.token)
          return this.fail('No token received')

        this.connect()
      })
    }

    this.options = _.merge(this.defaultOpts, options)
    this.socket = null

    // Reconnect section
    this.reconnectTimeout = null
    if (!_.isNumber(this.options.retriesAmount))
      this.options.retriesAmount = 7

    if (!_.isBoolean(this.options.autoReconnect))
      this.options.autoReconnect = true
    // no reconnections
    this.currentRetries = 0

    if (!this.options.noAutoConnect)
      this.connect()
  }

  /**
   * Build a full URL for connection
   * @return {String}
   */
  _buildUrl () {
    let url = this.url
    if (this.secret)
      url += '&secret=' + this.secret

    if (this.token)
      url += '&access_token=' + this.token

    if (this.clientId)
      url += '&clientId=' + this.clientId

    return url
  }

  /**
   * Check if client has set auth params
   * @return {Boolean}
   */
  hasAuth () {
    return Boolean(this.token || this.secret)
  }

  /**
   * Mark connection as failed
   * @param {Error|Object|String} err
   */
  fail (err) {
    this.state = this.states.failed
    this.emit(this.state, err || 'Something wrong')
  }

  /**
   * Check is connected
   */
  isConnected () {
    return this.state === this.states.connected
  }

  /**
   * Close connection
   */
  close () {
    this.state = this.states.closing
    this.emit(this.states.closing)
    this.socket.close()
    // TODO: needed ?
    this.removeAllListeners()
  }

  onClose (force) {
    if (this.state == this.states.closing) {
      this.state = this.states.closed
      this.emit(this.states.closed)
    }
    else {
      this.state = this.states.disconnected
      this.emit(this.states.disconnected)
      // Need to reconnect only on disconnect
      this._setupReconnect()
    }
  }

  _reconnect () {
    if (!this.options.autoReconnect)
      return

    if (this.currentRetries >= this.options.retriesAmount)
      return

    if (this.isConnected()) {
      this.currentRetries = 0
      return
    }

    if (this.state !== this.states.connecting && this.state !== this.states.connected) {
      this.currentRetries++ // increase amount of retries
      this.connect()
    }
  }

  /**
   * Will set up reconnect timeout
   */
  _setupReconnect () {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.currentRetries >= this.options.retriesAmount)
      return

    this.reconnectTimeout = setTimeout(this._reconnect.bind(this), 1000)
  }

  /**
   * Remove all socket listeners
   */
  clearSocketListeners () {
    if (!this.socket)
      return

    this.socket.removeAllListeners('open')
    this.socket.removeAllListeners('close')
    this.socket.removeAllListeners('error')
    this.socket.removeAllListeners('message')
  }

  /**
   * Open ws handler
   */
  onOpen () {
    if (!this.socket)
      return

    this.clearSocketListeners()
    this.socket.on('close', this.onClose.bind(this))
    this.socket.on('error', this.onError.bind(this))
    this.socket.on('message', this.onMessage.bind(this))
  }

  /**
   * Error handler
   * @param {Error|String} err
   */
  onError (err) {
    if (this.state == this.states.connecting) {
      this.state = this.states.failed
      this.emit(this.state)
    }
    else {
      this.emit('error', err)
    }
  }

  /**
   * Will handle all messages
   * @param {String} data
   */
  onMessage (data) {
    if (_.isString(data))
      data = MessageMaster.parse(data)

    if (!data.action)
      return

    switch (data.action) {

      case Message.ACTION.CONNECTED:
        // Update clientId
        if (data.clientId)
          this.clientId = data.clientId

        if (data.connectionId || data.socketId)
          this.connectionId = data.connectionId || data.socketId

        this.currentRetries = 0
        this.state = this.states.connected
        this.emit(this.states.connected)
        break

      default:
        this.emit('message', data)
    }
  }

  /**
   * Open a new connection to server
   */
  connect () {
    if (this.state == this.states.connected && this.socket.readyState == 'open')
      return

    if (!this.hasAuth())
      return this.fail('No auth parameters')

    this.state = this.states.connecting

    // To prevent duplicate messages
    this.clearSocketListeners()
    if (this.socket)
      this.socket.close()

    const url = this._buildUrl()
    this.socket = eio(url, this.options)
    this.socket.removeAllListeners('open')
    this.socket.removeAllListeners('error')
    this.socket.once('open', this.onOpen.bind(this))
    this.socket.once('error', (err) => {
      if (err && err.type == 'TransportError') {
        this.fail(err)
        this._setupReconnect()
      }
    })
  }

  /**
   * Send message to server
   */
  send (message) {
    if (_.isObject(message))
      message = MessageMaster.stringify(message)

    this.socket.send(message)
  }

  /**
   * Get url to call using REST
   * @param {?String} postfix additional url
   */
  getRestUrl (postfix) {
    if (!this.host)
      return 'http://localhost:8081'

    if (postfix && postfix[0] != '/')
      postfix = '/' + postfix

    const prefix = this.secure ? 'https' : 'http'
    return prefix + '://' + this.host + postfix
  }

  /**
   * Make an http request
   * @param {String} url
   * @param {Function} cb
   */
  request (url, cb) {
    cb = cb || _.noop
    if (!url)
      return cb(new Error('No url given'))

    const call = request.get(this.getRestUrl(url))
    if (this.secret)
      call.set('X-Sectet', this.secret)

    if (this.token)
      call.set('X-Access-Token', this.token)

    call
      .end(function (error, response) {
        if (error || response.statusCode != 200)
          return cb(error || response.body)

        cb(null, response.body)
      })

  }

}
