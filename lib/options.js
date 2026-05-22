/**
 * FatahShaheen OS — FsMail System Configuration Options
 * Author: FatahShaheen OS Official (Paradox Studio)
 */

module.exports.options = [
  // flag, environment variable, description, default value, function
  ['-s, --smtp <port>', 'MAILDEV_SMTP_PORT', 'SMTP port to capture incoming messages', '1025'],
  ['-w, --web <port>', 'MAILDEV_WEB_PORT', 'Port to run the FsMail Web Interface', '1080'],
  ['--mail-directory <path>', 'MAILDEV_MAIL_DIRECTORY', 'Directory for persistent message storage'],
  ['--https', 'MAILDEV_HTTPS', 'Enable HTTPS security protocol', false],
  ['--https-key <file>', 'MAILDEV_HTTPS_KEY', 'Path to SSL private key'],
  ['--https-cert <file>', 'MAILDEV_HTTPS_CERT', 'Path to SSL certificate'],
  ['--ip <ip address>', 'MAILDEV_IP', 'IP address to bind SMTP service', '::'],
  ['--outgoing-host <host>', 'MAILDEV_OUTGOING_HOST', 'SMTP host for outbound relays'],
  ['--outgoing-port <port>', 'MAILDEV_OUTGOING_PORT', 'SMTP port for outbound relays'],
  ['--outgoing-user <user>', 'MAILDEV_OUTGOING_USER', 'SMTP username for outbound relays'],
  ['--outgoing-pass <password>', 'MAILDEV_OUTGOING_PASS', 'SMTP password for outbound relays'],
  ['--outgoing-secure', 'MAILDEV_OUTGOING_SECURE', 'Enable SMTP SSL for outgoing', false],
  ['--auto-relay [email]', 'MAILDEV_AUTO_RELAY', 'Enable auto-relay mode. Optional address'],
  ['--auto-relay-rules <file>', 'MAILDEV_AUTO_RELAY_RULES', 'Filter rule set for auto-relay'],
  ['--incoming-user <user>', 'MAILDEV_INCOMING_USER', 'SMTP username for incoming authentication'],
  ['--incoming-pass <pass>', 'MAILDEV_INCOMING_PASS', 'SMTP password for incoming authentication'],
  ['--incoming-secure', 'MAILDEV_INCOMING_SECURE', 'Enable SMTP SSL for incoming', false],
  ['--incoming-cert <path>', 'MAILDEV_INCOMING_CERT', 'Path to incoming SSL certificate'],
  ['--incoming-key <path>', 'MAILDEV_INCOMING_KEY', 'Path to incoming SSL key'],
  ['--web-ip <ip address>', 'MAILDEV_WEB_IP', 'IP address for Web GUI'],
  ['--web-user <user>', 'MAILDEV_WEB_USER', 'HTTP authentication username'],
  ['--web-pass <password>', 'MAILDEV_WEB_PASS', 'HTTP authentication password'],
  ['--base-pathname <path>', 'MAILDEV_BASE_PATHNAME', 'Base path for URL routing'],
  ['--disable-web', 'MAILDEV_DISABLE_WEB', 'Disable Web GUI (Unit testing mode)', false],
  ['--hide-extensions <extensions>',
    'MAILDEV_HIDE_EXTENSIONS',
    'List of SMTP extensions to mask (e.g., SMTPUTF8, PIPELINING)',
    [],
    function (val) {
      return val.split(',')
    }
  ],
  ['-v, --verbose', 'Enable diagnostic output logs'],
  ['--silent', 'Disable all system logs'],
  ['--log-mail-contents', 'Log JSON packet details for every incoming email']
]

module.exports.appendOptions = function (program, options) {
  return options.reduce(function (chain, option) {
    const flag = option[0]
    const envVariable = option[1]
    const description = option[2]
    const defaultValue = process.env[envVariable] || option[3]
    const fn = option[4]
    
    if (fn) {
      return chain.option(flag, description, fn, defaultValue)
    }
    return chain.option(flag, description, defaultValue)
  }, program)
}
