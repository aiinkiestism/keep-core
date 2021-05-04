import BigNumber from "bignumber.js"
import * as Icons from "../components/Icons"
import { isZero, lt } from "./arithmetics.utils"

const metrics = [
  { divisor: 1, symbol: "" },
  { divisor: 1e3, symbol: "K" },
  { divisor: 1e6, symbol: "M" },
]

export class Token {
  /**
   * Convert wei amount to token units
   * @param {*} amount amount in wei
   * @param {*} decimals decimals
   *
   * @return {BigNumber} amount in token units
   */
  static toTokenUnit = (amount, decimals = 18) => {
    if (!amount) {
      return new BigNumber(0)
    }
    return new BigNumber(amount).div(new BigNumber(10).pow(decimals))
  }

  /**
   * Convert token unit amount to wei.
   * @param {*} amount amount in token units
   * @param {*} decimals decimals
   *
   * @return {BigNumber} amount in wei
   */
  static fromTokenUnit(amount, decimals = 18) {
    amount = new BigNumber(amount)
    return amount.times(new BigNumber(10).pow(decimals))
  }

  constructor(
    _name,
    _decimals,
    _symbol,
    _smallestPrecisionUnit,
    _smallestPrecisionDecimals,
    _icon,
    _decimalsToDisplay = 4
  ) {
    this.name = _name
    this.decimals = _decimals
    this.symbol = _symbol
    this.smallestPrecisionUnit = _smallestPrecisionUnit
    this.smallestPrecisionDecimals = _smallestPrecisionDecimals
    this.icon = _icon
    this.decimalsToDisplay = _decimalsToDisplay
    this.MIN_AMOUNT_TO_DISPLAY = new BigNumber(10)
      .pow(this.smallestPrecisionDecimals)
      .toString()

    this.MIN_AMOUNT_IN_TOKEN_UNIT = this.toTokenUnit(
      this.MIN_AMOUNT_TO_DISPLAY
    ).toString()
  }

  toTokenUnit = (amount, decimals = this.decimals) => {
    return this.constructor.toTokenUnit(amount, decimals)
  }

  fromTokenUnit(amount, decimals = this.decimals) {
    return this.constructor.fromTokenUnit(amount, decimals)
  }

  /**
   * Displays the provided amount in the readble format.
   *
   * @param {*} amount An amount in the samllest unit of the token.
   *
   * @return {string} Formatted amount in readble format.
   */
  displayAmount = (amount) => {
    return this._displayAmount(amount, this.toFormat)
  }

  /**
   * Formats the amount with comma separators and removes trailing zeros if
   * needed. Eg:
   * 10000.2300 -> 100,000.23
   * 1000 -> 1,000
   * @param {BigNumber | number | string} amount An amount to format.
   * @param {number} decimalPlaces Number of decimals to display.
   *
   * @return {string} Formatted amount.
   */
  toFormat = (amount, decimalPlaces = this.decimalsToDisplay) => {
    const _amount = BigNumber.isBigNumber(amount)
      ? amount
      : new BigNumber(amount)
    return _amount.decimalPlaces() < decimalPlaces
      ? _amount.toFormat(undefined, BigNumber.ROUND_DOWN)
      : _amount.toFormat(decimalPlaces, BigNumber.ROUND_DOWN)
  }

  /**
   * Displays an amount with a token symbol.
   *
   * @param {*} amount An amount to display.
   *
   * @return {string} Formatted amount with a token symbol.
   */
  displayAmountWithSymbol = (amount) => {
    return `${this.displayAmount(amount)} ${this.symbol}`
  }

  /**
   * Returns a number with a metric suffix eg.:
   * * 10000000 => { value: 10, suffix: 'M', formattedValue: '10M' }
   * * 1000.4 => { value: 1.4, suffix: 'K', formattedValue: '1.4K'}
   * * 10000.4 => { value: 10, suffix: 'K', formattedValue: '10K' }
   * * 1 => { value: 1, suffix: '', formattedValue: '1' }
   *
   * @param {*} number
   *
   * @typedef {Object} NumebrWithSuffix
   * @property {string} value - number in string
   * @property {string} suffix - metric suffix
   * @property {string} formattedValue - number with suffix
   *
   * @return {NumebrWithSuffix}
   */
  getNumberWithMetricSuffix = (number) => {
    const bigNumber = new BigNumber(number)
    let metric
    for (let i = metrics.length - 1; i >= 0; i--) {
      metric = metrics[i]
      if (bigNumber.gte(metric.divisor)) {
        break
      }
    }

    const value = bigNumber.div(metric.divisor)

    return {
      value: value.toString(),
      suffix: metric.symbol,
      formattedValue: `${this.toFormat(
        value,
        metric.divisor === 1 ? this.decimalsToDisplay : 2
      )}${metric.symbol}`,
    }
  }

  /**
   * Displays an amount with a metric suffix.
   *
   * @param {*} amount An amount to display.
   *
   * @return {string} Formatted amount with a metric suffix.
   */
  displayAmountWithMetricSuffix = (amount) => {
    const result = this._displayAmount(amount, this.getNumberWithMetricSuffix)
    return result?.formattedValue ? result.formattedValue : result
  }

  _displayAmount = (amount, formattingFn = (amount) => amount) => {
    if (!amount || isZero(amount)) {
      return "0"
    }

    if (lt(amount, this.MIN_AMOUNT_TO_DISPLAY)) {
      return `<${this.MIN_AMOUNT_IN_TOKEN_UNIT}`
    }

    return formattingFn(this.toTokenUnit(amount))
  }
}

export const KEEP = new Token(
  "Keep Token",
  18,
  "KEEP",
  "KEEP",
  18,
  Icons.KeepOutline,
  0
)

export const ETH = new Token("Ether", 18, "ETH", "gwei", 14, Icons.ETH)
export const TBTC = new Token("tBTC", 18, "TBTC", "tSats", 8, Icons.TBTC)
export const LPToken = new Token(
  "Liqudity Provider Token",
  18,
  "LP",
  "LP",
  18,
  null
)
