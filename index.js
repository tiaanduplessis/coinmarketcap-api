'use strict'

const fetch = require('node-fetch')
const qs = require('qs')

const BASE_URL = 'https://api.coinmarketcap.com'

class CoinMarketCap {
  constructor ({ version = 'v2', fetcher = fetch } = {}) {
    this.headers = {
      Accept: 'application/json',
      'Accept-Charset': 'utf-8'
    }
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
      headers: this.headers
    })
  }

  /**
   * Get ticker information.
   * Start and limit options can only be used when currency or ID is not given.
   * Currency and ID cannot be passed in at the same time.
   *
   * @param {Object=} options Options for the request:
   * @param {Int=} options.start  Return results from rank start + 1 and above
   * @param {Int=} options.limit  Only returns limit number of results
   * @param {String=} options.convert  Return price, 24h volume, and market cap in terms of another currency
   * @param {String=} options.currency  Return only specific currency
   * @param {Int=} options.id Return only specific currency associated with its ID from listings
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
    let { start, limit, convert, currency, id } = args

    if ((currency || id) && (start || limit)) {
      throw new Error(
        'Start and limit options can only be used when currency or ID is not given.'
      )
    }
    if (currency && id) {
      throw new Error('Currency and ID cannot be passed in at the same time.')
    }

    if (currency) {
      let listings = await this.getListings()
      id = listings.data.find(
        listing => listing.symbol === currency.toUpperCase()
      ).id
    }

    return createRequest({
      url: `${this.url}/ticker/${id ? `${id}/` : ''}`,
      headers: this.headers,
      query: { start, convert, limit }
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
      headers: this.headers,
      query: convert
    })
  }
}

const createRequest = (args = {}) => {
  const { url, headers, query, fetcher } = args
  const opts = {
    headers,
    method: 'GET'
  }

  return fetch(`${url}${query ? `?${qs.stringify(query)}` : ''}`).then(res =>
    res.json()
  )
}

module.exports = CoinMarketCap
