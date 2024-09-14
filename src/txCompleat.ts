import { Blaze, Provider, Wallet, Core } from "@blaze-cardano/sdk";
import { Tx } from "./tx";
import { TxSigned } from "./txSigned";
import { CoreUtxo } from "./types";
import { UtxoSet } from "./utxoSet";

export class TxCompleat<P extends Provider, W extends Wallet> {
  private inputsCache:
    | {
        residual: UtxoSet;
        posterior: UtxoSet;
      }
    | undefined;
  constructor(
    private readonly blaze: Blaze<P, W>,
    private readonly changeAddress: Core.Address,
    private readonly residual: UtxoSet,
    public readonly tx: Core.Transaction
  ) {}

  private get inputs(): {
    residual: UtxoSet;
    posterior: UtxoSet;
  } {
    if (this.inputsCache === undefined) {
      const consumed = this.tx.body().inputs().values();
      const produced = this.tx.body().outputs().values();

      const residual = this.residual.except(consumed);
      const posterior = UtxoSet.empty();

      const txId = this.tx.toCore().id;
      let idx = 0n;

      let next = produced.next();
      const change = (utxo: CoreUtxo) =>
        utxo.output().address() === this.changeAddress;
      while (!next.done) {
        const input = new Core.TransactionInput(txId, idx++);
        const output = next.value;
        const utxo = new Core.TransactionUnspentOutput(input, output);
        if (change(utxo)) {
          residual.insertNew(utxo);
        } else {
          posterior.insertNew(utxo);
        }
        next = produced.next();
      }

      this.inputsCache = { residual, posterior };
    }
    return this.inputsCache;
  }

  public chain = (
    addUtxos?: (utxos: UtxoSet) => {
      utxo: CoreUtxo;
      redeemer: Core.PlutusData | `coerce` | `supply`;
    }[]
  ): Tx<P, W> => {
    const { residual, posterior } = this.inputs;
    let tx = new Tx(this.blaze, this.changeAddress, residual);

    if (addUtxos) {
      for (const { utxo, redeemer } of addUtxos(posterior)) {
        switch (redeemer) {
          case `supply`:
            tx = tx.addUnspentOutputs([utxo]);
            break;
          case `coerce`:
            tx = tx.addInput(utxo);
            break;
          default:
            tx = tx.addInput(utxo, redeemer);
        }
      }
    }

    return tx;
  };

  public sign = async (): Promise<TxSigned<P, W>> => {
    const txSigned = await this.blaze.signTransaction(this.tx);
    return new TxSigned(this.blaze, txSigned);
  };
}