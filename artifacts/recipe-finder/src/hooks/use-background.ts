import { useContext } from "react";
import { BackgroundContext } from "@/context/background";

export function useBackground() {
  return useContext(BackgroundContext);
}
