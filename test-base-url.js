'use strict'

const assert = require('assert')
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')

// A regression must fail rather than make a real request, even with the default host.
const blockNetwork = () => { throw new Error('Network is disabled in base URL tests') }
for (const name of ['http', 'https']) {
  require(name).request = blockNetwork
  require(name).get = blockNetwork
}
require('net').Socket.prototype.connect = blockNetwork
global.fetch = blockNetwork

const root = __dirname
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'coinmarketcap-base-url-'))
const defaultBase = 'https://pro-api.coinmarketcap.com'
const apiKey = 'test-api-key'
const defaultConfig = {
  method: 'GET',
  headers: {
    'X-CMC_PRO_API_KEY': apiKey,
    Accept: 'application/json',
    'Accept-Charset': 'utf-8',
    'Accept-Encoding': 'deflate, gzip'
  }
}

const methods = [
  ['getIdMap', () => ({ symbol: ['BTC', 'ETH'], limit: 2 }), 'cryptocurrency/map?limit=2&symbol=BTC%2CETH'],
  ['getFiatMap', () => ({ start: 1, limit: 2, sort: 'name', includeMetals: false }), 'fiat/map?start=1&limit=2&sort=name&include_metals=false'],
  ['getMetadata', () => ({ id: [1, 2] }), 'cryptocurrency/info?id=1%2C2'],
  ['getTickers', () => ({ limit: 0, convert: ['USD', 'EUR'], sortDir: 'asc', cryptocurrencyType: 'coins' }), 'cryptocurrency/listings/latest?limit=5000&convert=USD%2CEUR&sort_dir=asc&cryptocurrency_type=coins'],
  ['getQuotes', () => ({ symbol: ['BTC', 'ETH'], convert: ['USD', 'EUR'] }), 'cryptocurrency/quotes/latest?symbol=BTC%2CETH&convert=USD%2CEUR'],
  ['getGlobal', () => ['gbp', 'eur'], 'global-metrics/quotes/latest?convert=GBP%2CEUR']
]

const bases = [
  [{}, `${defaultBase}/v1`],
  [{ baseUrl: undefined, version: undefined }, `${defaultBase}/v1`],
  [{ version: 'v2' }, `${defaultBase}/v2`],
  [{ baseUrl: 'http://127.0.0.1:3000' }, 'http://127.0.0.1:3000/v1'],
  [{ baseUrl: 'https://mock.example.test/proxy', version: 'v2' }, 'https://mock.example.test/proxy/v2'],
  // The URL is joined literally, not normalized, validated or treated as falsy-defaulted.
  [{ baseUrl: 'http://127.0.0.1:3000/' }, 'http://127.0.0.1:3000//v1'],
  [{ baseUrl: '', version: '' }, '/']
]

