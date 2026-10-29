import type { Metadata } from "next";
import { TariffsView } from "./tariffs-view";

export const metadata: Metadata = { title: "Tariffs" };

export default function TariffsPage() {
  return <TariffsView />;
}
