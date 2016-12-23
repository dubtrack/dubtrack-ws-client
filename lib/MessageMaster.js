'use strict'

const _ = require('lodash')

/**
 * Message Master
 * @type {MessageMaster}
 */
const MessageMaster = {

  /**
   * Parse an incoming message
   * @param {String} message
   * @return {Object}
   */
  parse (message) {
    if (!_.isString(message))
      return message

    try {
      return JSON.parse(message)
    }
    catch (err) {
      return {}
    }
  },

  /**
   * Stringify given message object
   * @throws Error
   * @param {Object} message
   * @return {String}
   */
  stringify (message) {
    if (_.isString(message))
      return message

    return JSON.stringify(message)
  }
}

module.exports = MessageMaster
