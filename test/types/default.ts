import CoinMarketCap from 'coinmarketcap-api'

const client = new CoinMarketCap('test-api-key', {
  fetcher: async () => ({ json: async () => ({ status: { error_code: 1001 } }) })
})
const result: Promise<unknown> = client.getQuotes({ id: [1, 2] })
const options: CoinMarketCap.FiatMapOptions = { includeMetals: true }
client.getFiatMap(options)
void result
