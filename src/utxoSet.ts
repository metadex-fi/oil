import { Core, Wallet } from "@blaze-cardano/sdk";
import { CoreUtxo, TraceUtxo } from "./types";
import assert from "assert";
import { Trace } from "./trace";

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
    public readonly set: Map<Core.TransactionId, Map<bigint, TraceUtxo>>,
    public list: TraceUtxo[],
  ) {}

  public get size(): number {
    return this.list.length;
  }

  public get = (input: Core.TransactionInput): TraceUtxo | undefined => {
    return this.set.get(input.transactionId())?.get(input.index());
  }

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
  static fromList = (list: TraceUtxo[]): UtxoSet => {
    const utxoSet = UtxoSet.empty();
    list.forEach((utxo) => utxoSet.insertNew(utxo.core, utxo.trace));
    return utxoSet;
  }

  /**
   *
   * @param wallet
   * @returns {UtxoSet}
   */
  static ofWallet = async (wallet: Wallet): Promise<UtxoSet> => {
    const utxos = await wallet.getUnspentOutputs();
    const trace = Trace.source(`INPUT`, `UtxoSet.ofWallet`);
    return UtxoSet.fromList(utxos.map((core) => { return { core, trace }}));
  }

  public has = (input: Core.TransactionInput): boolean => {
    return this.set.get(input.transactionId())?.has(input.index()) ?? false;
  }

    /**
   *
   * @param core
   * @returns {boolean}
   */
    public insert = (core: CoreUtxo, trace: Trace): boolean => {
      const txId = core.input().transactionId();
      const idx = core.input().index();
      const outputs = this.set.get(txId);
      let newInsert = true;
      if (outputs) {
        if (outputs.has(idx)) {
          newInsert = false;
        } else {
          const utxo = {core, trace};
          outputs.set(idx, utxo);
          this.list.push(utxo);
        }
      } else {
        const utxo = {core, trace};
        this.set.set(txId, new Map([[idx, utxo]]));
        this.list.push(utxo);
      }
      return newInsert;
    };

  /**
   *
   * @param utxo
   * @returns {void}
   */
  public insertNew = (utxo: CoreUtxo, trace: Trace): void => {
    const newInsert = this.insert(utxo, trace);
    assert(newInsert, `UtxoSet.insertNew (${trace.compose()}):\n${utxo.input().transactionId()}:${utxo.input().index()}\nalready exists in\n${this.list.map((utxo) => utxo.core.input().transactionId() + ':' + utxo.core.input().index()).join('\n')}`);
  };

  /**
   *
   * @param utxo
   * @returns {void}
   */
  public insertFromSet = (utxoSet: UtxoSet): void => {
    for (const {core, trace: trace} of utxoSet.list) {
      this.insertNew(core, trace);
    }
  };

    /**
   *
   * @param input
   * @returns {boolean}
   */
    public delete = (input: Core.TransactionInput): boolean => {
      const txId = input.transactionId();
      const idx = input.index();
      const outputs = this.set.get(txId);
      if (outputs && outputs.has(idx)) {
        outputs.delete(idx);
        if (outputs.size === 0) {
          this.set.delete(txId);
        }
        this.list = this.list.filter((utxo) => utxo.core.input().transactionId() !== txId || utxo.core.input().index() !== idx);
        return true;
      }
      return false;
    };

  /**
   *
   * @param inputs
   * @returns {UtxoSet}
   */
  public except = (inputs: readonly Core.TransactionInput[]): {
    posterior: UtxoSet, 
    deleted: UtxoSet
  } => {
    const set: Map<Core.TransactionId, Map<bigint, TraceUtxo>> = new Map();
    const list: TraceUtxo[] = [];

    const deleted = UtxoSet.empty()
    for (const [txId, outputs] of this.set) {
      const outputs_ = new Map(outputs);
      for (const input of inputs) {
        if (txId === input.transactionId()) {
          const index = input.index();
          const utxo = outputs_.get(index);
          assert(utxo, `UtxoSet.except: ${txId}:${index} not found`);
          outputs_.delete(index);
          deleted.insertNew(utxo.core, utxo.trace);
        }
      }
      if (outputs_.size > 0) {
        set.set(txId, outputs_);
        list.push(...outputs_.values());
      }
    }

    return {posterior: new UtxoSet(set, list), deleted};
  }

  public removeHead = (): TraceUtxo => {
    assert(this.size > 0, `UtxoSet.removeHead: empty`);
    const utxo = this.list.shift();
    assert(utxo, `UtxoSet.removeHead: empty`);
    const txId = utxo.core.input().transactionId();
    const idx = utxo.core.input().index();
    const outputs = this.set.get(txId);
    assert(outputs, `UtxoSet.removeHead: ${txId}:${idx} not found`);
    assert(outputs.has(idx), `UtxoSet.removeHead: ${txId}:${idx} not found`);
    outputs.delete(idx);
    if (outputs.size === 0) {
      this.set.delete(txId);
    }
    return utxo;
  }

  /**
   *
   * @returns {UtxoSet}
   */
  public clone = (): UtxoSet => {
    const set: Map<Core.TransactionId, Map<bigint, TraceUtxo>> = new Map();
    for (const [txId, outputs] of this.set) {
      const outputs_ = new Map(outputs);
      set.set(txId, outputs_);
    }
    return new UtxoSet(set, this.list.slice());
  }
}