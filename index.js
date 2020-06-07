'use strict'

const fetch = require('node-fetch')
const qs = require('qs')

const BASE_URL = 'https://pro-api.coinmarketcap.com'

class CoinMarketCap {
  /**
   *
   * @param {String} apiKey API key for accessing the CoinMarketCap API
   * @param {Object=} Options Options for the CoinMarketCap instance
   * @param {String=} options.version  Version of API. Defaults to 'v2'
   * @param {Function=} options.fetcher fetch function to use. Defaults to node-fetch
   * @param {Object=} options.config = Configuration for fetch request
   *
   */
  constructor (apiKey, { version = 'v1', fetcher = fetch, config = {} } = {}) {
    this.apiKey = apiKey
    this.config = Object.assign({}, {
      method: 'GET',
      headers: {
        'X-CMC_PRO_API_KEY': this.apiKey,
        Accept: 'application/json',
        'Accept-Charset': 'utf-8',
        'Accept-Encoding': 'deflate, gzip'
      }
    }, config)

    this.fetcher = fetcher
    this.url = `${BASE_URL}/${version}`
  }

  /**
   * Get a paginated list of all cryptocurrencies by CoinMarketCap ID.
   *
   * @param {Object=} options Options for the request:
   * @param {String=} [options.listingStatus="active"] active or inactive coins
   * @param {Number|String=} [options.start=1] Return results from rank start and above
   * @param {Number|String=} options.limit Only returns limit number of results
   * @param {String[]|String=} options.symbol Comma separated list of symbols, will ignore the other options
   * @param {String=} [options.sort="id"] Sort results by the options at https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyMap
   *
   * @example
   * const client = new CoinMarketCap('api key')
   * client.getIdMap().then(console.log).catch(console.error)
   * client.getIdMap({listingStatus: 'inactive', limit: 10}).then(console.log).catch(console.error)
   * client.getIdMap({symbol: 'BTC,ETH'}).then(console.log).catch(console.error)
   * client.getIdMap({symbol: ['BTC', 'ETH']}).then(console.log).catch(console.error)
   * client.getIdMap({sort: 'cmc_rank'}).then(console.log).catch(console.error)
   */
  getIdMap (args = {}) {
    let { listingStatus, start, limit, symbol, sort } = args

    if (symbol instanceof Array) {
      symbol = symbol.join(',')
    }

    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/cryptocurrency/map`,
      config: this.config,
      query: { listing_status: listingStatus, start, limit, symbol, sort }
    })
  }

  /**
   * Get static metadata for one or more cryptocurrencies.
   * Either id or symbol is required, but passing in both is not allowed.
   *
   * @param {Object=} options Options for the request:
   * @param {Array|String|Number=} options.id One or more comma separated cryptocurrency IDs
   * @param {String[]|String} options.symbol One or more comma separated cryptocurrency symbols
   *
   * @example
   * const client = new CoinMarketCap('api key')
   * client.getMetadata({id: '1'}).then(console.log).catch(console.error)
   * client.getMetadata({id: [1, 2]}).then(console.log).catch(console.error)
   * client.getMetadata({symbol: 'BTC,ETH'}).then(console.log).catch(console.error)
   * client.getMetadata({symbol: ['BTC', 'ETH']}).then(console.log).catch(console.error)
   */
  getMetadata (args = {}) {
    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/cryptocurrency/info`,
      config: this.config,
      query: sanitizeIdAndSymbol(args.id, args.symbol)
    })
  }

  /**
   * Get information on all tickers.
   * Start and limit options can only be used when currency or ID is not given.
   * Currency and ID cannot be passed in at the same time.
   *
   * @param {Object=} options Options for the request
   * @param {Number|String=} [options.start=1] Return results from rank start and above
   * @param {Number|String=} [options.limit=100] Only returns limit number of results [1..5000]
   * @param {String[]|String=} [options.convert="USD"] Return info in terms of another currency
   * @param {String=} [options.sort="market_cap"] Sort results by the options at https://pro.coinmarketcap.com/api/v1#operation/getV1CryptocurrencyListingsLatest
   * @param {String=} options.sortDir Direction in which to order cryptocurrencies ("asc" | "desc")
   * @param {String=} [options.cryptocurrencyType="all"] Type of cryptocurrency to include ("all" | "coins" | "tokens")
   *
   * @example
   * const client = new CoinMarketCap('api key')
   * client.getTickers({limit: 3}).then(console.log).catch(console.error)
   * client.getTickers({convert: 'EUR'}).then(console.log).catch(console.error)
   * client.getTickers({start: 0, limit: 5}).then(console.log).catch(console.error)
   * client.getTickers({sort: 'name'}).then(console.log).catch(console.error)
   */
  getTickers (args = {}) {
    let { start, limit, convert, sort, sortDir, cryptocurrencyType } = args

    // eslint-disable-next-line
    if (start && (limit == 0)) {
      throw new Error('Start and limit = 0 cannot be passed in at the same time.')
    }

    // eslint-disable-next-line
    if (limit == 0) {
      limit = 5000
    }

    if (convert && convert instanceof Array) {
      convert = convert.join(',')
    }

    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/cryptocurrency/listings/latest`,
      config: this.config,
      query: { start, limit, convert, sort, sort_dir: sortDir, cryptocurrency_type: cryptocurrencyType }
    })
  }

  /**
   * Get latest market quote for 1 or more cryptocurrencies.
   *
   * @param {Object=} options Options for the request:
   * @param {Array|String|Number=} options.id One or more comma separated cryptocurrency IDs
   * @param {String[]|String=} options.symbol One or more comma separated cryptocurrency symbols
   * @param {String[]|String=} [options.convert="USD"] Return quotes in terms of another currency
   *
   * @example
   * const client = new CoinMarketCap('api key')
   * client.getQuotes({id: '1'}).then(console.log).catch(console.error)
   * client.getQuotes({id: [1, 2], convert: 'USD,EUR'}).then(console.log).catch(console.error)
   * client.getQuotes({symbol: 'BTC,ETH'}).then(console.log).catch(console.error)
   * client.getQuotes({symbol: ['BTC', 'ETH']}).then(console.log).catch(console.error)
   */
  getQuotes (args = {}) {
    let convert = args.convert
    const { id, symbol } = sanitizeIdAndSymbol(args.id, args.symbol)

    if (convert instanceof Array) {
      convert = convert.join(',')
    }

    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/cryptocurrency/quotes/latest`,
      config: this.config,
      query: { id, symbol, convert }
    })
  }

  /**
   * Get global information
   *
   * @param {Object|String[]|String=} options Options for the request:
   * @param {String[]|String=} [options.convert="USD"] Return quotes in terms of another currency
   *
   * @example
   * const client = new CoinMarketCap()
   * client.getGlobal('GBP').then(console.log).catch(console.error)
   * client.getGlobal({convert: 'GBP'}).then(console.log).catch(console.error)
   */
  getGlobal (convert) {
    if (typeof convert === 'string') {
      convert = { convert: convert.toUpperCase() }
    }

    if (convert instanceof Array) {
      convert = { convert: convert.map(currency => currency.toUpperCase()) }
    }

    if (convert && convert.convert instanceof Array) {
      convert.convert = convert.convert.join(',')
    }

    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/global-metrics/quotes/latest`,
      config: this.config,
      query: convert
    })
  }
}

const sanitizeIdAndSymbol = (id, symbol) => {
  if (id && symbol) {
    throw new Error('ID and symbol cannot be passed in at the same time.')
  }

  if (!id && !symbol) {
    throw new Error('Either ID or symbol is required to be passed in.')
  }

  if (id instanceof Array) {
    id = id.join(',')
  }

  if (symbol instanceof Array) {
    symbol = symbol.join(',')
  }

  return { id, symbol }
}

const createRequest = (args = {}) => {
  const { url, config, query, fetcher } = args

  return fetcher(`${url}${query ? `?${qs.stringify(query)}` : ''}`, config).then(res =>
    res.json()
  )
}

module.exports = CoinMarketCap
