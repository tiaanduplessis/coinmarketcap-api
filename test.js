require('jest-extended')
require('jest-chain')
const { readFileSync } = require('fs')
const path = require('path')
const CoinMarketCap = require('./')

require('dotenv').config()

const API_KEY = process.env.COINMARKETCAP_API_KEY

describe('API version', () => {
  test.each([undefined, {}, { version: undefined }])('defaults to v1 with options %p', options => {
    const client = new CoinMarketCap('test-api-key', options)

    expect(client.url).toBe('https://pro-api.coinmarketcap.com/v1')
  })

  test.each([undefined, 'v2'])('uses the selected version %p for requests', async version => {
    const response = { data: [] }
    const fetcher = jest.fn().mockResolvedValue({ json: () => Promise.resolve(response) })
    const client = new CoinMarketCap('test-api-key', { version, fetcher })

    expect(await client.getIdMap({ symbol: 'BTC' })).toBe(response)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(
      `https://pro-api.coinmarketcap.com/${version || 'v1'}/cryptocurrency/map?symbol=BTC`,
      client.config
    )
  })

  test.each([
    ['index.js', /@param[^\n]*options\.version[^\n]*Defaults to '([^']+)'/],
    ['README.md', /`[Oo]ptions\.version`[^\n]*default `'([^']+)'`/],
    ['docs/index.html', /[Oo]ptions\.version<\/span>[\s\S]*?default <code>&#39;([^&]+)&#39;<\/code>/]
  ])('documents the runtime default in %s', (file, pattern) => {
    const contents = readFileSync(path.join(__dirname, file), 'utf8')
    const documentedVersion = contents.match(pattern)
    const client = new CoinMarketCap('test-api-key')

    expect(documentedVersion).not.toBeNull()
    expect(client.url).toBe(`https://pro-api.coinmarketcap.com/${documentedVersion[1]}`)
  })
})

describe('getFiatMap', () => {
  test.each([
    [undefined, ''],
    [{}, ''],
    [{ start: 2, limit: 10, sort: 'name', includeMetals: true }, 'start=2&limit=10&sort=name&include_metals=true'],
    [{ start: '2', limit: '10', sort: 'id' }, 'start=2&limit=10&sort=id'],
    [{ includeMetals: false }, 'include_metals=false'],
    [{ start: undefined, limit: undefined, sort: undefined, includeMetals: undefined }, ''],
    [{ symbol: 'USD', id: 2781, include_metals: true, listingStatus: 'active' }, '']
  ])('serializes supported options %p', async (options, query) => {
    const response = {
      data: [{ id: 2781, name: 'United States Dollar', sign: '$', symbol: 'USD' }],
      status: { error_code: 0 }
    }
    const json = jest.fn().mockResolvedValue(response)
    const fetcher = jest.fn().mockResolvedValue({ json })
    const client = new CoinMarketCap('test-api-key', { fetcher })

    expect(await client.getFiatMap(options)).toBe(response)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(
      `https://pro-api.coinmarketcap.com/v1/fiat/map?${query}`,
      client.config
    )
    expect(client.config.method).toBe('GET')
    expect(client.config.headers['X-CMC_PRO_API_KEY']).toBe('test-api-key')
    expect(json).toHaveBeenCalledTimes(1)
  })

  test('preserves the selected version, request configuration and caller options', async () => {
    const fetcher = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ data: [] }) })
    const config = { timeout: 1000 }
    const options = Object.freeze({ start: 1, limit: 5, sort: 'name', includeMetals: false })
    const client = new CoinMarketCap('test-api-key', { version: 'v2', fetcher, config })

    await client.getFiatMap(options)

    expect(fetcher).toHaveBeenCalledWith(
      'https://pro-api.coinmarketcap.com/v2/fiat/map?start=1&limit=5&sort=name&include_metals=false',
      client.config
    )
    expect(client.config.timeout).toBe(1000)
    expect(options).toEqual({ start: 1, limit: 5, sort: 'name', includeMetals: false })
    expect(config).toEqual({ timeout: 1000 })
  })

  test('returns API error responses unchanged', async () => {
    const response = { status: { error_code: 1001, error_message: 'Invalid API key' } }
    const fetcher = jest.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(response) })
    const client = new CoinMarketCap('test-api-key', { fetcher })

    expect(await client.getFiatMap()).toBe(response)
  })

  test('propagates fetch failures', async () => {
    const error = new Error('Request failed')
    const fetcher = jest.fn().mockRejectedValue(error)
    const client = new CoinMarketCap('test-api-key', { fetcher })

    await expect(client.getFiatMap()).rejects.toBe(error)
  })

  test('propagates JSON parsing failures', async () => {
    const error = new SyntaxError('Invalid JSON')
    const fetcher = jest.fn().mockResolvedValue({ json: () => Promise.reject(error) })
    const client = new CoinMarketCap('test-api-key', { fetcher })

    await expect(client.getFiatMap()).rejects.toBe(error)
  })
})

