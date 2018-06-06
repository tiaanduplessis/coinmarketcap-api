'use strict'

const fetch = require('node-fetch')
const qs = require('qs')

const BASE_URL = 'https://api.coinmarketcap.com'

class CoinMarketCap {
  /**
   *
   * @param {Object=} Options Options for the CoinMarketCap instance
   * @param {String=} options.version  Version of API. Defaults to 'v2'
   * @param {Function=} options.fetcher fetch function to use. Defaults to node-fetch
   * @param {Object=} options.config = Configuration for fetch request
   *
   */
  constructor ({ version = 'v2', fetcher = fetch, config = {} } = {}) {
    this.config = Object.assign({}, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Charset': 'utf-8'
      }
    }, config)

    this.fetcher = fetcher
    this.url = `${BASE_URL}/${version}`
  }

  /**
   * Get all active cryptocurrency listings
   *
   * @example
   * const client = new CoinMarketCap()
   * client.getListings().then(console.log).catch(console.error)
   */
  getListings () {
    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/listings`,
      config: this.config
    })
  }

  /**
   * Get ticker information.
   * Start and limit options can only be used when currency or ID is not given.
   * Currency and ID cannot be passed in at the same time.
   *
   * @param {Object=} options Options for the request:
   * @param {Number|String=} options.start  Return results from rank start and above
   * @param {Number|String=} options.limit  Only returns limit number of results
   * @param {String=} options.sort Sort results by id, rank, volume_24h, or percent_change_24h (default is rank)
   * @param {String=} options.structure Specify the structure for the main data field. Possible values are dictionary and array (default is dictionary).
   * @param {String=} options.convert  Return price, 24h volume, and market cap in terms of another currency
   * @param {String=} options.currency  Return only specific currency
   * @param {Number=} options.id Return only specific currency associated with its ID from listings
   *
   * @example
   * const client = new CoinMarketCap()
   * client.getTicker({limit: 3}).then(console.log).catch(console.error)
   * client.getTicker({convert: 'EUR'}).then(console.log).catch(console.error)
   * client.getTicker({start: 0, limit: 5}).then(console.log).catch(console.error)
   * client.getTicker({currency: 'BTC'}).then(console.log).catch(console.error)
   * client.getTicker({convert: 'JPY', id: 2}).then(console.log).catch(console.error)
   */
  async getTicker (args = {}) {
    let { start, limit, convert, currency, id, structure, sort } = args

    if ((currency || id) && (start || limit || sort)) {
      throw new Error(
        'Start, limit, and sort options can only be used when currency or ID is not given.'
      )
    }
    if (currency && id) {
      throw new Error('Currency and ID cannot be passed in at the same time.')
    }

    // eslint-disable-next-line
    if (start && (limit == 0)) {
      throw new Error('Start and limit = 0 cannot be passed in at the same time.')
    }

    if (currency) {
      let listings = await this.getListings()
      id = listings.data.find(
        listing => listing.symbol === currency.toUpperCase()
      ).id
    }

    // eslint-disable-next-line
    if (limit == 0) {
      const promises = []
      const totalCrypto = await this.getTotalActiveCryptocurrencies()
      const maxLimit = 100

      for (let start = 1; start <= totalCrypto; start += maxLimit) {
        promises.push(createRequest({
          fetcher: this.fetcher,
          url: `${this.url}/ticker/`,
          config: this.config,
          query: { start, structure, convert }
        }))
      }

      return Promise.all(promises).then(tickers => {
        let allTickers
        let metadata

        structure ? allTickers = [] : allTickers = {}

        tickers.forEach(ticker => {
          const tickerData = ticker.data
          metadata = ticker.metadata

          if (structure && Array.isArray(tickerData)) {
            tickerData.forEach(ticker => {
              allTickers.push(ticker)
            })
          } else {
            for (const key in tickerData) {
              allTickers[tickerData[key].id] = tickerData[key]
            }
          }
        })

        return {
          data: allTickers,
          metadata
        }
      })
    }

    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/ticker/${id ? `${id}/` : ''}`,
      config: this.config,
      query: { start, convert, limit, structure, sort }
    })
  }

  /**
   * Get global information
   *
   * @param {Object|String=} options  Options for the request
   * @param {String=} options.convert  Return price, 24h volume, and market cap in terms of another currency
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

    return createRequest({
      fetcher: this.fetcher,
      url: `${this.url}/global`,
      config: this.config,
      query: convert
    })
  }

  getTotalActiveCryptocurrencies () {
    return this.getGlobal().then(res => res.data.active_cryptocurrencies)
  }
}

const createRequest = (args = {}) => {
  const { url, config, query, fetcher } = args

  return fetcher(`${url}${query ? `?${qs.stringify(query)}` : ''}`, config).then(res =>
    res.json()
  )
}

module.exports = CoinMarketCap
