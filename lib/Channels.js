'use strict'

const Channel = require('./Channel')

/**
 * Socket channels
 * @type {Channels}
 */
module.exports = class Channels {

  constructor(client) {
    this.client = client

    this.all = {}
  }

  /**
   * Create and connect to a new channel
   * @param {String} name
   * @return {Channel}
   */
  get (name) {
    if (!name)
      return

    name = String(name)
    let channel = this.all[name]
    if (!channel)
      channel = this.all[name] = new Channel(this.client, name)

    return channel
  }

  /**
   * Release channel
   * @param {String} name
   */
  release (name) {
    if (!name)
      return
    const channel = this.all[name]
    if (channel)
      delete this.all[name]
  }

  /**
   * Handle user attached channel
   * @param {Object} msg
   */
  handleChannelAttach (msg) {
    if (!msg.channel || !this.all[msg.channel])
      return

    const channel = this.get(msg.channel)
    if (!channel)
      return

    channel.emit(channel.states.attached, msg)
  }

  /**
   * Handle user detached channel
   * @param {Object} msg
   */
  handleChannelDetach (msg) {
    if (!msg.channel || !this.all[msg.channel])
      return

    const channel = this.get(msg.channel)
    if (!channel)
      return

    channel.emit(channel.states.detached, msg)
  }

  /**
   * Handle message from server
   * @param {Object} msg
   */
  handleChannelMessage (msg) {
    if (!msg.channel || !this.all[msg.channel])
      return

    const channel = this.get(msg.channel)
    if (!channel)
      return

    channel.fireMessage(msg)
  }

  /**
   * Handle presence message
   * @param {Object} msg
   */
  handlePresence (msg) {
    if (!msg.channel || !this.all[msg.channel])
      return

    const channel = this.get(msg.channel)
    if (!channel)
      return

    channel.firePresence(msg)
  }
}
