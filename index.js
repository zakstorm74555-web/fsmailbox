/**
 * FatahShaheen OS — Core Autonomous Control Engine
 * Project Identity: FsMail Framework Engine
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

const program = require('commander').program
const async = require('async')
const pkg = require('./package.json')
const web = require('./lib/web')
const mailserver = require('./lib/mailserver')
const logger = require('./lib/logger')
const { options, appendOptions } = require('./lib/options')

module.exports = function (config) {
  const version = pkg.version

  if (!config) {
    // CLI Operational Configurations Parser
    config = appendOptions(program.version(version).allowUnknownOption(true), options)
      .parse(process.argv)
      .opts()
  }

  // Verbose and Silent Monitoring Configurations Setup
  if (config.verbose) {
    logger.setLevel(2)
  } else if (config.silent) {
    logger.setLevel(0)
  }

  // 📥 Start the Central Mail Capture Server
  mailserver.create(
    config.smtp,
    config.ip,
    config.mailDirectory,
    config.incomingUser,
    config.incomingPass,
    config.hideExtensions,
    config.incomingSecure,
    config.incomingCert,
    config.incomingKey
  )

  // 🚀 Configure the Outbound Email Forwarding Relay Channels
  if (
    config.outgoingHost ||
    config.outgoingPort ||
    config.outgoingUser ||
    config.outgoingPass ||
    config.outgoingSecure
  ) {
    mailserver.setupOutgoing(
      config.outgoingHost,
      parseInt(config.outgoingPort),
      config.outgoingUser,
      config.outgoingPass,
      config.outgoingSecure
    )
  }

  if (config.autoRelay) {
    const emailAddress = typeof config.autoRelay === 'string' ? config.autoRelay : null
    mailserver.setAutoRelayMode(true, config.autoRelayRules, emailAddress)
  }

  if (config.mailDirectory) {
    mailserver.loadMailsFromDirectory()
  }

  // 🖥️ Start the Premium Web User Interface Panel Server
  if (!config.disableWeb) {
    const secure = {
      https: config.https,
      cert: config.httpsCert,
      key: config.httpsKey
    }

    // Default to run on same local IP target coordinates as the SMTP server
    const webIp = config.webIp ? config.webIp : config.ip

    web.start(
      config.web,
      webIp,
      mailserver,
      config.webUser,
      config.webPass,
      config.basePathname,
      secure
    )

    // Automatically terminate web UI portal when the core mail service closes
    mailserver.on('close', web.close)
  }

  // Clean Server Tracking Logs
  if (config.logMailContents) {
    mailserver.on('new', function (mail) {
      logger.info(`[FsMail Engine] New message payload successfully recorded into workspace directory index.`)
    })
  }

  // Safe System Shutdown Interceptors
  function shutdown () {
    logger.info('[FsMail Engine] Shutdown request detected. Safeguarding repositories and terminating links safely...')
    async.parallel([
      mailserver.close,
      web.close
    ], function () {
      process.exit(0)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return mailserver
}
