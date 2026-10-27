Feature: Getting the plan for a bank request
  A banker who presses a bank request's "DM me the plan" button is sent a DM saying which characters
  to log in to, in order, and what to take from where on each, from the bank as it is right then. The
  plan names characters and spots, never accounts. Only bankers can press the button, and the
  channel gets nothing new.

  Background:
    Given Alice is a Castle member
    And Dana is a Castle banker

  Scenario: A banker is sent the plan by DM
    Given the bank holds:
      | character | where          | item            | count |
      | Mulea     | pack 2, slot 5 | Cloak of Flames | 1     |
      | Muleb     | bank 3         | Pearl           | 4     |
    And Alice's bank request has the "DM me the plan" button for:
      | item            | quantity |
      | Cloak of Flames | 1        |
      | Pearl           | 2        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Cloak of Flames in pack 2, slot 5

      **Log in to Muleb**
      • 2 × Pearl in bank 3
      """
    And Dana is told "Sent you the plan by DM."
    And nothing new is posted in #bank-requests

  Scenario: The plan visits the fewest characters that fill the request
    Given the bank holds:
      | character | where          | item            | count |
      | Mulea     | pack 1, slot 1 | Cloak of Flames | 1     |
      | Muleb     | pack 1, slot 1 | Cloak of Flames | 1     |
      | Muleb     | pack 1, slot 2 | Pearl           | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item            | quantity |
      | Cloak of Flames | 1        |
      | Pearl           | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Muleb**
      • Cloak of Flames in pack 1, slot 1
      • Pearl in pack 1, slot 2
      """

  Scenario: A line one character can't fill is taken from two
    Given the bank holds:
      | character | where           | item  | count |
      | Mulea     | pack 1, slot 1  | Pearl | 3     |
      | Muleb     | pack 4, slot 2  | Pearl | 2     |
      | Muleb     | pack 10, slot 1 | Pearl | 5     |
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 9        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • 3 × Pearl in pack 1, slot 1

      **Log in to Muleb**
      • 2 × Pearl in pack 4, slot 2
      • 4 × Pearl in pack 10, slot 1
      """

  Scenario: A DKP auction line is listed on its own, with no login
    Given the bank holds:
      | character | where          | item          | count |
      | Mulea     | pack 1, slot 1 | Spell: Bedlam | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item          | quantity | from        |
      | Spell: Bedlam | 1        | DKP auction |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **DKP auction, no login**
      • Spell: Bedlam
      """

  Scenario: A multiquest line is listed on its own, with no login
    Given Alice's bank request has the "DM me the plan" button for:
      | item          | quantity | from       |
      | Crushed Topaz | 2        | multiquest |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Multiquest, no login**
      • 2 × Crushed Topaz
      """

  Scenario: The plan says when the bank doesn't have enough
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item            | quantity |
      | Pearl           | 3        |
      | Cloak of Flames | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Pearl in pack 1, slot 1

      **Not enough in the bank**
      • Pearl: has 1, needs 3
      • Cloak of Flames: has 0, needs 1
      """

  Scenario: The plan follows the bank as it is when the banker presses the button
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    And the bank now holds:
      | character | where          | item  | count |
      | Muleb     | bank 2         | Pearl | 1     |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Muleb**
      • Pearl in bank 2
      """

  Scenario: A NO DROP item in the bank is never planned
    Given the bank holds:
      | character | where          | item                  | count |
      | Mulea     | pack 1, slot 1 | Enchanted Velium Mask | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item                  | quantity |
      | Enchanted Velium Mask | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Not enough in the bank**
      • Enchanted Velium Mask: has 0, needs 1
      """

  Scenario: The plan takes one from a slot with no count or a count of 0
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl |       |
      | Mulea     | pack 1, slot 2 | Pearl | 0     |
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 2        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Pearl in pack 1, slot 1
      • Pearl in pack 1, slot 2
      """

  Scenario: A bag is planned from whichever character holds it, Sky mule or not
    Given the bank holds:
      | character  | where  | item              | count |
      | Cgstorageb | bank 1 | Feather Lined Bag | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item              | quantity |
      | Feather Lined Bag | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Cgstorageb**
      • Feather Lined Bag in bank 1
      """

  Scenario: A long plan comes as several DMs, each within Discord's 2,000 characters
    Given the bank holds 1 Pearl in each of 150 bank bag slots on Mulea
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 150      |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent 3 DMs of at most 2,000 characters
    And Dana's second DM opens with "**Log in to Mulea** (continued)"
    And Dana's DMs list 150 Pearls

  Scenario: A member who isn't a banker is told no
    Given Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    When Alice presses "DM me the plan" on Alice's request
    Then Alice is told "Error: Must have @Banker role to use this command."
    And no one is sent a DM

  Scenario: A banker who doesn't take DMs is told to allow them
    Given Dana doesn't take DMs
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is told "I couldn't DM you the plan. Allow DMs from this server's members, then press the button again."

  Scenario: A banker whose DM fails for another reason is told it went wrong
    Given Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    And Discord can't deliver DMs
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is told "Discord didn't take the plan. Press the button again in a minute."
