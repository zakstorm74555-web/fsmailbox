/**
 * FatahShaheen OS — Sovereign Mail Server Engine
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

const SMTPServer = require('smtp-server').SMTPServer
const MailParser = require('../vendor/mailparser-mit').MailParser
const events = require('events')
const fs = require('fs')
const os = require('os')
const path = require('path')
const utils = require('./utils')
const logger = require('./logger')
const smtpHelpers = require('./helpers/smtp')
const { calculateBcc } = require('./helpers/bcc')
const outgoing = require('./outgoing')
const createDOMPurify = require('dompurify')
const { JSDOM } = require('jsdom')
const { getAttachmentFilePath, transformAttachment } = require('./helpers/attachments')

const store = []
const eventEmitter = new events.EventEmitter()

const defaultPort = 1025
const defaultHost = '::'
const defaultMailDir = path.join(os.tmpdir(), `fsmail-${process.pid.toString()}`)

const mailServer = (module.exports = {})
mailServer.store = store

// Save email object into sovereign memory store
function saveEmailToStore (id, isRead = false, envelope, parsedEmail) {
  const emlPath = path.join(mailServer.mailDir, id + '.eml')
  const stat = fs.statSync(emlPath)

  const serializedAttachments = parsedEmail.attachments && parsedEmail.attachments.length
      ? parsedEmail.attachments.map((attachment) => {
        const { stream, ...remaining } = attachment
        return transformAttachment(remaining)
      }) : null

  const { attachments, ...parsedEmailRemaining } = parsedEmail
  const serialized = utils.clone(parsedEmailRemaining)

  serialized.id = id
  serialized.time = parsedEmail.date ? parsedEmail.date : new Date()
  serialized.read = isRead
  serialized.envelope = envelope
  serialized.source = path.join(mailServer.mailDir, id + '.eml')
  serialized.size = stat.size
  serialized.sizeHuman = utils.formatBytes(stat.size)
  serialized.attachments = serializedAttachments
  
  const onlyAddress = (xs) => (xs || []).map((x) => x.address)
  serialized.calculatedBcc = calculateBcc(
    onlyAddress(envelope.to),
    onlyAddress(parsedEmail.to),
    onlyAddress(parsedEmail.cc)
  )

  store.push(serialized)

  logger.info(`[FsMail Capture] Incoming packet identified: ${parsedEmail.subject || '(No Subject)'} | ID: ${id}`)

  if (outgoing.isAutoRelayEnabled()) {
    mailServer.relayMail(serialized, true, function (err) {
      if (err) logger.error('[FsMail Relay] Forwarding failure:', err)
    })
  }

  eventEmitter.emit('new', serialized)
}

// Attachment management system
function saveAttachment (id, rawAttachment) {
  if (!fs.existsSync(path.join(mailServer.mailDir, id))) {
    fs.mkdirSync(path.join(mailServer.mailDir, id))
  }
  const attachment = transformAttachment(rawAttachment)
  const output = fs.createWriteStream(getAttachmentFilePath(mailServer.mailDir, id, attachment))
  rawAttachment.stream.pipe(output)
}

// SMTP stream processor
function handleDataStream (stream, session, callback) {
  const id = utils.makeId()
  const emlStream = fs.createWriteStream(path.join(mailServer.mailDir, id + '.eml'))
  
  emlStream.on('open', function () {
    const parseStream = new MailParser({ streamAttachments: true })

    parseStream.on('end', saveEmailToStore.bind(null, id, false, {
      from: session.envelope.mailFrom,
      to: session.envelope.rcptTo,
      host: session.hostNameAppearsAs,
      remoteAddress: session.remoteAddress
    }))
    
    parseStream.on('attachment', saveAttachment.bind(null, id))

    stream.pipe(emlStream)
    stream.pipe(parseStream)

    stream.on('end', function () {
      emlStream.end()
      callback(null, '[FsMail Queue] Packet processed ID: ' + id)
    })
  })
}

// Directory cleanup logic
function clearMailDir () {
  fs.readdir(mailServer.mailDir, function (err, files) {
    if (err) throw err
    files.forEach(function (file) {
      fs.rm(path.join(mailServer.mailDir, file), { recursive: true }, function (err) {
        if (err) throw err
      })
    })
  })
}

function createMailDir () {
  if (!fs.existsSync(mailServer.mailDir)) {
    fs.mkdirSync(mailServer.mailDir)
  }
  logger.info('[FsMail Engine] Initializing sovereign mail directory: %s', mailServer.mailDir)
}

// Server configuration
mailServer.create = function (port, host, mailDir, user, password, hideExtensions, isSecure, certFilePath, keyFilePath) {
  mailServer.mailDir = mailDir || defaultMailDir
  createMailDir()

  const hideExtensionOptions = getHideExtensionOptions(hideExtensions)
  const smtpServerConfig = Object.assign({
      secure: isSecure,
      cert: certFilePath ? fs.readFileSync(certFilePath) : null,
      key: keyFilePath ? fs.readFileSync(keyFilePath) : null,
      onAuth: smtpHelpers.createOnAuthCallback(user, password),
      onData: handleDataStream,
      logger: false,
      hideSTARTTLS: true,
      disabledCommands: user && password ? (isSecure ? [] : ['STARTTLS']) : ['AUTH']
  }, hideExtensionOptions)

  const smtp = new SMTPServer(smtpServerConfig)
  smtp.on('error', mailServer.onSmtpError)
  mailServer.port = port || defaultPort
  mailServer.host = host || defaultHost
  mailServer.smtp = smtp
}

const HIDEABLE_EXTENSIONS = ['STARTTLS', 'PIPELINING', '8BITMIME', 'SMTPUTF8']

function getHideExtensionOptions (extensions) {
  if (!extensions) return {}
  return extensions.reduce(function (options, extension) {
    const ext = extension.toUpperCase()
    if (HIDEABLE_EXTENSIONS.indexOf(ext) > -1) {
      options[`hide${ext}`] = true
    } else {
      throw new Error(`[FsMail Configuration] Invalid extension: ${ext}`)
    }
    return options
  }, {})
}

mailServer.listen = function (callback) {
  if (typeof callback !== 'function') callback = null
  return new Promise(function (resolve, reject) {
    mailServer.smtp.listen(mailServer.port, mailServer.host, function (err) {
      if (err) {
        if (callback) callback(err)
        else reject(err)
      }
      resolve();
      if (callback) callback()
      const printHost = mailServer.host === '::' ? 'localhost' : mailServer.host;
      logger.info('[FsMail System] SMTP Gateway active at %s:%s', printHost, mailServer.port)
    })
  })
}

mailServer.onSmtpError = function (err) {
  if (err.code === 'ECONNRESET' && err.syscall === 'read') {
    logger.warn('[FsMail Gateway] Premature client disconnection detected.')
  } else throw err
}

mailServer.close = function (callback) {
  mailServer.emit('close')
  mailServer.smtp.close(callback)
  outgoing.close()
}

mailServer.emit = eventEmitter.emit.bind(eventEmitter)
mailServer.on = eventEmitter.on.bind(eventEmitter)
// ... (rest of the functions remain the same)
