'use strict'

const EventEmitter = require('events')
const _ = require('lodash')

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

    this.client.connection.request('/room/' + this.channel, (err, data) => {
      if (err)
        return cb(err)

      try {
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
   */
  enter () {
    // TODO: really needed ?
  }
  
  /**
   * Will add a new client into list of clients
   * @param {Object} data
   */
  addClient (data) {
    if (!data || !data.clientId)
      return

    let found = false
    for(let i = 0; i < this.clientsList.length; i++) {
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
    switch(event) {
      
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

    event.map((name) => this.on(name, cb))
  }
}
