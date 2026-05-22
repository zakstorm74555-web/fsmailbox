/**
 * FatahShaheen OS — FsMail API Routing Gateway
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

'use strict'

const express = require('express')
const compression = require('compression')
const pkg = require('../package.json')
const { filterEmails } = require('./utils')

const emailRegexp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

module.exports = function (app, mailserver, basePathname) {
  const router = express.Router()

  // GET: Fetch all message packets
  router.get('/email', compression(), function (req, res) {
    mailserver.getAllEmail(function (err, emailList) {
      if (err) return res.status(404).json([])
      const { skip, ...query } = req.query
      const skipCount = skip ? parseInt(skip, 10) : 0
      if (Object.keys(query).length) {
        const filteredEmails = filterEmails(emailList, query)
        res.json(filteredEmails.slice(skipCount))
      } else {
        res.json(emailList.slice(skipCount))
      }
    })
  })

  // GET: Retrieve single message payload
  router.get('/email/:id', function (req, res) {
    mailserver.getEmail(req.params.id, function (err, email) {
      if (err) return res.status(404).json({ error: '[FsMail] Message record not found' })
      email.read = true 
      res.json(email)
    })
  })

  // PATCH: Set entire message registry to read status
  router.patch('/email/read-all', function (req, res) {
    mailserver.readAllEmail(function (err, count) {
      if (err) return res.status(500).json({ error: '[FsMail] Internal registry fault' })
      res.json(count)
    })
  })

  // DELETE: Purge entire message store
  router.delete('/email/all', function (req, res) {
    mailserver.deleteAllEmail(function (err) {
      if (err) return res.status(500).json({ error: '[FsMail] Storage purge failure' })
      res.json(true)
    })
  })

  // DELETE: Remove specific message by ID
  router.delete('/email/:id', function (req, res) {
    mailserver.deleteEmail(req.params.id, function (err) {
      if (err) return res.status(500).json({ error: '[FsMail] Deletion fault' })
      res.json(true)
    })
  })

  // GET: Render message HTML content
  router.get('/email/:id/html', function (req, res) {
    const baseUrl = req.headers.host + (req.baseUrl || '')
    mailserver.getEmailHTML(req.params.id, baseUrl, function (err, html) {
      if (err) return res.status(404).json({ error: '[FsMail] HTML component not found' })
      res.send(html)
    })
  })

  // GET: Serve message attachments
  router.get('/email/:id/attachment/:filename', function (req, res) {
    mailserver.getEmailAttachment(req.params.id, req.params.filename, function (err, contentType, readStream) {
      if (err) return res.status(404).json('[FsMail] Attachment not found')
      res.contentType(contentType)
      readStream.pipe(res)
    })
  })

  // GET: Download message source (.eml)
  router.get('/email/:id/download', function (req, res) {
    mailserver.getEmailEml(req.params.id, function (err, contentType, filename, readStream) {
      if (err) return res.status(404).json('[FsMail] File not found')
      res.setHeader('Content-disposition', 'attachment; filename=' + filename)
      res.contentType(contentType)
      readStream.pipe(res)
    })
  })

  // GET: Raw source data
  router.get('/email/:id/source', function (req, res) {
    mailserver.getRawEmail(req.params.id, function (err, readStream) {
      if (err) return res.status(404).json('[FsMail] Raw data not found')
      readStream.pipe(res)
    })
  })

  // GET: System configuration readout
  router.get('/config', function (req, res) {
    res.json({
      version: pkg.version,
      smtpPort: mailserver.port,
      isOutgoingEnabled: mailserver.isOutgoingEnabled(),
      outgoingHost: mailserver.getOutgoingHost()
    })
  })

  // POST: Relay transmission dispatch
  router.post('/email/:id/relay/:relayTo?', function (req, res) {
    mailserver.getEmail(req.params.id, function (err, email) {
      if (err) return res.status(404).json({ error: '[FsMail] Message record missing' })

      if (req.params.relayTo) {
        if (emailRegexp.test(req.params.relayTo)) {
          email.to = [{ address: req.params.relayTo }]
          email.envelope.to = [{ address: req.params.relayTo, args: false }]
        } else {
          return res.status(400).json({ error: '[FsMail] Invalid destination: ' + req.params.relayTo })
        }
      }

      mailserver.relayMail(email, function (err) {
        if (err) return res.status(500).json({ error: '[FsMail] Relay transmission failure' })
        res.json(true)
      })
    })
  })

  // System Health Probe
  router.get('/healthz', function (req, res) {
    res.json(true)
  })

  // Force re-index of directory
  router.get('/reloadMailsFromDirectory', function (req, res) {
    mailserver.loadMailsFromDirectory()
    res.json(true)
  })
  
  app.use(basePathname, router)
}
