import CoinMarketCap = require('coinmarketcap-api')

const client = new CoinMarketCap('test-api-key')
new CoinMarketCap('test-api-key', {})
new CoinMarketCap('test-api-key', { version: undefined, fetcher: undefined, config: undefined, baseUrl: undefined })
new CoinMarketCap('test-api-key', { baseUrl: 'http://127.0.0.1:3000' })
new CoinMarketCap('test-api-key', { baseUrl: 'https://mock.example.test/proxy', version: 'v2' })
new CoinMarketCap('test-api-key', { version: 'v2' })
new CoinMarketCap('test-api-key', { version: 'custom-version' })

const fetcher: CoinMarketCap.Fetcher = async (url, config) => {
  const requestUrl: string = url
  const requestConfig: object = config
  return { json: () => ({ requestUrl, requestConfig }) }
}
new CoinMarketCap('test-api-key', { fetcher, config: { timeout: 1000 } })

// A structurally compatible fetch implementation needs no global fetch type.
interface CustomConfig { timeout?: number; headers?: { [name: string]: string } }
const config: CustomConfig = { timeout: 1000 }
const customFetch = async (url: string, init?: CustomConfig) => ({
  json: async () => ({ url, init })
})
new CoinMarketCap('test-api-key', { config, fetcher: customFetch })

const apiKey: string = client.apiKey
const url: string = client.url
const instanceFetcher: CoinMarketCap.Fetcher = client.fetcher
const requestOption: unknown = client.config.timeout
client.config.timeout = 1000
client.fetcher = fetcher
client.url = url
client.apiKey = apiKey

const results: Array<Promise<unknown>> = [
  client.getIdMap(), client.getIdMap(undefined), client.getIdMap({}),
  client.getIdMap({ listingStatus: 'active,inactive', start: 1, limit: '10', sort: 'cmc_rank' }),
  client.getIdMap({ symbol: 'BTC,ETH' }), client.getIdMap({ symbol: ['BTC', 'ETH'] }),
  client.getFiatMap(), client.getFiatMap(undefined), client.getFiatMap({}),
  client.getFiatMap({ start: '1', limit: 10, sort: 'name', includeMetals: false }),
  client.getFiatMap({ sort: 'id', includeMetals: true }),
  client.getMetadata({ id: 1 }), client.getMetadata({ id: '1,2' }),
  client.getMetadata({ id: [1, 2] }), client.getMetadata({ id: ['1', '2'] }),
  client.getMetadata({ id: [1, '2'], symbol: undefined }),
  client.getMetadata({ symbol: 'BTC,ETH' }), client.getMetadata({ symbol: ['BTC', 'ETH'] }),
  client.getTickers(), client.getTickers(undefined), client.getTickers({}),
  client.getTickers({ start: '1', limit: 10, convert: ['USD', 'EUR'], sort: 'name', sortDir: 'asc', cryptocurrencyType: 'tokens' }),
  client.getTickers({ limit: 0, convert: 'USD', sortDir: 'desc', cryptocurrencyType: 'coins' }),
  client.getTickers({ cryptocurrencyType: 'all' }),
  client.getQuotes({ id: [1, 2], convert: ['USD', 'EUR'] }),
  client.getQuotes({ id: ['1', '2'], convert: 'USD,EUR' }),
  client.getQuotes({ symbol: ['BTC', 'ETH'] }), client.getQuotes({ symbol: 'BTC' }),
  client.getGlobal(), client.getGlobal(undefined), client.getGlobal({}),
  client.getGlobal('gbp'), client.getGlobal(['gbp', 'eur']),
  client.getGlobal({ convert: 'GBP' }), client.getGlobal({ convert: ['GBP'] })
]

const identifiers: CoinMarketCap.Identifier[] = [{ id: 1 }, { symbol: 'BTC' }]
const quotes: CoinMarketCap.QuoteOptions = { symbol: 'BTC', convert: 'USD' }
const settings: CoinMarketCap.Options = { fetcher }
const map: CoinMarketCap.IdMapOptions = { limit: 10 }
const fiat: CoinMarketCap.FiatMapOptions = { includeMetals: true }
const ticker: CoinMarketCap.TickerOptions = { sortDir: 'desc' }
const global: CoinMarketCap.GlobalOptions = { convert: ['EUR'] }

// Results must be narrowed by the consumer rather than treated as success-only data.
async function readResponse() {
  const result = await client.getIdMap()
  // @ts-expect-error JSON has not been validated by the wrapper.
  result.data
  // @ts-expect-error A method cannot promise an arbitrary consumer-provided schema.
  client.getIdMap<{ data: string[] }>()
  return result
}

// @ts-expect-error API keys are strings.
new CoinMarketCap(123)
// @ts-expect-error Base URLs must be strings.
new CoinMarketCap('test-api-key', { baseUrl: 123 })
// @ts-expect-error null does not select the default base URL.
new CoinMarketCap('test-api-key', { baseUrl: null })
// @ts-expect-error Options are objects, not primitive ID-map arguments.
client.getIdMap('BTC')
// @ts-expect-error Only the wrapper's supported option names are exposed.
client.getIdMap({ listing_status: 'active' })
// @ts-expect-error Fiat options use camelCase.
client.getFiatMap({ include_metals: true })
// @ts-expect-error Metals is a boolean flag.
client.getFiatMap({ includeMetals: 'true' })
// @ts-expect-error Fiat sort accepts id or name.
client.getFiatMap({ sort: 'price' })
// @ts-expect-error Identifiers cannot be omitted.
client.getMetadata()
// @ts-expect-error An empty identifier fails runtime validation.
client.getMetadata({})
// @ts-expect-error id and symbol are mutually exclusive.
client.getMetadata({ id: 1, symbol: 'BTC' })
// @ts-expect-error IDs cannot be booleans.
client.getMetadata({ id: [true] })
// @ts-expect-error The wrapper does not forward slug.
client.getMetadata({ slug: 'bitcoin' })
// @ts-expect-error Identifiers cannot be omitted.
client.getQuotes()
// @ts-expect-error id and symbol are mutually exclusive.
client.getQuotes({ id: [1], symbol: ['BTC'] })
// @ts-expect-error Currency conversion symbols cannot be numbers.
client.getQuotes({ id: 1, convert: [123] })
// @ts-expect-error Unknown ticker options are not forwarded.
client.getTickers({ convert_id: 2781 })
// @ts-expect-error Sort direction accepts asc or desc.
client.getTickers({ sortDir: 'up' })
// @ts-expect-error The shorthand is a string or string array.
client.getGlobal(123)
// @ts-expect-error Fetchers must return a promise with a json method.
new CoinMarketCap('test-api-key', { fetcher: async () => ({}) })
// @ts-expect-error Internal helpers are not public static exports.
CoinMarketCap.createRequest
// @ts-expect-error The declaration must not add ambient implementation globals.
BASE_URL
// @ts-expect-error The declaration must not add ambient implementation globals.
sanitizeIdAndSymbol

void [instanceFetcher, requestOption, results, identifiers, quotes, settings, map, fiat, ticker, global, readResponse]
