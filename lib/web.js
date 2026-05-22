/**
 * FatahShaheen OS — Web Interface & Socket Gateway
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

'use strict'

const express = require('express')
const cors = require('cors')
const http = require('http')
const https = require('https')
const fs = require('fs')
const socketio = require('socket.io')
const routes = require('./routes')
const auth = require('./auth')
const logger = require('./logger')
const path = require('path')

const web = module.exports = {}

// Connection tracking for graceful shutdown management
const connections = {}
let io

function handleConnection (socket) {
  const key = `${socket.remoteAddress}:${socket.remotePort}`
  connections[key] = socket
  socket.on('close', function () {
    delete connections[key]
  })
}

function closeConnections () {
  for (const key in connections) {
    connections[key].destroy()
  }
}

/**
 * Real-time event streaming handlers
 */
function emitNewMail (socket) {
  return function (email) {
    socket.emit('newMail', email)
  }
}

function emitDeleteMail (socket) {
  return function (email) {
    socket.emit('deleteMail', email)
  }
}

function webSocketConnection (mailserver) {
  return function onConnection (socket) {
    const newHandlers = emitNewMail(socket)
    const deleteHandler = emitDeleteMail(socket)
    
    mailserver.on('new', newHandlers)
    mailserver.on('delete', deleteHandler)

    function removeListeners () {
      mailserver.removeListener('new', newHandlers)
      mailserver.removeListener('delete', deleteHandler)
    }

    socket.on('disconnect', removeListeners)
  }
}

web.server = null

/**
 * Initialize Web Interface Gateway
 */
web.start = function (port, host, mailserver, user, password, basePathname, secure) {
  const app = express()
  
  // Security protocol configuration
  if (secure.https) {
    if (!fs.existsSync(secure.key) || !fs.existsSync(secure.cert)) {
      logger.error('[FsMail Gateway] SSL Configuration error: Key or Cert file missing.')
      return
    }
    const options = {
      key: fs.readFileSync(secure.key),
      cert: fs.readFileSync(secure.cert)
    }
    web.server = https.createServer(options, app)
  } else {
    web.server = http.createServer(app)
  }

  // Web Access Gateway Security (HTTP Auth)
  if (user && password) {
    app.use(auth(basePathname, user, password))
  }

  const base = basePathname || '/'
  io = socketio({ path: path.posix.join(base, '/socket.io') })

  // Static site asset serving (FsMail Frontend)
  app.use(base, express.static(path.join(__dirname, '../app')))
  app.use(cors())

  // API Routing Pipeline
  routes(app, mailserver, base)

  io.attach(web.server)
  io.on('connection', webSocketConnection(mailserver))

  const webPort = port || 1080
  const webHost = host || '::'

  web.server.listen(webPort, webHost)
  web.server.on('connection', handleConnection)

  const printHost = webHost === '::' ? 'localhost' : webHost
  logger.info('[FsMail Workspace] Web interface online: http://%s:%s%s', printHost, webPort, base)
}

web.close = function (callback) {
  if (!web.server && typeof callback === 'function') {
    return callback()
  }
  closeConnections()
  io.close(callback)
}
