const calledFrom = `\nCALLED FROM: `;
const rra = " <~-  "; // TODO duplicate with tiamat

/**
 *
 */
export class Trace {
  /**
   *
   * @param trace
   * @param prefix
   */
  private constructor(
    private readonly trace: string,
    private readonly prefix: string,
  ) {}

  /**
   *
   * @param source
   * @param from
   * @returns {Trace}
   */
  public static source = (
    source: `CHAIN` | `SOCKET` | `INIT` | `SUB` | `INPUT` | `AUTO`,
    from: string,
  ): Trace => {
    const trace = `${source}: ${from}\n`;
    return new Trace(trace, `\n${` `.repeat(8 - source.length)}BY `);
  };

  /**
   *
   * @returns {string}
   */
  public toString = (): string => this.trace;

  /**
   *
   * @returns {string}
   */
  public compose = (): string => `${this.prefix}${this.trace}`;

  /**
   *
   * @param name___
   * @param from
   * @returns {Trace}
   */
  public calledFrom = (name___: string, from: string): Trace => {
    const trace = `${name___}${calledFrom}${from}${this.compose()}`;
    return new Trace(trace, calledFrom);
  };

  /**
   *
   * @param text
   * @returns {Trace}
   */
  public via = (text: string): Trace => {
    const trace = `${text}${this.compose()}`;
    return new Trace(trace, `\n  ${rra}VIA: `);
  };

  /**
   *
   * @returns {Trace}
   */
  public clone = (): Trace => {
    return new Trace(this.trace.slice(), this.prefix.slice());
  };
}
