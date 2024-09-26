import { Core } from "@blaze-cardano/sdk";
import { CoreUtxo } from "./types";

/**
 *
 */
export class TxId {
  /**
   *
   * @param txId
   * @returns {TxId}
   */
  private constructor(public readonly txId: Core.TransactionId) {}

  /**
   *
   * @param txId
   * @returns {TxId}
   */
  static fromTransactionId = (txId: Core.TransactionId): TxId => {
    return new TxId(txId);
  };

  /**
   *
   * @param tx
   * @returns {TxId}
   */
  static fromTransaction = (tx: Core.Transaction): TxId => {
    const txId = tx.toCore().id;
    return TxId.fromTransactionId(txId);
  };

  /**
   *
   * @param input
   * @returns {TxId}
   */
  static fromInput = (input: Core.TransactionInput): TxId => {
    const txId = input.transactionId();
    return TxId.fromTransactionId(txId);
  };

  /**
   *
   * @param utxo
   * @returns {TxId}
   */
  static fromUtxo = (utxo: CoreUtxo): TxId => {
    const input = utxo.input();
    return TxId.fromInput(input);
  };
}
