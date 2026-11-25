const net = require('net')
const fs = require('fs')

const outFile = process.argv[2]
if (!outFile) {
  console.error('usage: node smtp-sink.js <output-file>')
  process.exit(1)
}

fs.writeFileSync(outFile, '')

const server = net.createServer((socket) => {
  let buffer = ''
  let dataMode = false
  let message = ''
  socket.write('220 trainconcierge-sink ESMTP ready\r\n')
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8')
    let idx
    while ((idx = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      if (dataMode) {
        if (line === '.') {
          dataMode = false
          fs.appendFileSync(outFile, '-----MESSAGE-----\r\n' + message + '\r\n')
          message = ''
          socket.write('250 2.0.0 OK queued\r\n')
        } else {
          message += (line.startsWith('.') ? line.slice(1) : line) + '\r\n'
        }
        continue
      }
      const verb = line.split(' ')[0].toUpperCase()
      if (verb === 'EHLO' || verb === 'HELO') {
        socket.write('250-sink.local\r\n250 HELP\r\n')
      } else if (verb === 'MAIL' || verb === 'RCPT' || verb === 'RSET' || verb === 'NOOP' || verb === 'VRFY') {
        socket.write('250 2.1.0 OK\r\n')
      } else if (verb === 'DATA') {
        dataMode = true
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n')
      } else if (verb === 'QUIT') {
        socket.write('221 2.0.0 Bye\r\n')
        socket.end()
      } else {
        socket.write('502 5.5.2 Unrecognized command\r\n')
      }
    }
  })
  socket.on('error', () => socket.destroy())
})

server.listen(1025, () => console.log('smtp sink listening on 1025, writing to ' + outFile))
