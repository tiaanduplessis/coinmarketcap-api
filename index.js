'use strict'

const fetch = require('node-fetch')
const qs = require('qs')

const BASE_URL = 'https://api.coinmarketcap.com/'

class CoinMarketCap {
  constructor ({ version = 'v1', config = {} } = {}) {
    this.config = Object.assign(
      {},
      {
        headers: {
          Accept: 'application/json',
          'Accept-Charset': 'utf-8'
        },
        method: 'GET'
      },
      config
    )

    this.url = `${BASE_URL}/${version}`
  }

  /**
   * Get ticker information
   *
   * @param {Object=} options Options for the request:
   * @param {Int=} options.limit  Only returns the top limit results
   * @param {String=} options.convert  Return price, 24h volume, and market cap in terms of another currency
   * @param {String=} options.currency  Return only specific currency
   *
   * @example
   * const client = new CoinMarketCap()
   * client.getTicker({limit: 3}).then(console.log).catch(console.error)
   * client.getTicker({limit: 1, currency: 'bitcoin'}).then(console.log).catch(console.error)
   * client.getTicker({convert: 'EUR'}).then(console.log).catch(console.error)
   */
  getTicker ({ limit, convert, currency }) {
    return createRequest({
      url: `${this.url}/ticker${currency ? `/${currency}`.toLowerCase() : ''}`,
      query: { convert, limit }
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
      url: `${this.url}/global`,
      query: convert
    })
  }
}

const createRequest = ({ url, query }) => {
  return fetch(
    `${url}${query ? `?${qs.stringify(query)}` : ''}`,
    this.config
  ).then(res => res.json())
}

module.exports = CoinMarketCap
