# 🌎🗃 Interplanetary File Browser

## Installation

```bash
npm install -g ipfb
```

## CLI

```
Usage: ipfb [options]

Options:
  -s, --start  Start IPFS swarm                                        [boolean]
  -r, --repo   Local IPFS repo path
  -p, --port   IPFS file borwser's port                          [default: 8989]
  -h, --help   Show help                                               [boolean]

Examples:
  ipfb -r ~/.ipfs  Use IPFS repo created by go-ipfs
```

## API

```js
ipfb(start: boolean, port: integer, repo: string)
```
Where;

* `start`: Start IPFS swarm,
* `port`: IPFS file borwser's port,
* `repo`: Local IPFS repo path

## License

MIT
