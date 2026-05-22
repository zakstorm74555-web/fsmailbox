/**
 * FatahShaheen OS — System Monitor & Logging Controller
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

'use strict'

let logLevel = 1

module.exports = {}

/**
 * Configure logging sensitivity level
 */
module.exports.setLevel = function (level) {
  logLevel = level
}

/**
 * Standard Information Log (Always visible in operational mode)
 */
module.exports.info = function () {
  if (logLevel > 0) { 
    // Prefixed with FsMail system tag for clean terminal tracking
    const args = Array.from(arguments);
    console.info('[FsMail System]', ...args); 
  }
}

/**
 * Extended Diagnostic Logs (Visible only in verbose developer mode)
 */
['log', 'dir', 'warn', 'error'].forEach(function (fn) {
  module.exports[fn] = function () {
    if (logLevel > 1) {
      // Prefixed with Diagnostic tag
      const args = Array.from(arguments);
      console[fn](`[FsMail Diagnostic][${fn.toUpperCase()}]`, ...args);
    }
  }
})
