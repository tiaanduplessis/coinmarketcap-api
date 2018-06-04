require('jest-extended')
require('jest-chain')
const CoinMarketCap = require('./')

test('should be defined', () => {
  expect(CoinMarketCap).toBeDefined()
})

test('should return new CoinMarketCap client', () => {
  const client = new CoinMarketCap()
  expect(client.getTicker).toBeDefined()
  expect(client.getGlobal).toBeDefined()
  expect(client.getListings).toBeDefined()
})

test('getTicker should have correct response structure and type', async () => {
  const client = new CoinMarketCap()
  const ticker = await client.getTicker()

  expect(ticker).toContainAllKeys(['data', 'metadata'])
  expect(ticker).toHaveProperty('metadata.timestamp')
  expect(ticker).toHaveProperty('metadata.num_cryptocurrencies')
  expect(ticker).toHaveProperty('metadata.error')
  expect(ticker.data).toBeObject().not.toBeArray()
  expect(ticker.metadata.timestamp).toBeNumber()
  expect(ticker.metadata['num_cryptocurrencies']).toBeNumber()
})

test('should get latest ticker', async () => {
  const client = new CoinMarketCap()
  const ticker1 = await client.getTicker()
  const ticker2 = await client.getTicker({limit: 10})

  expect(typeof ticker1).toBe('object')
  expect(typeof ticker2).toBe('object')
  expect(Object.keys(ticker2.data).length).toBe(10)
})

test('should get Bitcoin ticker from currency symbol', async () => {
  const client = new CoinMarketCap()
  const ticker = await client.getTicker({currency: 'BTC'})

  expect(typeof ticker).toBe('object')
  expect(ticker.data.id).toBe(1)
  expect(ticker.data.name).toMatch('Bitcoin')
  expect(ticker.data.symbol).toMatch('BTC')
})

test('should get Bitcoin ticker from its listings ID', async () => {
  const client = new CoinMarketCap()
  const ticker = await client.getTicker({ id: 1 })

  expect(typeof ticker).toBe('object')
  expect(ticker.data.id).toBe(1)
  expect(ticker.data.name).toMatch('Bitcoin')
  expect(ticker.data.symbol).toMatch('BTC')
})

test('shoud return main data field as an array', async () => {
  const client = new CoinMarketCap()
  const ticker = await client.getTicker({structure: 'array'})

  expect(Array.isArray(ticker.data)).toBeTruthy()
})

test('should result in errors due to wrong parameter usage', async () => {
  const client = new CoinMarketCap()

  try {
    await client.getTicker({currency: 'BTC', id: 1})
  } catch (e) {
    expect(e.toString()).toMatch('Error: Currency and ID cannot be passed in at the same time.')
  }

  try {
    await client.getTicker({start: 1, currency: 'ETH'})
  } catch (e) {
    expect(e.toString()).toMatch('Error: Start and limit options can only be used when currency or ID is not given.')
  }
})

test('should get latest global', async () => {
  const client = new CoinMarketCap()
  const global = await client.getGlobal()

  expect(typeof global).toBe('object')
})

test('should get latest listings', async () => {
  const client = new CoinMarketCap()
  const listings = await client.getListings()

  expect(typeof listings).toBe('object')
  expect(Array.isArray(listings.data)).toBe(true)
})

test('should result in error if limit = 0 and start specified', async () => {
  const client = new CoinMarketCap()

  try {
    await client.getTicker({start: 1, limit: 0})
  } catch (e) {
    expect(e.toString()).toMatch('Error: Start and limit = 0 cannot be passed in at the same time.')
  }
})

test('should return data field as an array if specified structure as an array', async () => {
  const client = new CoinMarketCap()
  const ticker = await client.getTicker({structure: 'array'})

  expect(ticker.data).toBeArray()
})

test('should return all tickers', async () => {
  const client = new CoinMarketCap()
  const totalActiveCryptocurrencies = await client.getGlobal().then(res => res.data['active_cryptocurrencies'])
  const allTickers1 = await client.getTicker({limit: 0}).then(res => Object.keys(res.data).length)
  const allTickers2 = await client.getTicker({limit: 0, structure: 'array'}).then(res => res.data.length)
  
  expect(allTickers1).toBe(totalActiveCryptocurrencies)
  expect(allTickers2).toBe(totalActiveCryptocurrencies)
})

