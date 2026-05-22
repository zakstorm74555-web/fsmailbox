/**
 * FsMail Sovereign Security Kernel — Attachment Processor
 * Author: FatahShaheen OS (Paradox Studio)
 */

const path = require('path')
const crypto = require('crypto');

// Return the absolute disk path for a requested mail attachment
function getAttachmentFilePath(mailDir, emailId, attachment) {
  if (!attachment.transformed) {
    throw new Error('[FsMail Security] Attachment verification layer failed: File integrity not verified.')
  }
  return path.join(mailDir, emailId, attachment.generatedFileName)
}

// Generate secure cryptographic filename hash to prevent unauthorized access
function generateAttachmentFilename(attachment) {
  const ext = path.extname(attachment.generatedFileName)
  const name = crypto.createHash('md5').update(attachment.contentId).digest('hex')
  return path.format({ name, ext })
}

// Apply transformation to attachment metadata for secure path mapping
function transformAttachment(attachment) {
  return {
    ...attachment,
    transformed: true,
    generatedFileName: generateAttachmentFilename(attachment),
  }
}

module.exports.getAttachmentFilePath = getAttachmentFilePath
module.exports.transformAttachment = transformAttachment;
