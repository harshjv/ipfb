const url = require('url')
const path = require('path')

const IPFS = require('ipfs')
const express = require('express')

const resolve = require('./resolve')

const node = new IPFS({ init: false })
const views = path.join(__dirname, 'views')

node.on('start', () => {
  const app = express()
  app.set('view engine', 'hbs')
  app.set('views', views)
  app.use('/assets', express.static(path.join('.', 'assets')))

  app.get('/ipfs/*', (req, res) => {
    const reqPath = url.parse(req.originalUrl).pathname
    resolve(node, reqPath, res)
  })

  app.listen(8005, () => {
    console.log('Started listening on port 8005')
  })
})
