const CoinMarketCap = require('./')

test('should be defined', () => {
  expect(CoinMarketCap).toBeDefined()
})

test('should return new CoinMarketCap client', () => {
  const client = new CoinMarketCap()
  expect(client.getTicker).toBeDefined()
  expect(client.getGlobal).toBeDefined()
})

test('should get latest ticker', async () => {
  const client = new CoinMarketCap()
  const ticker = await client.getTicker({limit: 10})

  expect(typeof ticker).toBe('object')
  expect(ticker.length).toBe(10)
})

test('should get latest global', async () => {
  const client = new CoinMarketCap()
  const global = await client.getGlobal()

  expect(typeof global).toBe('object')
})

