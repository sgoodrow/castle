import { when } from "../../test/helpers/describe-discord";
import { UpdateApplicationInfoAction, updateApplicationInfo } from "./update-applications";
import { globalDiscordMocks } from "../../test/setup";

when("updating application info", ({ discord }) => {
  it("executes action through ready executor", async () => {
    updateApplicationInfo(discord);

    expect(globalDiscordMocks.readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      undefined
    );
    expect(globalDiscordMocks.readyActionExecutor).toHaveBeenCalledTimes(1);
  });

  it("supports repeat duration configuration", async () => {
    const options = { repeatDuration: 5000 };

    updateApplicationInfo(discord, options);

    expect(globalDiscordMocks.readyActionExecutor).toHaveBeenCalledWith(
      expect.any(UpdateApplicationInfoAction),
      options
    );
  });
});
