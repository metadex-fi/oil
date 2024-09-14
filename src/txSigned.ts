import { Blaze, Provider, Wallet, Core } from "@blaze-cardano/sdk";
import { TxId } from "./txId";

export class TxSigned<P extends Provider, W extends Wallet> {
  constructor(
    private readonly blaze: Blaze<P, W>,
    public readonly tx: Core.Transaction
  ) {}

  public submit = async (): Promise<TxId> => {
    const txId = await this.blaze.submitTransaction(this.tx);
    return TxId.fromTransactionId(txId);
  };
}