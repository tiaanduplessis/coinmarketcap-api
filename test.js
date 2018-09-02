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

test('should get ID map', async () => {
  const client = new CoinMarketCap(API_KEY)
  const map = await client.getIdMap({ symbol: ['BTC', 'ETH'] })

  expect(typeof map).toBe('object')
  expect(map).toContainAllKeys(['data', 'status'])
  expect(map).toHaveProperty('status.timestamp')
  expect(map).toHaveProperty('status.error_code')
  expect(Array.isArray(map.data)).toBeTruthy()
  for (let info of map.data) {
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
  for (let key of Object.keys(quotes.data)) {
    let info = quotes.data[key]
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

test('should get metadata', async () => {
  const client = new CoinMarketCap(API_KEY)
  const metadata = await client.getMetadata({ symbol: ['BTC', 'ETH'] })

  expect(typeof metadata).toBe('object')
  expect(metadata).toContainAllKeys(['data', 'status'])
  expect(metadata).toHaveProperty('status.timestamp')
  expect(metadata).toHaveProperty('status.error_code')
  expect(typeof metadata.data).toBe('object')
  for (let key of Object.keys(metadata.data)) {
    let info = metadata.data[key]
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
      'twitter', 'reddit',
      'message_board',
      'announcement',
      'chat',
      'explorer',
      'source_code'
    ])
  }
})

// test('should get Bitcoin ticker from currency symbol', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const ticker = await client.getTickers({currency: 'BTC'})

//   expect(typeof ticker).toBe('object')
//   expect(ticker.data.id).toBe(1)
//   expect(ticker.data.name).toMatch('Bitcoin')
//   expect(ticker.data.symbol).toMatch('BTC')
// })

// test('should get Bitcoin ticker from its listings ID', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const ticker = await client.getTicker({ id: 1 })

//   expect(typeof ticker).toBe('object')
//   expect(ticker.data.id).toBe(1)
//   expect(ticker.data.name).toMatch('Bitcoin')
//   expect(ticker.data.symbol).toMatch('BTC')
// })

// test('should get tickers sorted by ID', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const ticker = await client.getTicker({sort: 'id'})

//   let data = Object.values(ticker.data)
//   for (let i = 1; i < data.length; i++) {
//     expect(data[i].id).toBeGreaterThan(data[i - 1].id)
//   }
// })

// test('should return main data field as an array', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const ticker = await client.getTicker({structure: 'array'})

//   expect(Array.isArray(ticker.data)).toBeTruthy()
// })

// test('should result in errors due to wrong parameter usage', async () => {
//   const client = new CoinMarketCap(API_KEY)

//   try {
//     await client.getTicker({currency: 'BTC', id: 1})
//   } catch (e) {
//     expect(e.toString()).toMatch('Error: Currency and ID cannot be passed in at the same time.')
//   }

//   try {
//     await client.getTicker({start: 1, currency: 'ETH'})
//   } catch (e) {
//     expect(e.toString()).toMatch('Error: Start, limit, and sort options can only be used when currency or ID is not given.')
//   }
// })

// test('should get latest listings', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const listings = await client.getListings()

//   expect(typeof listings).toBe('object')
//   expect(Array.isArray(listings.data)).toBe(true)
// })

// test('should result in error if limit = 0 and start specified', async () => {
//   const client = new CoinMarketCap(API_KEY)

//   try {
//     await client.getTicker({start: 1, limit: 0})
//   } catch (e) {
//     expect(e.toString()).toMatch('Error: Start and limit = 0 cannot be passed in at the same time.')
//   }
// })

// test('should return data field as an array if specified structure as an array', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const ticker = await client.getTicker({structure: 'array'})

//   expect(ticker.data).toBeArray()
// })

// test('should return all tickers', async () => {
//   const client = new CoinMarketCap(API_KEY)
//   const totalActiveCryptocurrencies = await client.getGlobal().then(res => res.data['active_cryptocurrencies'])
//   const allTickers1 = await client.getTicker({limit: '0'}).then(res => Object.keys(res.data).length)
//   const allTickers2 = await client.getTicker({limit: '0', structure: 'array'}).then(res => res.data.length)

//   expect(allTickers1).toBe(totalActiveCryptocurrencies)
//   expect(allTickers2).toBe(totalActiveCryptocurrencies)
// })
