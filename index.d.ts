/** The CommonJS client exported by coinmarketcap-api. */
declare class CoinMarketCap {
  constructor(apiKey: string, options?: CoinMarketCap.Options)

  apiKey: string
  url: string
  fetcher: CoinMarketCap.Fetcher
  config: { [option: string]: unknown }

  /** Returns unvalidated JSON, including API error responses. */
  getIdMap(options?: CoinMarketCap.IdMapOptions): Promise<unknown>
  /** Returns unvalidated JSON, including API error responses. */
  getFiatMap(options?: CoinMarketCap.FiatMapOptions): Promise<unknown>
  /** Requires either id or symbol. Returns unvalidated JSON. */
  getMetadata(options: CoinMarketCap.Identifier): Promise<unknown>
  /** A limit of 0 requests 5000 entries; it cannot accompany a nonzero start. */
  getTickers(options?: CoinMarketCap.TickerOptions): Promise<unknown>
  /** Requires either id or symbol. Returns unvalidated JSON. */
  getQuotes(options: CoinMarketCap.QuoteOptions): Promise<unknown>
  /** Returns unvalidated JSON, including API error responses. */
  getGlobal(options?: CoinMarketCap.Symbols | CoinMarketCap.GlobalOptions): Promise<unknown>
}

declare namespace CoinMarketCap {
  type Ids = number | string | Array<number | string>
  type Symbols = string | string[]

  /** Only the response's json method is used; no DOM or node-fetch types are needed. */
  interface FetchResponse {
    json(): unknown
  }

  type Fetcher = (url: string, config: object) => Promise<FetchResponse>

  interface Options {
    /** Defaults to v1. Selecting another version does not migrate endpoint paths. */
    version?: string | undefined
    fetcher?: Fetcher | undefined
    /** Passed to the fetcher after a shallow merge with the default GET configuration. */
    config?: object | undefined
  }

  interface IdMapOptions {
    listingStatus?: string | undefined
    start?: number | string | undefined
    limit?: number | string | undefined
    symbol?: Symbols | undefined
    sort?: string | undefined
  }

  interface FiatMapOptions {
    start?: number | string | undefined
    limit?: number | string | undefined
    sort?: 'id' | 'name' | undefined
    includeMetals?: boolean | undefined
  }

  type Identifier =
    | { id: Ids; symbol?: undefined }
    | { id?: undefined; symbol: Symbols }

  interface TickerOptions {
    start?: number | string | undefined
    limit?: number | string | undefined
    convert?: Symbols | undefined
    sort?: string | undefined
    sortDir?: 'asc' | 'desc' | undefined
    cryptocurrencyType?: 'all' | 'coins' | 'tokens' | undefined
  }

  type QuoteOptions = Identifier & GlobalOptions

  interface GlobalOptions {
    convert?: Symbols | undefined
  }
}

export = CoinMarketCap
