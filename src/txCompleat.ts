import { Blaze, Provider, Wallet, Core } from "@blaze-cardano/sdk";
import { Tx } from "./tx";
import { TxSigned } from "./txSigned";
import { CoreUtxo, TraceUtxo } from "./types";
import { UtxoSet } from "./utxoSet";
import { Trace } from "./trace";

/**
 *
 */
export class TxCompleat<P extends Provider, W extends Wallet> {
  private inputsCache:
    | {
        residual: UtxoSet;
        posterior: UtxoSet;
      }
    | undefined;
  /**
   *
   * @param blaze
   * @param changeAddress
   * @param residual
   * @param tx
   */
  constructor(
    private readonly blaze: Blaze<P, W>,
    private readonly changeAddress: Core.Address,
    private readonly residual: UtxoSet,
    public readonly tx: Core.Transaction,
  ) {}

  /**
   *
   * @returns {{residual: UtxoSet; posterior: UtxoSet}}
   */
  private get inputs(): {
    residual: UtxoSet;
    posterior: UtxoSet;
  } {
    if (this.inputsCache === undefined) {
      this.inputsCache = this.changeAt(this.changeAddress);
    }
    return this.inputsCache;
  }

  /**
   *
   * @param address
   * @returns {{residual: UtxoSet; posterior: UtxoSet}}
   */
  private changeAt(address: Core.Address): {
    residual: UtxoSet;
    posterior: UtxoSet;
  } {
    const consumed = this.tx.body().inputs().values();
    const produced = this.tx.body().outputs().values();

    const { posterior: residual } = this.residual.except(consumed);
    const posterior = UtxoSet.empty();

    const txId = this.tx.toCore().id;
    let idx = 0n;

    let next = produced.next();
    /**
     * checks if the utxo is being created at the change address
     * @param utxo
     * @returns {boolean}
     */
    const change = (utxo: CoreUtxo): boolean =>
      utxo.output().address() === address;
    while (!next.done) {
      const input = new Core.TransactionInput(txId, idx++);
      const output = next.value;
      const utxo = new Core.TransactionUnspentOutput(input, output);
      if (change(utxo)) {
        residual.insertNew(utxo, Trace.source(`CHAIN`, `TxCompleat.change`));
      } else {
        posterior.insertNew(
          utxo,
          Trace.source(`CHAIN`, `TxCompleat.posterior`),
        );
      }
      next = produced.next();
    }

    return { residual, posterior };
  }

  /**
   * creates a new tx of the same wallet with the previous tx's utxo set, with the
   * spent utxos removed and the change-utxos at the wallet's change-address added.
   * The other outputs of that previous tx are considered unavailable, unless added
   * explicitly again via the addUtxos parameter.
   * @param nextBlaze optional different base wallet for the next tx
   * @param utxoChainers optional functions to add non-change-outputs from the previous tx
   * to the set of available utxos. The redeemer-field determines whether it has to be
   * spent in the chained tx, or is simply made available. There does not appear to be
   * a way to make script outputs (consumed with a redeemer) optionally available, but
   * then I'm not even sure if I'm merely guessing wrong about the difference between
   * addInput (assuming that means mandatory inclusion) and addUnspentOutputs (assuming
   * that means optional inclusion).
   * @returns {Tx}
   */
  public chain = async (
    nextBlaze: Blaze<P, W> | `same`,
    utxoChainers: ((utxos: UtxoSet) => {
      utxo: TraceUtxo;
      redeemer: Core.PlutusData | `coerce` | `supply` | `read`;
    }[])[] = [],
  ): Promise<Tx<P, W>> => {
    const blaze = nextBlaze === `same` ? this.blaze : nextBlaze;
    const { residual, posterior } =
      nextBlaze === `same`
        ? this.inputs
        : this.changeAt(await nextBlaze.wallet.getChangeAddress());
    let tx = new Tx(blaze, residual);

    for (const chainUtxos of utxoChainers) {
      for (const { utxo, redeemer } of chainUtxos(posterior)) {
        switch (redeemer) {
          case `supply`:
            tx = tx.addUnspentOutputs([utxo]);
            break;
          case `coerce`:
            tx = tx.addInput(utxo);
            break;
          case `read`:
            tx = tx.addReferenceInput(utxo);
            break;
          default:
            tx = tx.addInput(utxo, redeemer);
        }
      }
    }

    return tx;
  };

  /**
   *
   * @returns {Promise<TxSigned<P, W>>}
   */
  public sign = async (): Promise<TxSigned<P, W>> => {
    const txSigned = await this.blaze.signTransaction(this.tx);
    return new TxSigned(this.blaze, txSigned);
  };
}
