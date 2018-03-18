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
  const ticker1 = await client.getTicker()
  const ticker2 = await client.getTicker({limit: 10})

  expect(typeof ticker1).toBe('object')
  expect(typeof ticker2).toBe('object')
  expect(ticker2.length).toBe(10)
})

test('should get latest global', async () => {
  const client = new CoinMarketCap()
  const global = await client.getGlobal()

  expect(typeof global).toBe('object')
})

