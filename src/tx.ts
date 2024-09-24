import { TxBuilder, Blaze, Provider, Wallet, Core } from "@blaze-cardano/sdk";
import { newTransaction } from "./altered";
import { CoreUtxo } from "./types";
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
   * @param changeAddress
   * @param available
   * @returns {Tx}
   */
  constructor(
    private readonly blaze: Blaze<P, W>,
    private readonly changeAddress: Core.Address | `ownerWallet`,
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
  }

  /**
   *
   * @param utxo
   * @param redeemer
   * @param unhashDatum
   * @returns {Tx}
   */
  public addInput = (
    utxo: CoreUtxo,
    redeemer?: Core.PlutusData,
    unhashDatum?: Core.PlutusData
  ): Tx<P, W> => {
    return this.sequence((tx) =>
      tx.addInput(utxo, redeemer, unhashDatum)
    );
  }

  /**
   *
   * @param utxo
   * @returns {Tx}
   */
  public addReferenceInput = (utxo: CoreUtxo): Tx<P, W> => {
    return this.sequence((tx) => tx.addReferenceInput(utxo));
  }

  /**
   *
   * @param utxos
   * @returns {Tx}
   */
  public addUnspentOutputs = (utxos: CoreUtxo[]): Tx<P, W> => {
    return this.sequence((tx) => {
      for (const utxo of utxos) {
        this.available.insertNew(utxo);
      }
      return tx.addUnspentOutputs(utxos);
    });
  }

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
    datum?: Core.Datum
  ): Tx<P, W> => {
    return this.sequence((tx) => tx.payAssets(address, value, datum));
  }


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
    scriptReference?: Core.Script
  ): Tx<P, W> => {
    return this.sequence((tx) => tx.lockAssets(address, value, datum, scriptReference));
  }

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
    redeemer?: Core.PlutusData
  ): Tx<P, W> => {
    return this.sequence((tx) => tx.addMint(policy, assets, redeemer));
  }

  /**
   *
   * @param validFrom
   * @returns {Tx}
   */
  public setValidFrom = (validFrom: Core.Slot): Tx<P, W> => {
    return this.sequence((tx) => tx.setValidFrom(validFrom));
  }

  /**
   *
   * @param validUntil
   * @returns {Tx}
   */
  public setValidUntil = (validUntil: Core.Slot): Tx<P, W> => {
    return this.sequence((tx) => tx.setValidUntil(validUntil));
  }

  /**
   *
   * @param signer
   * @returns {Tx}
   */
  public addRequiredSigner = (signer: Core.Ed25519KeyHashHex): Tx<P, W> => {
    return this.sequence((tx) => tx.addRequiredSigner(signer));
  }

  /**
   *
   * @param script
   * @returns {Tx}
   */
  public provideScript = (script: Core.Script): Tx<P, W> => {
    return this.sequence((tx) => tx.provideScript(script));
  }

  // etc.

  /**
   *
   * @returns {Promise<TxCompleat>}
   */
  public compleat = async (): Promise<TxCompleat<P, W>> => {
    assert(!this.isCompleat, `Tx.compleat: already compleat`);
    this.isCompleat = true;
    const changeAddress =
      this.changeAddress === `ownerWallet`
        ? await this.blaze.wallet.getChangeAddress()
        : this.changeAddress;
    let txBuilder = newTransaction(this.blaze, changeAddress, this.available.list);
    for (const annoint of this.ointments) {
      txBuilder = annoint(txBuilder);
    }
    return new TxCompleat(
      this.blaze,
      changeAddress,
      this.available,
      await txBuilder.complete()
    );
  };

  /**
   *
   * @returns {Tx}
   */
  public clone = (): Tx<P, W> => {
    assert(!this.isCompleat, `Tx.clone: already compleat`);
    const tx = new Tx(this.blaze, this.changeAddress, this.available.clone());
    tx.ointments.push(...this.ointments);
    return tx;
  }
}
