import { ButtonInteraction, CacheType, RESTJSONErrorCodes } from "discord.js";
import { bankerRoleId } from "../../config";
import { ButtonCommand } from "../../shared/command/button-command";
import { requireInteractionMemberRole } from "../../shared/command/util";
import { PLAN_BUTTON, readPlanId } from "../../shared/bank-plan-id";
import { planDms } from "./bank-plan-dm";

// The "DM me the plan" button on a bank post from before posts got the 👀 reaction. A banker who
// presses it is sent the plan by DM; anyone else is told no. The channel gets nothing new.
class BankPlanButtonCommand extends ButtonCommand {
  public async execute(interaction: ButtonInteraction<CacheType>) {
    requireInteractionMemberRole(bankerRoleId, interaction);
    const lines = readPlanId(interaction.customId);
    if (!lines) throw new Error("This request's plan can't be read.");
    const messages = await planDms(lines);
    try {
      for (const m of messages) await interaction.user.send(m);
    } catch (err) {
      const closed =
        (err as { code?: unknown }).code ===
        RESTJSONErrorCodes.CannotSendMessagesToThisUser;
      if (!closed) console.error(`bank plan: a DM failed: ${err}`);
      await interaction.editReply(
        closed
          ? "I couldn't DM you the plan. Allow DMs from this server's members, then press the button again."
          : "Discord didn't take the plan. Press the button again in a minute."
      );
      return;
    }
    await interaction.editReply("Sent you the plan by DM.");
  }
}

export const bankPlanButtonCommand = new BankPlanButtonCommand(PLAN_BUTTON);
