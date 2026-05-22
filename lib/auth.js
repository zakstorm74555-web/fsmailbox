/**
 * FatahShaheen OS — Web Identity Access Gateway
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

'use strict'

module.exports = function (basePathname, user, password) {
  return function (req, res, next) {
    // Infrastructure health check probe: allow access without auth for system monitoring
    if (req.path === (basePathname || '') + '/healthz') {
      return next()
    }

    let auth
    if (req.headers.authorization) {
      // Decode incoming base64 credential payload
      auth = Buffer.from(req.headers.authorization.substring(6), 'base64').toString().split(':')
    }

    // Identity validation layer
    if (!auth || auth[0] !== user || auth[1] !== password) {
      res.statusCode = 401
      res.setHeader('WWW-Authenticate', 'Basic realm="FsMail Workspace Identity Required"')
      res.send('[FsMail Access] Authorization failure: Identity credentials not recognized.')
    } else {
      // Identity confirmed, route to workspace
      next()
    }
  }
}
