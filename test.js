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

test(`should get latest listings`, async () => {
  const client = new CoinMarketCap()
  const listings = await client.getListings()

  expect(typeof listings).toBe('object')
  expect(Array.isArray(listings.data)).toBe(true)
})

