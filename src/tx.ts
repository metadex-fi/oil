import { TxBuilder, Blaze, Provider, Wallet, Core } from "@blaze-cardano/sdk";
import { newTransaction } from "./altered";
import { TraceUtxo } from "./types";
import assert from "assert";
import { UtxoSet } from "./utxoSet";
import { TxCompleat } from "./txCompleat";

/**
 *
 */
export class Tx<P extends Provider, W extends Wallet> {
  private readonly ointments: ((tx: TxBuilder) => TxBuilder)[] = [];
  private isCompleat = false;

  /**
   *
   * @param blaze
   * @param available
   * @returns {Tx}
   */
  constructor(
    private readonly blaze: Blaze<P, W>,
    private readonly available: UtxoSet,
  ) {}

  /**
   *
   * @param rite
   * @returns {Tx}
   */
  private sequence = (rite: (tx: TxBuilder) => TxBuilder): Tx<P, W> => {
    assert(!this.isCompleat, `Tx.sequence: already compleat`);
    this.ointments.push(rite);
    return this;
  };

  /**
   *
   * @param utxo
   * @param redeemer
   * @param unhashDatum
   * @returns {Tx}
   */
  public addInput = (
    utxo: TraceUtxo,
    redeemer?: Core.PlutusData,
    unhashDatum?: Core.PlutusData,
  ): Tx<P, W> => {
    return this.sequence((tx) => tx.addInput(utxo.core, redeemer, unhashDatum));
  };

  /**
   *
   * @param utxo
   * @returns {Tx}
   */
  public addReferenceInput = (utxo: TraceUtxo): Tx<P, W> => {
    return this.sequence((tx) => tx.addReferenceInput(utxo.core));
  };

  /**
   *
   * @param utxos
   * @returns {Tx}
   */
  public addUnspentOutputs = (utxos: TraceUtxo[]): Tx<P, W> => {
    return this.sequence((tx) => {
      for (const { core, trace } of utxos) {
        this.available.insertNew(core, trace.via(`addUnspentOutputs`));
      }
      return tx.addUnspentOutputs(utxos.map((utxo) => utxo.core));
    });
  };

  /**
   *
   * @param address
   * @param value
   * @param datum
   * @returns {Tx}
   */
  public payAssets = (
    address: Core.Address,
    value: Core.Value,
    datum?: Core.Datum,
  ): Tx<P, W> => {
    return this.sequence((tx) => tx.payAssets(address, value, datum));
  };

  /**
   *
   * @param address
   * @param value
   * @param datum
   * @param scriptReference
   * @returns {Tx}
   */
  public lockAssets = (
    address: Core.Address,
    value: Core.Value,
    datum: Core.Datum,
    scriptReference?: Core.Script,
  ): Tx<P, W> => {
    return this.sequence((tx) =>
      tx.lockAssets(address, value, datum, scriptReference),
    );
  };

  /**
   *
   * @param policy
   * @param assets
   * @param redeemer
   * @returns {Tx}
   */
  public addMint = (
    policy: Core.PolicyId,
    assets: Map<Core.AssetName, bigint>,
    redeemer?: Core.PlutusData,
  ): Tx<P, W> => {
    return this.sequence((tx) => tx.addMint(policy, assets, redeemer));
  };

  /**
   *
   * @param validFrom
   * @param slotDurationMs
   * @returns {Tx}
   */
  public setValidFromMs = (
    validFrom: bigint,
    slotDurationMs: bigint,
    round: `up` | `down`,
  ): Tx<P, W> => {
    const slot =
      round === `down`
        ? Number(validFrom / slotDurationMs)
        : Math.ceil(Number(validFrom) / Number(slotDurationMs));
    return this.setValidFromSlot(slot as Core.Slot);
  };

  /**
   *
   * @param validUntil
   * @param slotDurationMs
   * @returns {Tx}
   */
  public setValidUntilMs = (
    validUntil: bigint,
    slotDurationMs: bigint,
    round: `up` | `down`,
  ): Tx<P, W> => {
    const slot =
      round === `down`
        ? Number(validUntil / slotDurationMs)
        : Math.ceil(Number(validUntil) / Number(slotDurationMs));
    return this.setValidUntilSlot(slot as Core.Slot);
  };

  /**
   *
   * @param validFrom
   * @returns {Tx}
   */
  public setValidFromSlot = (validFrom: Core.Slot): Tx<P, W> => {
    return this.sequence((tx) => tx.setValidFrom(validFrom));
  };

  /**
   *
   * @param validUntil
   * @returns {Tx}
   */
  public setValidUntilSlot = (validUntil: Core.Slot): Tx<P, W> => {
    return this.sequence((tx) => tx.setValidUntil(validUntil));
  };

  /**
   *
   * @param signer
   * @returns {Tx}
   */
  public addRequiredSigner = (signer: Core.Ed25519KeyHashHex): Tx<P, W> => {
    return this.sequence((tx) => tx.addRequiredSigner(signer));
  };

  /**
   *
   * @param script
   * @returns {Tx}
   */
  public provideScript = (script: Core.Script): Tx<P, W> => {
    return this.sequence((tx) => tx.provideScript(script));
  };

  // etc.

  /**
   *
   * @returns {Promise<TxCompleat>}
   */
  public compleat = async (): Promise<TxCompleat<P, W>> => {
    assert(!this.isCompleat, `Tx.compleat: already compleat`);
    this.isCompleat = true;
    const changeAddress = await this.blaze.wallet.getChangeAddress();
    let txBuilder = newTransaction(
      this.blaze,
      changeAddress,
      this.available.list.map((utxo) => utxo.core),
    );
    for (const annoint of this.ointments) {
      txBuilder = annoint(txBuilder);
    }
    return new TxCompleat(
      this.blaze,
      changeAddress,
      this.available,
      await txBuilder.complete(),
    );
  };

  /**
   *
   * @returns {Tx}
   */
  public clone = (): Tx<P, W> => {
    assert(!this.isCompleat, `Tx.clone: already compleat`);
    const tx = new Tx(this.blaze, this.available.clone());
    tx.ointments.push(...this.ointments);
    return tx;
  };
}
