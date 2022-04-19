import { Client } from "discord.js";
import { BankRequestReadyListener } from "../features/bank-request-info/ready-listener";

export const readyListener = async (client: Client) =>
  [new BankRequestReadyListener(client)].forEach((listener) =>
    listener
      .fire()
      .then(() => console.log(`Successfully ran ${listener.constructor.name}.`))
      .catch(console.error)
  );
