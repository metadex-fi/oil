import { Blaze, Provider, Wallet, Core, TxBuilder } from "@blaze-cardano/sdk";

/**
 *
 * @param blaze
 * @param changeAddress
 * @param myUtxos
 * @returns {TxBuilder}
 */
export function newTransaction<P extends Provider, W extends Wallet>(
  blaze: Blaze<P, W>,
  changeAddress: Core.Address,
  myUtxos: Core.TransactionUnspentOutput[]
): TxBuilder {
  return new TxBuilder(blaze.params).addPreCompleteHook(async (tx) => {
    // const myUtxos = await blaze.wallet.getUnspentOutputs();
    // const changeAddress = await blaze.wallet.getChangeAddress();
    tx.setNetworkId(await blaze.wallet.getNetworkId())
      .addUnspentOutputs(myUtxos)
      .setChangeAddress(changeAddress)
      .useEvaluator((x, y) => blaze.provider.evaluateTransaction(x, y));
  });
}