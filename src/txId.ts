import { Core } from "@blaze-cardano/sdk";
import { CoreUtxo } from "./types";

export class TxId {
  private constructor(public readonly txId: Core.TransactionId) {}

  static fromTransactionId = (txId: Core.TransactionId): TxId => {
    return new TxId(txId);
  };
  
  static fromTransaction = (tx: Core.Transaction): TxId => {
    const txId = tx.toCore().id;
    return TxId.fromTransactionId(txId);
  };

  static fromUtxo = (utxo: CoreUtxo): TxId => {
    const txId = utxo.input().transactionId();
    return TxId.fromTransactionId(txId);
  };
}