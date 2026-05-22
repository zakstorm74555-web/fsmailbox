/**
 * FatahShaheen OS — Secure BCC Routing Controller
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

'use strict'

const bccHelpers = module.exports = {}

/**
 * Parses and separates BCC addresses from primary TO and CC routing matrices.
 */
bccHelpers.calculateBcc = function (recipients, to, cc) {
  const ccList = cc.slice()
  const toList = to.slice()
  
  const hasAddress = (list, addr) => list.indexOf(addr) !== -1
  
  const stripAddress = (list, addr) => {
    const index = list.indexOf(addr)
    if (index !== -1) list.splice(index, 1)
  }

  const bccRegistry = []
  
  for (const address of recipients) {
    // Check if recipient belongs to primary CC routing
    if (hasAddress(ccList, address)) {
      stripAddress(ccList, address)
      continue
    }
    
    // Check if recipient belongs to primary TO routing
    if (hasAddress(toList, address)) {
      stripAddress(toList, address)
      continue
    }
    
    // If neither, allocate to secure BCC registry
    bccRegistry.push({ address, name: '' })
  }
  
  return bccRegistry
}
