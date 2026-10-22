Feature: Expiring old bank requests
  Every hour the bot removes the requests it posted to #bank-requests, from the bank page or
  /bank request, once they're 30 days old, and DMs each member the request it removed. Players' own
  posts and the bot's instructions stay, however old.

  Background:
    Given Alice is a Castle member
    And Bob is a Castle member

  Scenario: A request from the bank page is removed at 30 days, and its member told
    Given Alice placed a bank request on the bank page 29 days ago:
      """
      • Pearl (free)
      """
    And Bob placed a bank request on the bank page 30 days ago:
      """
      • Cloak of Flames (800p)
      """
    When the bot clears out old bank requests
    Then Alice's request is still in #bank-requests
    And Bob's request is no longer in #bank-requests
    And Bob is sent a DM:
      """
      Your <Castle> bank request has been dismissed, as it was open for 30 days.

      **Sorry we missed you!** Please post your bank request again the next time you are available to have it fulfilled.

      > • Cloak of Flames (800p)
      """
    And the log says "bank requests: removed 1 request(s) over 30 days old"

  Scenario: A /bank request is removed at 30 days, and its member told
    Given Bob placed a bank request with /bank request 45 days ago: "Cloak of Flames x 1"
    When the bot clears out old bank requests
    Then Bob's request is no longer in #bank-requests
    And Bob is sent a DM:
      """
      Your <Castle> bank request has been dismissed, as it was open for 30 days.

      **Sorry we missed you!** Please post your bank request again the next time you are available to have it fulfilled.

      > ✍️ <@Bob> requests: Cloak of Flames x 1
      """

  Scenario: Players' own posts stay, however old
    Given Alice posted in #bank-requests 60 days ago: "Raid Reagents: Peridots, 40"
    And Alice copied a bank page request into #bank-requests 60 days ago
    When the bot clears out old bank requests
    Then Alice's requests are still in #bank-requests
    And no one is sent a DM

  Scenario: The bot's instructions stay, however old
    Given the bot's instructions have been in #bank-requests for 90 days
    When the bot clears out old bank requests
    Then the bot's instructions are still in #bank-requests
    And no one is sent a DM
    And the log doesn't say "bank requests: removed"

  Scenario: Old requests behind a page of newer posts are found
    Given Bob placed a bank request with /bank request 31 days ago: "Pearl"
    And 150 newer posts follow in #bank-requests
    When the bot clears out old bank requests
    Then Bob's request is no longer in #bank-requests

  Scenario: A member who doesn't take DMs still has their request removed
    Given Bob doesn't take DMs
    And Bob placed a bank request on the bank page 40 days ago:
      """
      • Pearl (free)
      """
    When the bot clears out old bank requests
    Then Bob's request is no longer in #bank-requests
    And the log says "bank requests: couldn't DM"

  Scenario: A DM is cut to fit Discord's 2,000 characters
    Given Bob placed a bank request on the bank page 40 days ago for 100 lines
    When the bot clears out old bank requests
    Then Bob is sent a DM of at most 2,000 characters

  Scenario: A request a banker removed as the cleanup reached it is skipped
    Given Alice placed a bank request on the bank page 40 days ago:
      """
      • Pearl (free)
      """
    And Bob placed a bank request with /bank request 40 days ago: "Cloak of Flames"
    And a banker removes Alice's request as the cleanup reaches it
    When the bot clears out old bank requests
    Then Bob's request is no longer in #bank-requests
    And no DM is sent to Alice
    And the log says "bank requests: removed 1 request(s) over 30 days old"
