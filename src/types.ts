import { Core } from "@blaze-cardano/sdk";
import { Trace } from "./trace";

export type CoreUtxo = Core.TransactionUnspentOutput;

export interface TraceUtxo {
  core: Core.TransactionUnspentOutput;
  trace: Trace;
}
