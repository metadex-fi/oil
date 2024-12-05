import { Core } from "@blaze-cardano/sdk";

/**
 *
 */
export class TxSigned<WT extends `servitor` | `owner`> {
  /**
   *
   * @param blaze
   * @param tx
   */
  constructor(
    // private readonly blaze: Blaze<P, W>,
    public readonly tx: Core.Transaction,
  ) {}

  // /**
  //  * NOTE: Don't use this in Tiamat, hence commented out. Otherwise fine.
  //  * @returns {Promise<TxId>}
  //  */
  // public submit = async (): Promise<TxId> => {
  //   const txId = await this.blaze.submitTransaction(this.tx);
  //   return TxId.fromTransactionId(txId);
  // };
}
