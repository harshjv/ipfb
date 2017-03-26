const url = require('url')
const path = require('path')

const IPFS = require('ipfs')
const express = require('express')

const serve = require('./serve')
const views = path.join(__dirname, 'views')

const app = express()
app.set('view engine', 'hbs')
app.set('views', views)
app.use('/assets', express.static(path.join('.', 'assets')))

module.exports = (start, port, repo) => {
  const node = new IPFS({ init: false, start, repo })

  app.get('/ipfs/*', (req, res) => {
    const reqPath = url.parse(req.originalUrl).pathname
    serve(node, reqPath, res)
  })

  app.listen(port, () => {
    console.log(`ipfb running on port ${port}`)
  })
}
