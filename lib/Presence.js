'use strict'

const EventEmitter = require('events')
const _ = require('lodash')
const Message = require('./Message')

/**
 * Presence manager
 * @type {Presence}
 */
module.exports = class Presence extends EventEmitter {

  /**
   * @param {SocketClient} client
   * @param {String} channel
   */
  constructor (client, channel) {
    super()
    this._enterTimeout = null
    this.client = client
    this.channel = channel
    // List of clients in the channel
    this.clientsList = []
    this.loaded = false

    this.events = {
      enter: 'enter',
      leave: 'leave',
      update: 'update'
    }

    /**
     * List of user listeners
     * @type {Object}
     */
    this.listeners = {}
  }

  /**
   * Will remove all listeners from this channel
   */
  clearListeners () {
    _.values(this.events).forEach((event) => {
      this.removeAllListeners(event)
    })
  }

  /**
   * Get list of members in current room
   * @param {?Object} [opts]
   * @param {Function} cb
   */
  get (opts, cb) {
    cb = cb || _.noop
    if (_.isFunction(opts)) {
      cb = opts
      opts = {}
    }
    if (!this.client || !this.channel)
      return cb(new Error('Wrong usage of presence.get'))

    if (this.loaded && !opts.forceReload)
      return cb(null, this.clientsList)

    const params = []
    if (opts.connectionId || opts.socketId)
      params.push('connectionId=' + (opts.connectionId || opts.socketId))

    if (opts.clientId)
      params.push('clientId=' + opts.clientId)

    const url = '/room/' + this.channel + '?' + params.join('&')
    this.client.connection.request(url, (err, data) => {
      if (err)
        return cb(err)

      try {
        if (_.isString(data))
          data = JSON.parse(data)

        this.clientsList = data
        this.loaded = true
        return cb(null, data)
      }
      catch (err) {
        cb(err)
      }
    })
  }

  /**
   * Send enter channel notification
   * @param {Function} [cb]
   */
  enter (cb) {
    cb = cb || _.noop
    if (!this.channel || !this.client || !this.client.connection)
      return cb(new Error('No client or channel exist'))

    if (!this.client.connection.clientId || !this.client.connection.isConnected())
      return cb(new Error('No connection exist'))

    const message = Message
        .presence(this.client.connection.clientId, this.channel, Message.PRESENCE.ENTER)

    this.client.connection.sendCallback(message, cb)
  }

  /**
   * Leave room
   * @param {Function} [cb]
   */
  leave (cb) {
    cb = cb || _.noop
    if (!this.channel || !this.client || !this.client.connection)
      return cb(new Error('No client or channel exist'))

    if (!this.client.connection.clientId || !this.client.connection.isConnected())
      return cb(new Error('No connection exist'))

    this.client.connection.send(Message
        .presence(this.client.connection.clientId, this.channel, Message.PRESENCE.LEAVE))

    return cb()
  }

  /**
   * Will add a new client into list of clients
   * @param {Object} data
   */
  addClient (data) {
    if (!data || !data.clientId)
      return

    let found = false
    for (let i = 0; i < this.clientsList.length; i++) {
      if (this.clientsList[i].clientId == data.clientId) {
        found = true
        break
      }
    }

    if (!found)
      this.clientsList.push(data)
  }

  /**
   * Will remove client from list of clients
   * @param {Object} data
   */
  removeClient (data) {
    if (!data || !data.clientId)
      return

    for (let i = 0; i < this.clientsList.length; i++) {
      if (this.clientsList[i].clientId == data.clientId) {
        this.clientsList.splice(i, 1)
        break
      }
    }
  }

  /**
   * Will clear list of clients from presence
   */
  clearClients () {
    this.clientsList = []
    this.loaded = false
  }

  /**
   * Will check current client list and update it if needed
   * after that it will send event to other listeners
   * @param {String} event
   * @param {Object} data
   */
  sendEvent (event, data) {
    switch (event) {

      case this.events.enter:
        this.addClient(data)
        break

      case this.events.leave:
        this.removeClient(data)
        break
    }
    this.emit(event, data)
  }

  /**
   * Subscribe to presence events
   * @param {String|Array} event
   * @param {Function} cb
   */
  subscribe (event, cb) {
    cb = cb || _.noop
    if (_.isFunction(event)) {
      cb = event
      event = Object.keys(this.events)
    }
    if (_.isString(event))
      event = [event]

    event.map((name) => {
      if (!this.listeners[name])
        this.listeners[name] = []

      this.listeners[name].push(cb)
      this.on(name, cb)
    })
  }

}
