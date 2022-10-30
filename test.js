require('jest-extended')
require('jest-chain')
const CoinMarketCap = require('./')

require('dotenv').config()

const API_KEY = process.env.COINMARKETCAP_API_KEY

test('should be defined', () => {
  expect(CoinMarketCap).toBeDefined()
})

test('should return new CoinMarketCap client', () => {
  const client = new CoinMarketCap(API_KEY)
  expect(client.getTickers).toBeDefined()
  expect(client.getGlobal).toBeDefined()
  expect(client.getQuotes).toBeDefined()
  expect(client.getIdMap).toBeDefined()
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
      'twitter',
      'message_board',
      'chat',
      'facebook',
      'explorer',
      'reddit',
      'technical_doc',
      'source_code',
      'announcement'
    ])
  }
})
