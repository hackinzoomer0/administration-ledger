/// <reference types="vite/client" />

declare module "virtual:ledger-nomination" {
  const value: import("./lib/types").Nomination;
  export default value;
}
