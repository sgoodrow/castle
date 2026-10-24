Feature: Signing in
  Members sign in with Discord. Only Castle members with the bank role get in; anyone else is
  told why, and can try again.

  Background:
    Given the bank site is set up for Discord sign-in

  Scenario Outline: Someone who hasn't signed in is sent to Discord
    When Someone visits "<path>"
    Then Someone is sent to Discord to sign in

    Examples:
      | path        |
      | /           |
      | /index.html |
      | /auth/login |

  Scenario: The bank's data needs sign-in
    When Someone asks for the bank
    Then the answer is 401 with the JSON:
      """
      {"error": "sign in"}
      """

  Scenario: A member with the bank role gets in
    Given Alice is a Castle member with the bank role
    When Alice signs in with Discord
    Then Alice is sent to "/"
    And the log says "bank web: Alice (id-Alice) signed in"
    When Alice asks for the bank
    Then the answer is 200

  Scenario: A Castle member without the bank role is told why
    Given Bob is a Castle member without the bank role
    When Bob signs in with Discord
    Then the answer is 403 saying "The guild bank is open to Castle members with the bank role."
    And the answer offers to sign in again
    When Bob asks for the bank
    Then the answer is 401

  Scenario: Someone outside Castle is told why
    Given Bob isn't in the Castle Discord server
    When Bob signs in with Discord
    Then the answer is 403 saying "This Discord account isn't in the Castle server."
    And the answer offers to sign in again

  Scenario: Discord refusing the sign-in asks the member to try again, and the bank stays closed
    Given Bob is a Castle member with the bank role
    And Discord refuses the sign-in
    When Bob signs in with Discord
    Then the answer is 502 saying "Discord didn't accept the sign-in. Try again."
    And the log says "bank web: token exchange failed 401"
    When Bob asks for the bank
    Then the answer is 401

  Scenario: An old sign-in link is refused
    Given Bob is a Castle member with the bank role
    When Bob comes back from Discord with a stale sign-in link
    Then the answer is 400 saying "That sign-in link was stale. Try again."

  Scenario: Cancelling on Discord
    When Bob cancels signing in on Discord
    Then the answer is 403 saying "Discord sign-in was cancelled."
    And the answer offers to sign in again

  Scenario: Signing out
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    When Alice visits "/auth/logout"
    Then Alice is sent to "/signed-out"
    When Alice visits "/signed-out"
    Then the answer is 200 saying "You're signed out of the guild bank."
    And the answer offers to sign in again
    When Alice asks for the bank
    Then the answer is 401
