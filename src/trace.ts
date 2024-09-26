
const calledFrom = `\nCALLED FROM: `;
const rra = ' <~-  '; // TODO duplicate with tiamat

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
    private readonly prefix: string
  ) {}

  /**
   *
   * @param source
   * @param from
   */
  public static source = (
    source: `CHAIN` | `SOCKET` | `INIT` | `SUB` | `INPUT` | `AUTO`,
    from: string
  ): Trace => {
    const trace = `${source}: ${from}\n`;
    return new Trace(trace, `\n${` `.repeat(8 - source.length)}BY `);
  };

  /**
   *
   */
  public toString = (): string => this.trace;

  /**
   *
   */
  public compose = (): string => `${this.prefix}${this.trace}`;

  /**
   *
   * @param name
   * @param from
   */
  public calledFrom = (name: string, from: string): Trace => {
    const trace = `${name}${calledFrom}${from}${this.compose()}`;
    return new Trace(trace, calledFrom);
  };

  /**
   *
   * @param text
   */
  public via = (text: string): Trace => {
    const trace = `${text}${this.compose()}`;
    return new Trace(trace, `\n  ${rra}VIA: `);
  };
}