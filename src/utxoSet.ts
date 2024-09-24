import { Core } from "@blaze-cardano/sdk";
import { CoreUtxo } from "./types";
import assert from "assert";

/**
 *
 */
export class UtxoSet {
  /**
   *
   * @param set
   * @param list
   * @returns {UtxoSet}
   */
  private constructor(
    public readonly set: Map<Core.TransactionId, Map<bigint, CoreUtxo>>,
    public readonly list: CoreUtxo[],
  ) {}

  /**
   *
   * @returns {UtxoSet}
   */
  static empty = (): UtxoSet => {
    return new UtxoSet(new Map(), []);
  }

  /**
   *
   * @param list
   * @returns {UtxoSet}
   */
  static fromList = (list: CoreUtxo[]): UtxoSet => {
    const utxoSet = UtxoSet.empty();
    list.forEach((utxo) => utxoSet.insertNew(utxo));
    return utxoSet;
  }

  /**
   *
   * @param utxo
   * @returns {void}
   */
  public insertNew = (utxo: CoreUtxo): void => {
    const txId = utxo.input().transactionId();
    const idx = utxo.input().index();
    const outputs = this.set.get(txId);
    if (outputs) {
      assert(!outputs.has(idx), `UtxoSet.addNew: ${txId}:${idx} already exists`);
      outputs.set(idx, utxo);
    } else {
      this.set.set(txId, new Map([[idx, utxo]]));
    }
    this.list.push(utxo);
  };

  /**
   *
   * @param inputs
   * @returns {UtxoSet}
   */
  public except = (inputs: readonly Core.TransactionInput[]): UtxoSet => {
    const set: Map<Core.TransactionId, Map<bigint, CoreUtxo>> = new Map();
    const list: CoreUtxo[] = [];

    for (const [txId, outputs] of this.set) {
      const outputs_ = new Map(outputs);
      for (const input of inputs) {
        if (txId === input.transactionId()) {
          const idx = input.index();
          assert(outputs_.has(idx), `UtxoSet.except: ${txId}:${idx} not found`);
          outputs_.delete(idx);
        }
      }
      if (outputs_.size > 0) {
        set.set(txId, outputs_);
        list.push(...outputs_.values());
      }
    }

    return new UtxoSet(set, list);
  }

  /**
   *
   * @returns {UtxoSet}
   */
  public clone = (): UtxoSet => {
    const set: Map<Core.TransactionId, Map<bigint, CoreUtxo>> = new Map();
    for (const [txId, outputs] of this.set) {
      const outputs_ = new Map(outputs);
      set.set(txId, outputs_);
    }
    return new UtxoSet(set, this.list.slice());
  }
}