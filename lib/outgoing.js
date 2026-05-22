/**
 * FatahShaheen OS — Outbound Relay Service
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

'use strict'

const SMTPConnection = require('nodemailer/lib/smtp-connection')
const async = require('async')
const fs = require('fs')
const logger = require('./logger')
const wildstring = require('wildstring')

wildstring.caseSensitive = false

const config = { autoRelay: false }

let client
let emailQueue

const outgoing = module.exports = {}

outgoing.setup = function (host, port, user, pass, secure) {
  port = port || (secure ? 465 : 25)
  host = host || 'localhost'
  secure = secure || false

  config.host = host
  config.port = port
  config.user = user
  config.pass = pass
  config.secure = secure

  this._createClient()

  // Message dispatch queue (Serial processing to ensure data integrity)
  emailQueue = async.queue(relayWorker, 1)
}

outgoing._createClient = function () {
  try {
    client = new SMTPConnection({
      port: config.port,
      host: config.host,
      secure: config.secure,
      auth: (config.pass && config.user) ? { user: config.user, pass: config.pass } : false,
      tls: { rejectUnauthorized: false },
      debug: false 
    })

    client.on('error', function (err) { logger.error('[FsMail Relay] SMTP Connection Fault:', err) })

    logger.info(
      '[FsMail Relay] Initialized outgoing channel on %s:%d (Status: %s)',
      config.host,
      config.port,
      config.secure ? 'Secure' : 'Standard'
    )
  } catch (err) {
    logger.error('[FsMail Relay] Configuration failure:', err)
  }
}

outgoing.close = function () {
  if (this.isEnabled()) { client.close() }
}

outgoing.isEnabled = function () {
  return !!client
}

outgoing.getOutgoingHost = function () {
  return config.host
}

outgoing.isAutoRelayEnabled = function () {
  return config.autoRelay
}

outgoing.setAutoRelayMode = function (enabled, rules, emailAddress) {
  if (!client) {
    config.autoRelay = false
    logger.info('[FsMail Relay] Outbound channel inactive - Auto-relay ignored.')
    return
  }

  if (rules) {
    if (typeof rules === 'string') {
      try {
        rules = JSON.parse(fs.readFileSync(rules, 'utf8'))
      } catch (err) {
        logger.error('[FsMail Relay] Rule configuration read error:', err)
        throw err
      }
    }
    if (Array.isArray(rules)) config.autoRelayRules = rules
  }

  config.autoRelay = enabled
  if (enabled && emailAddress) config.autoRelayAddress = emailAddress

  if (config.autoRelay) {
    logger.info(`[FsMail Relay] Auto-Relay active. Target: ${config.autoRelayAddress || 'Dynamic'}`)
  }
}

outgoing.relayMail = function (emailObject, emailStream, isAutoRelay, callback) {
  emailQueue.push({ emailObject, emailStream, isAutoRelay, callback })
}

// Internal relay processing function
function relayMail (emailObject, emailStream, isAutoRelay, done) {
  if (!client) { return done(new Error('[FsMail Relay] Service not configured')) }

  if (isAutoRelay && config.autoRelayAddress) {
    emailObject.to = [{ address: config.autoRelayAddress }]
    emailObject.envelope.to = [{ address: config.autoRelayAddress, args: false }]
  }

  let recipients = emailObject?.envelope?.to ? emailObject.envelope.to.map(getAddressFromAddressObject) : [];
  if (isAutoRelay && config.autoRelayRules) {
    recipients = getAutoRelayableRecipients(recipients)
  }

  if (recipients.length === 0) return done('[FsMail Relay] Invalid message destination')

  const mailSendCallback = function (err) {
    if (err) {
      logger.error('[FsMail Relay] Authentication hand-off failure:', err)
      return done(err)
    }

    const sender = getAddressFromAddressObject(emailObject.envelope.from)
    client.send({ from: sender, to: recipients }, emailStream, function (err) {
      client.quit()
      outgoing._createClient()

      if (err) {
        logger.error('[FsMail Relay] Transmission failure:', err)
        return done(err)
      }
      logger.info(`[FsMail Relay] Transmission successful: ${emailObject.subject}`)
      return done()
    })
  }

  if (client.options.auth) {
    client.login(client.options.auth, mailSendCallback)
  } else {
    mailSendCallback(null)
  }
}

function relayWorker (task, callback) {
  relayMail(task.emailObject, task.emailStream, task.isAutoRelay, (err, res) => {
    if (task.callback) task.callback(err, res)
    callback(err, res)
  })
}

function getAddressFromAddressObject (addr) {
  return typeof addr.address !== 'undefined' ? addr.address : addr
}

function getAutoRelayableRecipients (recipients) {
  return recipients.filter(validateAutoRelayRules)
}

function validateAutoRelayRules (email) {
  if (!config.autoRelayRules) return true
  return config.autoRelayRules.reduce((res, rule) => {
    const toMatch = rule.allow || rule.deny || ''
    return wildstring.match(toMatch, email) ? (!!rule.allow) : res
  }, true)
}
