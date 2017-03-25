const mh = require('multihashes')
const pf = require('promised-for')
const mime = require('mime-types')

const PathUtils = require('./utils/path')
const filesize = require('filesize')

const INDEX_HTML_FILES = [ 'index.html', 'index.htm', 'index.shtml' ]

const resolveDirectory = (ipfs, path, multihash) => {
  return ipfs
  .object
  .get(multihash, { enc: 'base58' })
  .then((DAGNode) => {
    const links = DAGNode.links
    const indexFiles = links.filter((link) => INDEX_HTML_FILES.indexOf(link.name) !== -1)

    // found index file in links
    if (indexFiles.length > 0) {
      return {
        index: indexFiles[0]
      }
    }

    return { path, links }
  })
}

const resolveMultihash = (ipfs, path) => {
  const parts = PathUtils.splitPath(path)
  const partsLength = parts.length

  return pf(
    {
      multihash: parts[0],
      index: 0
    },
    (i) => i.index < partsLength,
    (i) => {
      const currentIndex = i.index
      const currentMultihash = i.multihash

      // throws error when invalid multihash is passed
      mh.validate(mh.fromB58String(currentMultihash))

      return ipfs
      .object
      .get(currentMultihash, { enc: 'base58' })
      .then((DAGNode) => {
        if (currentIndex === partsLength - 1) {
          // leaf node
          return {
            multihash: currentMultihash,
            index: currentIndex + 1
          }
        } else {
          // find multihash of requested named-file
          // in current DAGNode's links
          let multihashOfNextFile
          const nextFileName = parts[currentIndex + 1]
          const links = DAGNode.links

          for (let link of links) {
            if (link.name === nextFileName) {
              // found multihash of requested named-file
              multihashOfNextFile = mh.toB58String(link.multihash)
              break
            }
          }

          if (!multihashOfNextFile) {
            throw new Error(`no link named "${nextFileName}" under ${currentMultihash}`)
          }

          return {
            multihash: multihashOfNextFile,
            index: currentIndex + 1
          }
        }
      })
    })
}

const getParentDirectoryURL = (path) => {
  const parts = PathUtils.removeSlashFromBothEnds(path).split('/')

  if (parts.length > 1) {
    parts.pop()
  }

  if (parts.length === 1) return false

  return `/${parts.join('/')}`
}

module.exports = (node, path, res) => {
  resolveMultihash(node, path)
  .then((data) => {
    node
    .files
    .cat(data.multihash)
    .then((stream) => {
      if (path.endsWith('/')) {
        res.redirect(301, PathUtils.removeTrailingSlash(path))
      } else {
        res.append('X-Stream-Output', '1')

        const mimeType = mime.lookup(path)

        if (mimeType) {
          res.append('Content-Type', mime.contentType(mimeType))
        }

        stream.pipe(res)
      }
    })
    .catch((err) => {
      if (err.toString() === 'Error: This dag node is a directory') {
        return resolveDirectory(node, path, data.multihash)
        .then((data) => {
          if (data.index) {
            return res.redirect(PathUtils.joinURLParts(path, data.index))
          } else {
            // no index file found
            if (!path.endsWith('/')) {
              // for a directory, if URL doesn't end with a /
              // append / and redirect permanent to that URL
              res.redirect(301, `${path}/`)
            } else {
              // send directory listing

              data.parent = getParentDirectoryURL(path)

              for (let index in data.links) {
                let link = data.links[index]
                link.url = PathUtils.joinURLParts(path, link.name)
                link.humanReadableSize = filesize(link.size)
              }

              res.render('index', data)
            }
          }
        }).catch((err) => {
          console.error(err)

          res.status(500).json({
            error: err.toString()
          })
        })
      } else {
        console.error(err)

        res.status(500).json({
          error: err.toString()
        })
      }
    })
  }).catch((err) => {
    const errorToString = err.toString()

    if (errorToString.startsWith('Error: no link named')) {
      res.status(404).json({
        error: errorToString
      })
    } else if (errorToString.startsWith('Error: multihash length inconsistent') ||
       errorToString.startsWith('Error: Non-base58 character')) {
      res.status(400).json({
        error: errorToString
      })
    } else {
      console.error(err)

      res.status(500).json({
        error: errorToString
      })
    }
  })
}
