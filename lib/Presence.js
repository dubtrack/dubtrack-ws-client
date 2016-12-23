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

    this.client.connection.request('/room/' + this.channel, (err, data) => {
      if (err)
        return cb(err)

      try {
        cb(null, JSON.parse(data))
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
