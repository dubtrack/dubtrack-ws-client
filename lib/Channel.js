'use strict'

const EventEmitter = require('events')
const _ = require('lodash')
const Message = require('./Message')
const Presence = require('./Presence')

/**
 * Channel instance
 * @type {Channel}
 */
module.exports = class Channel extends EventEmitter {

  /**
   * Create a new channel
   * @param {SocketClient} client
   * @param {String} name
   */
  constructor (client, name) {
    super()
    this.presence = new Presence(client, name)
    this.states = {
      initialized: 'initialized',
      attaching: 'attaching',
      attached: 'attached',
      detaching: 'detaching',
      detached: 'detached',
      failed: 'failed'
    }
    this.events = []
    this.state = this.states.initialized
    this.client = client
    this.name = name

    // bind disconnect handler
    client.connection.on('disconnected', this.onDisconnected.bind(this))
  }

  /**
   * Will bind list of event to handle disconnect
   */
  onDisconnected () {
    if (this.presence)
      this.presence.clearClients()

    this.setState(this.states.disconnected)
  }

  /**
   * Set channel state
   */
  setState (state) {
    this.state = state
    this.emit(state)
  }

  /**
   * Attach to channel
   * @param {Function} cb
   */
  attach (cb) {
    cb = cb || _.noop
    if (!this.client || !this.client.connection.isConnected())
      return cb(new Error('No connection'))

    if (this.state === this.states.attached)
      return cb()

    this.setState(this.states.attaching)
    this.once(this.states.attached, (msg) => {
      this.state = this.states.attached
      cb()
    })
    this.client.connection.send(Message.attachChannel(this.name))
  }

  /**
   * Detach from channel
   * @param {Function} cb
   */
  detach (cb) {
    cb = cb || _.noop
    if (this.presence)
      this.presence.clearClients()

    if (!this.client || !this.client.connection.isConnected())
      return cb(new Error('No connection'))

    if (this.state === this.states.detached)
      return cb()

    this.setState(this.states.detaching)
    this.once(this.states.detached, (msg) => {
      this.state = this.states.detached
      cb()
    })
    this.client.connection.send(Message.leaveChannel(this.name))
    this.presence.leave()
    this.presence.clearListeners()
    this.removeAllListeners()
    // TODO: remove all listeners from Channel
  }

  /**
   * Subscribe to channel messages (events)
   * @param {String} event
   * @param {Function} listener
   */
  subscribe (event, listener) {
    if (_.isFunction(event)) {
      listener = event
      event = '*'
    }
    // Check for already binded
    if (~this.events.indexOf(event))
      return

    this.on('message:' + event, listener)
    this.events.push(event)
    // Check and try to attach
    if (this.state !== this.states.attached)
      this.attach()
  }

  /**
   * Will fire presence event for channel
   * @param {Object} msg
   */
  firePresence (msg) {
    if (!msg.presence)
      return

    const defaultPresence = {
      clientId: '',
      data: {}
    }
    msg.presence.action = msg.presence.action || Message.PRESENCE.ENTER
    let action = 'enter'
    switch (msg.presence.action) {
      case Message.PRESENCE.LEAVE:
        action = 'leave'
        break

      case Message.PRESENCE.UPDATE:
        action = 'update'
        break
    }
    this.presence.sendEvent(action, _.merge(defaultPresence, msg.presence))
  }

  /**
   * Will fire message to this channel
   * @param {Object} msg
   */
  fireMessage (msg) {
    if (!msg.message)
      return

    const message = msg.message
    if (message.type == Message.MSG_TYPE.JSON) {
      try {
        message.data = JSON.parse(message.data)
      }
      catch (err) {
        // Ignore ?
      }
    }
    const event = message.name || '*'
    if (event != '*') {
      // send special event
      this.emit('message:' + event, message)
    }
    this.emit('message:*', message)
  }

  /**
   * Send message to channel
   * @param {String} event
   * @param {Object|String} message
   * @param {Function} cb
   */
  publish (event, message, cb) {
    cb = cb || _.noop
    if (!event)
      return cb(new Error('No event or message given'))

    if (_.isFunction(message)) {
      cb = message
      message = event
      event = message.name || '*'
      if (_.isObject(message) && message.data) {
        message = message.data
      }
    }

    if (_.isObject(event) || _.isArray(event)) {
      message = event
      event = message.name || '*'
    }

    if (_.isString(event) && !message) {
      message = event
      event = message.name || '*'
    }

    // if (this.state != this.states.attached)
    //   return cb(new Error('You are not attached to channel'))

    if (!this.client || !this.client.connection.isConnected())
      return cb(new Error('No connection exist'))

    try {
      this.client.connection.send(Message.channelMessage(this.name, message, event))
      cb()
    }
    catch (err) {
      cb(err)
    }
  }
}