async function checkClient (Client, label) {
  let requests = 0
  for (const options of [undefined, {}, { baseUrl: undefined, version: undefined, fetcher: undefined, config: undefined }]) {
    const client = new Client(apiKey, options)
    assert.strictEqual(client.url, `${defaultBase}/v1`)
    assert.strictEqual(client.fetcher, require('node-fetch'))
    assert.deepStrictEqual(client.config, defaultConfig)
  }

  for (const [options, url] of bases) {
    for (const config of [undefined, Object.freeze({ timeout: 1000 }), Object.freeze({ method: 'POST', headers: Object.freeze({ 'X-Mock': 'test' }) })]) {
      for (const [method, args, endpoint] of methods) {
        const response = { status: { error_code: 0 }, data: [{ id: 1 }] }
        let calls = 0
        let jsonCalls = 0
        const fetcher = async (actualUrl, actualConfig) => {
          calls++
          assert.strictEqual(actualUrl, `${url}/${endpoint}`)
          assert.strictEqual(actualConfig, client.config)
          assert.deepStrictEqual(actualConfig, Object.assign({}, defaultConfig, config))
          return { json: async () => { jsonCalls++; return response } }
        }
        const settings = Object.freeze(Object.assign({}, options, { fetcher, config }))
        const client = new Client(apiKey, settings)
        assert.strictEqual(client.url, url)
        assert.strictEqual(client.apiKey, apiKey)
        assert.strictEqual(client.fetcher, fetcher)
        if (config) {
          assert.notStrictEqual(client.config, config)
          if (config.headers) assert.strictEqual(client.config.headers, config.headers)
        }
        assert.strictEqual(await client[method](args()), response)
        assert.strictEqual(calls, 1)
        assert.strictEqual(jsonCalls, 1)
        requests++
      }
    }
  }

  for (const baseUrl of [undefined, 'http://127.0.0.1:3000/mock']) {
    for (const [method, args, endpoint] of methods) {
      const errorResponse = { status: { error_code: 1001, error_message: 'Invalid API key' } }
      const error = new Error('Mock request or JSON failure')
      const cases = [
        [async () => ({ ok: false, json: async () => errorResponse }), 'response'],
        [async () => { throw error }, 'reject'],
        [async () => ({ json: async () => { throw error } }), 'reject'],
        [async () => ({ json: () => { throw error } }), 'reject'],
        [() => { throw error }, 'throw']
      ]
      for (const [result, outcome] of cases) {
        let calls = 0
        const fetcher = (url, config) => {
          calls++
          assert.strictEqual(url, `${baseUrl === undefined ? defaultBase : baseUrl}/v1/${endpoint}`)
          assert.deepStrictEqual(config, defaultConfig)
          return result()
        }
        const client = new Client(apiKey, { baseUrl, fetcher })
        if (outcome === 'response') assert.strictEqual(await client[method](args()), errorResponse)
        if (outcome === 'reject') await assert.rejects(client[method](args()), actual => actual === error)
        if (outcome === 'throw') assert.throws(() => client[method](args()), actual => actual === error)
        assert.strictEqual(calls, 1)
        requests++
      }
    }

    let calls = 0
    const client = new Client(apiKey, { baseUrl, fetcher: () => { calls++; throw new Error('Must not fetch') } })
    for (const method of ['getMetadata', 'getQuotes']) {
      for (const args of [undefined, {}]) {
        assert.throws(() => client[method](args), { message: 'Either ID or symbol is required to be passed in.' })
      }
      assert.throws(() => client[method]({ id: 1, symbol: 'BTC' }), { message: 'ID and symbol cannot be passed in at the same time.' })
    }
    assert.throws(() => client.getTickers({ start: 1, limit: 0 }), { message: 'Start and limit = 0 cannot be passed in at the same time.' })
    assert.strictEqual(calls, 0)
  }

  // Different clients must not leak their selected host or version to one another.
  const urls = []
  const fetcher = async url => { urls.push(url); return { json: () => ({}) } }
  const custom = new Client(apiKey, { baseUrl: 'http://127.0.0.1:3000', version: 'v2', fetcher })
  const standard = new Client(apiKey, { fetcher })
  await custom.getIdMap()
  await standard.getIdMap()
  await custom.getGlobal()
  await standard.getGlobal()
  assert.deepStrictEqual(urls, [
    'http://127.0.0.1:3000/v2/cryptocurrency/map?',
    `${defaultBase}/v1/cryptocurrency/map?`,
    'http://127.0.0.1:3000/v2/global-metrics/quotes/latest',
    `${defaultBase}/v1/global-metrics/quotes/latest`
  ])
  console.log(`${label}: all six methods passed ${requests} URL/config/response/error cases, constructor defaults, validation and client isolation`)
}

function packedClient () {
  const npmCli = process.env.npm_execpath && path.basename(process.env.npm_execpath) === 'npm-cli.js'
    ? process.env.npm_execpath
    : undefined
  const output = execFileSync(npmCli ? process.execPath : 'npm',
    [...(npmCli ? [npmCli] : []), 'pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
    { cwd: root, encoding: 'utf8' })
  const packages = JSON.parse(output)
  assert.strictEqual(packages.length, 1)
  const contents = zlib.gunzipSync(fs.readFileSync(path.join(temporary, packages[0].filename)))
  const required = new Set(['package/package.json', 'package/index.js', 'package/index.d.ts'])
  const destination = path.join(temporary, 'node_modules/coinmarketcap-api')
  fs.mkdirSync(destination, { recursive: true })
  // Extract only known regular files, never paths supplied by the archive.
  for (let offset = 0; offset + 512 <= contents.length;) {
    const header = contents.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, '')
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, '').trim(), 8) || 0
    if (required.has(name)) {
      assert.ok(header[156] === 0 || header[156] === 48, `Expected a regular file: ${name}`)
      const filename = path.basename(name)
      const bytes = contents.subarray(offset + 512, offset + 512 + size)
      assert.deepStrictEqual(bytes, fs.readFileSync(path.join(root, filename)))
      fs.writeFileSync(path.join(destination, filename), bytes)
      required.delete(name)
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  assert.deepStrictEqual(Array.from(required), [], 'The tarball must include the runtime, declaration and manifest')
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'), 'utf8'))
  assert.strictEqual(manifest.main, 'index.js')
  assert.strictEqual(manifest.types, 'index.d.ts')
  // Reuse installed dependencies without fetching or installing anything for the consumer.
  for (const dependency of Object.keys(manifest.dependencies)) {
    fs.symlinkSync(path.dirname(require.resolve(`${dependency}/package.json`)), path.join(temporary, 'node_modules', dependency), 'junction')
  }
  return require(destination)
}

async function main () {
  try {
    await checkClient(require('./'), 'Source')
    await checkClient(packedClient(), 'Packed')
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
