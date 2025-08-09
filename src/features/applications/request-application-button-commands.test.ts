import { createBotTestEnvironment } from "../../test/app-test-config";
import { VOLUNTEER_APPLICATION, APPLICATION_MESSAGE_TEMPLATE } from "./constants";
import { updateApplicationInfo } from "./update-applications";

describe("volunteer application workflow", () => {
  it("handles complete application workflow from setup to user interaction", async () => {
    const discord = createBotTestEnvironment();
    const applicant = discord.guild.createUser("eager_applicant");

    await discord.withClient((client) => updateApplicationInfo(client));

    const volunteerButton = discord.getButton(VOLUNTEER_APPLICATION.LABEL);
    expect(discord).toHaveCreatedEmbed("Volunteer Applications");

    await volunteerButton.click(applicant);

    expect(applicant).toHaveSentDm(APPLICATION_MESSAGE_TEMPLATE);
    expect(discord.channel("request-dump")).toHaveSentMessage(
      /Volunteer Application sent to \*\*eager_applicant\*\*/
    );
  });

  it("handles error gracefully when request channel is missing", async () => {
    const discord = createBotTestEnvironment({
      channels: { general: "text" },
    });
    const applicant = discord.guild.createUser("test_user");

    await discord.withClient((client) => updateApplicationInfo(client));
    const volunteerButton = discord.getButton(VOLUNTEER_APPLICATION.LABEL);
    await volunteerButton.click(applicant);

    expect(applicant).toHaveEditedReplyWith("Error: Could not locate the request dump channel");
  });

  it("handles error gracefully when channel type is invalid", async () => {
    const discord = createBotTestEnvironment({
      channels: { general: "text", "request-dump": "text" },
    });
    const applicant = discord.guild.createUser("test_user");

    await discord.withClient((client) => updateApplicationInfo(client));
    const volunteerButton = discord.getButton(VOLUNTEER_APPLICATION.LABEL);
    await volunteerButton.click(applicant);

    expect(applicant).toHaveEditedReplyWith("Error: 111222333 is not a text channel.");
  });
});