test('should be defined', () => {
  expect(CoinMarketCap).toBeDefined()
})

test('should return new CoinMarketCap client', () => {
  const client = new CoinMarketCap(API_KEY)
  expect(client.getTickers).toBeDefined()
  expect(client.getGlobal).toBeDefined()
  expect(client.getQuotes).toBeDefined()
  expect(client.getIdMap).toBeDefined()
  expect(client.getFiatMap).toBeDefined()
  expect(client.getMetadata).toBeDefined()
})

test('getTickers should have correct response structure and type', async () => {
  const client = new CoinMarketCap(API_KEY)
  const ticker = await client.getTickers()
  expect(ticker).toContainAllKeys(['data', 'status'])
  expect(ticker).toHaveProperty('status.timestamp')
  expect(ticker).toHaveProperty('status.credit_count')
  expect(ticker).toHaveProperty('status.error_code')
  expect(ticker.data).toBeArray()
  expect(ticker.status.timestamp).toBeString()
})

test('should get latest tickers', async () => {
  const client = new CoinMarketCap(API_KEY)
  const ticker1 = await client.getTickers()
  const ticker2 = await client.getTickers({ limit: 10 })

  expect(typeof ticker1).toBe('object')
  expect(typeof ticker2).toBe('object')
  expect(Object.keys(ticker2.data).length).toBe(10)
})

test('limit = 0 returns 5000 tickers', async () => {
  const client = new CoinMarketCap(API_KEY)
  const ticker = await client.getTickers({ limit: 0 })

  expect(Object.keys(ticker.data).length).toBeGreaterThan(0)
})

test('can pass in an array of currencies to convert for getTickers', async () => {
  const client = new CoinMarketCap(API_KEY)
  const ticker = await client.getTickers({ convert: ['USD'] })

  ticker.data.forEach(coin => expect(coin.quote).toContainAllKeys(['USD']))
})

test('passing in start and limit = 0 is not allowed in getTickers', async () => {
  const client = new CoinMarketCap(API_KEY)
  expect(() => client.getTickers({ start: 2, limit: 0 })).toThrow(Error)
})

test('should get latest global', async () => {
  const client = new CoinMarketCap(API_KEY)
  const global = await client.getGlobal()

  expect(typeof global).toBe('object')
  expect(global).toContainAllKeys(['data', 'status'])
  expect(global).toHaveProperty('status.timestamp')
  expect(global).toHaveProperty('status.error_code')
  expect(global).toHaveProperty('data.active_cryptocurrencies')
  expect(global).toHaveProperty('data.quote')
  expect(global).toHaveProperty('data.active_market_pairs')
})

test('can pass in currencies in various ways to getGlobal', async () => {
  const client = new CoinMarketCap(API_KEY)
  const global1 = await client.getGlobal('gbp')
  const global2 = await client.getGlobal(['gbp'])
  const global3 = await client.getGlobal({ convert: 'gbp' })
  const global4 = await client.getGlobal({ convert: ['gbp'] })

  expect(global1.data.quote).toHaveProperty('GBP')
  expect(global2.data.quote).toHaveProperty('GBP')
  expect(global3.data.quote).toHaveProperty('GBP')
  expect(global4.data.quote).toHaveProperty('GBP')
})

