import axios from "axios";
import { log } from "../../../shared/logger";

const WIREPUSHER_URL = "https://wirepusher.com/send";

/**
 * Delivers a push notification to an Android device via the WirePusher service.
 * `contact` is the device's WirePusher ID.
 */
export const wirePush = async (contact: string, message: string) => {
  await axios({
    method: "post",
    url: WIREPUSHER_URL,
    params: {
      id: contact,
      title: "EQNotify Alert",
      message,
      type: "EQNotify",
    },
  });
  log(`EQNotify wirepush sent to ${contact}`);
};