test('should get ID map', async () => {
  const client = new CoinMarketCap(API_KEY)
  const map = await client.getIdMap({ symbol: ['BTC', 'ETH'] })

  expect(typeof map).toBe('object')
  expect(map).toContainAllKeys(['data', 'status'])
  expect(map).toHaveProperty('status.timestamp')
  expect(map).toHaveProperty('status.error_code')
  expect(Array.isArray(map.data)).toBeTruthy()
  for (const info of map.data) {
    expect(typeof info).toBe('object')
    expect(info).toHaveProperty('id')
    expect(info).toHaveProperty('name')
    expect(info).toHaveProperty('symbol')
  }
})

test('should get quotes', async () => {
  const client = new CoinMarketCap(API_KEY)
  const quotes = await client.getQuotes({ symbol: ['BTC', 'ETH'] })

  expect(typeof quotes).toBe('object')
  expect(quotes).toContainAllKeys(['data', 'status'])
  expect(quotes).toHaveProperty('status.timestamp')
  expect(quotes).toHaveProperty('status.error_code')
  expect(typeof quotes.data).toBe('object')
  for (const key of Object.keys(quotes.data)) {
    const info = quotes.data[key]
    expect(typeof info).toBe('object')
    expect(info).toHaveProperty('id')
    expect(info).toHaveProperty('name')
    expect(info).toHaveProperty('symbol')
    expect(key).toEqual(info.symbol)
    expect(info).toHaveProperty('circulating_supply')
    expect(info).toHaveProperty('total_supply')
    expect(info).toHaveProperty('max_supply')
    expect(info).toHaveProperty('cmc_rank')
    expect(info).toHaveProperty('quote')
    expect(info.quote).toHaveProperty('USD')
    expect(info.quote.USD).toHaveProperty('price')
    expect(info.quote.USD).toHaveProperty('volume_24h')
    expect(info.quote.USD).toHaveProperty('percent_change_1h')
    expect(info.quote.USD).toHaveProperty('percent_change_24h')
    expect(info.quote.USD).toHaveProperty('percent_change_7d')
    expect(info.quote.USD).toHaveProperty('market_cap')
    expect(info.quote.USD).toHaveProperty('last_updated')
  }
})

test('can pass in an array of currencies to convert for getQuotes', async () => {
  const client = new CoinMarketCap(API_KEY)
  const quotes = await client.getQuotes({ id: [1, 2], convert: ['USD'] })

  Object.values(quotes.data).forEach(coin => expect(coin.quote).toContainAllKeys(['USD']))
})

test('can pass in an array of IDs to id for getQuotes', async () => {
  const client = new CoinMarketCap(API_KEY)
  const quotes = await client.getQuotes({ id: [1, 2] })

  expect(quotes.data).toContainAllKeys(['1', '2'])
})

test('must pass in id or symbol to getQuotes', async () => {
  const client = new CoinMarketCap(API_KEY)
  expect(() => client.getQuotes()).toThrow(Error)
})

test('cannot pass in both id and symbol to getQuotes', async () => {
  const client = new CoinMarketCap(API_KEY)
  expect(() => client.getQuotes({ id: 2, symbol: 'BTC' })).toThrow(Error)
})

test('should get metadata', async () => {
  const client = new CoinMarketCap(API_KEY)
  const metadata = await client.getMetadata({ symbol: ['BTC', 'ETH'] })

  expect(typeof metadata).toBe('object')
  expect(metadata).toContainAllKeys(['data', 'status'])
  expect(metadata).toHaveProperty('status.timestamp')
  expect(metadata).toHaveProperty('status.error_code')
  expect(typeof metadata.data).toBe('object')
  for (const key of Object.keys(metadata.data)) {
    const info = metadata.data[key]
    expect(typeof info).toBe('object')
    expect(info).toHaveProperty('id')
    expect(info).toHaveProperty('name')
    expect(info).toHaveProperty('symbol')
    expect(key).toEqual(info.symbol)
    expect(info).toHaveProperty('logo')
    expect(info).toHaveProperty('category')
    expect(info).toHaveProperty('urls')
    expect(info.urls).toContainAllKeys([
      'website',
      'technical_doc',
      'twitter',
      'reddit',
      'message_board',
      'announcement',
      'chat',
      'explorer',
      'source_code'
    ])
  }
})
