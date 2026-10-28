Feature: Getting the plan for a bank request
  A banker who reacts 👀 to a bank request is sent a DM with the plan: which characters to log in to, in
  order, the account and password for each, and what to take from where on each, from the bank as it is
  right then. Only characters whose account the shared accounts sheet lets bankers use are planned from,
  so no spot is named that a banker can't log in to. Any other spot, on a character a banker can log
  in to, holding an item the request takes from the bank is listed as a backup. Anyone else's 👀 does
  nothing, and no 👀 gets a reply in any channel.

  Background:
    Given Alice is a Castle member
    And Dana is a Castle banker
    And the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password   | Officers | Knights | Guards | Bankers | Raiders |
      | 2   | Mulea      | Wizard | mulea1  | test-mulea | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |
      | 3   | Muleb      | Cleric | muleb1  | test-muleb | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |
      | 4   | Cgstorageb | Rogue  | cgs1    | test-cgs   | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |

  Scenario: A banker who reacts 👀 is sent the plan by DM
    Given the bank holds:
      | character | where          | item            | count |
      | Mulea     | pack 2, slot 5 | Cloak of Flames | 1     |
      | Muleb     | bank 3         | Pearl           | 4     |
    And Alice's bank request is saved with a plan for:
      | item            | quantity |
      | Cloak of Flames | 1        |
      | Pearl           | 2        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Cloak of Flames in pack 2, slot 5

      **Log in to Muleb**
      • Account: `muleb1`
      • Password: `test-muleb`
      • 2 × Pearl in bank 3
      """
    And nothing new is posted in #bank-requests

  Scenario: The plan visits the fewest characters that fill the request
    Given the bank holds:
      | character | where          | item            | count |
      | Mulea     | pack 1, slot 1 | Cloak of Flames | 1     |
      | Muleb     | pack 1, slot 1 | Cloak of Flames | 1     |
      | Muleb     | pack 1, slot 2 | Pearl           | 1     |
    And Alice's bank request is saved with a plan for:
      | item            | quantity |
      | Cloak of Flames | 1        |
      | Pearl           | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Muleb**
      • Account: `muleb1`
      • Password: `test-muleb`
      • Cloak of Flames in pack 1, slot 1
      • Pearl in pack 1, slot 2

      **Backups, if a spot is empty**
      • Cloak of Flames: pack 1, slot 1 on Mulea, account `mulea1`, password `test-mulea`
      """

  Scenario: A line one character can't fill is taken from two
    Given the bank holds:
      | character | where           | item  | count |
      | Mulea     | pack 1, slot 1  | Pearl | 3     |
      | Muleb     | pack 4, slot 2  | Pearl | 2     |
      | Muleb     | pack 10, slot 1 | Pearl | 5     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 9        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • 3 × Pearl in pack 1, slot 1

      **Log in to Muleb**
      • Account: `muleb1`
      • Password: `test-muleb`
      • 2 × Pearl in pack 4, slot 2
      • 4 × Pearl in pack 10, slot 1
      """

  Scenario: A DKP auction line is listed on its own, with no login
    Given the bank holds:
      | character | where          | item          | count |
      | Mulea     | pack 1, slot 1 | Spell: Bedlam | 1     |
    And Alice's bank request is saved with a plan for:
      | item          | quantity | from        |
      | Spell: Bedlam | 1        | DKP auction |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **DKP auction, no login**
      • Spell: Bedlam
      """

  Scenario: A multiquest line is listed on its own, with no login
    Given Alice's bank request is saved with a plan for:
      | item          | quantity | from       |
      | Crushed Topaz | 2        | multiquest |
    When Dana reacts 👀 to Alice's request
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
    And Alice's bank request is saved with a plan for:
      | item            | quantity |
      | Pearl           | 3        |
      | Cloak of Flames | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Pearl in pack 1, slot 1

      **Not enough in the bank**
      • Pearl: has 1, needs 3
      • Cloak of Flames: has 0, needs 1
      """

  Scenario: The plan follows the bank as it is when the banker reacts
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    And the bank now holds:
      | character | where          | item  | count |
      | Muleb     | bank 2         | Pearl | 1     |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Muleb**
      • Account: `muleb1`
      • Password: `test-muleb`
      • Pearl in bank 2
      """

  Scenario: A NO DROP item in the bank is never planned
    Given the bank holds:
      | character | where          | item                  | count |
      | Mulea     | pack 1, slot 1 | Enchanted Velium Mask | 1     |
    And Alice's bank request is saved with a plan for:
      | item                  | quantity |
      | Enchanted Velium Mask | 1        |
    When Dana reacts 👀 to Alice's request
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
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 2        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Pearl in pack 1, slot 1
      • Pearl in pack 1, slot 2
      """

  Scenario: A bag held by a storage character is planned from that character
    Given the bank holds:
      | character  | where  | item              | count |
      | Cgstorageb | bank 1 | Feather Lined Bag | 1     |
    And Alice's bank request is saved with a plan for:
      | item              | quantity |
      | Feather Lined Bag | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Cgstorageb**
      • Account: `cgs1`
      • Password: `test-cgs`
      • Feather Lined Bag in bank 1
      """

  Scenario: A character whose account bankers can't use is never planned from
    Given the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password   | Officers | Knights | Guards | Bankers | Raiders |
      | 2   | Mulea      | Wizard | mulea1  | test-mulea | FALSE    | FALSE   | FALSE  | FALSE   | FALSE   |
      | 3   | Muleb      | Cleric | muleb1  | test-muleb | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
      | Muleb     | bank 2         | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Muleb**
      • Account: `muleb1`
      • Password: `test-muleb`
      • Pearl in bank 2
      """

  Scenario: A spot on an account bankers can't use is never listed as a backup
    Given the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password   | Officers | Knights | Guards | Bankers | Raiders |
      | 2   | Mulea      | Wizard | mulea1  | test-mulea | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |
      | 3   | Muleb      | Cleric | muleb1  | test-muleb | FALSE    | FALSE   | FALSE  | FALSE   | FALSE   |
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
      | Muleb     | pack 4, slot 2 | Pearl | 3     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Pearl in pack 1, slot 1
      """

  Scenario: A spot a banker can log in to is listed as a backup
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
      | Muleb     | pack 4, slot 2 | Pearl | 3     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Pearl in pack 1, slot 1

      **Backups, if a spot is empty**
      • Pearl: pack 4, slot 2 on Muleb, account `muleb1`, password `test-muleb`
      """

  Scenario: A long plan comes as several DMs, each within Discord's 2,000 characters
    Given the bank holds 1 Pearl in each of 150 bank bag slots on Mulea
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 150      |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent 3 DMs of at most 2,000 characters
    And Dana's second DM opens with "**Log in to Mulea** (continued)"
    And Dana's DMs list 150 Pearls

  Scenario: A bank request with no plan gets no DM when a banker reacts 👀
    Given Alice's bank request has no plan
    When Dana reacts 👀 to Alice's request
    Then no one is sent a DM
    And nothing new is posted in #bank-requests

  Scenario: A banker's other reactions send nothing
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👍 to Alice's request
    Then no one is sent a DM
    And nothing new is posted in #bank-requests

  Scenario: A banker whose DM fails for another reason is sent nothing
    Given Discord can't deliver DMs
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then no one is sent a DM
    And nothing new is posted in #bank-requests

  Scenario: A member who reacts 👀 is sent nothing
    Given Bob is a Castle member
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Bob reacts 👀 to Alice's request
    Then no one is sent a DM
    And nothing new is posted in #bank-requests

  Scenario: A banker's 👀 outside #bank-requests sends nothing
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for in #general:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request in #general
    Then no one is sent a DM

  Scenario: A bank request whose saved plan can't be read sends nothing
    Given Alice's bank request is saved with an unreadable plan
    When Dana reacts 👀 to Alice's request
    Then no one is sent a DM

  Scenario: A 👀 on a message Discord sends in part still sends the plan
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request, which Discord sends in part
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Pearl in pack 1, slot 1
      """

  Scenario: A password with a backtick is shown whole
    Given the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password    | Officers | Knights | Guards | Bankers | Raiders |
      | 2   | Mulea      | Wizard | mulea1  | test`mulea  | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `` test`mulea ``
      • Pearl in pack 1, slot 1
      """

  Scenario: A password with two backticks in a row is shown whole
    Given the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password | Officers | Knights | Guards | Bankers | Raiders |
      | 2   | Mulea      | Wizard | mulea1  | ab``cd   | FALSE    | FALSE   | FALSE  | TRUE    | FALSE   |
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: ``` ab``cd ```
      • Pearl in pack 1, slot 1
      """

  Scenario: A banker whose DMs are closed is sent nothing
    Given Dana doesn't take DMs
    And the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request is saved with a plan for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana reacts 👀 to Alice's request
    Then no one is sent a DM
    And nothing new is posted in #bank-requests

  Scenario: A post from before the 👀 reaction still sends its plan from its button
    Given the bank holds:
      | character | where          | item  | count |
      | Mulea     | pack 1, slot 1 | Pearl | 1     |
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is sent a DM:
      """
      **Bank request plan**

      **Log in to Mulea**
      • Account: `mulea1`
      • Password: `test-mulea`
      • Pearl in pack 1, slot 1
      """
    And Dana is told "Sent you the plan by DM."
    And nothing new is posted in #bank-requests

  Scenario: An old button whose plan can't be read tells the banker so
    Given Alice's bank request has an unreadable "DM me the plan" button
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is told "Error: This request's plan can't be read."
    And no one is sent a DM

  Scenario: A member who isn't a banker is told no when pressing an old button
    Given Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    When Alice presses "DM me the plan" on Alice's request
    Then Alice is told "Error: Must have @Banker role to use this command."
    And no one is sent a DM

  Scenario: A banker whose DMs are closed is told to allow them when pressing an old button
    Given Dana doesn't take DMs
    And Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is told "I couldn't DM you the plan. Allow DMs from this server's members, then press the button again."

  Scenario: A banker whose DM fails for another reason is told it went wrong when pressing an old button
    Given Alice's bank request has the "DM me the plan" button for:
      | item  | quantity |
      | Pearl | 1        |
    And Discord can't deliver DMs
    When Dana presses "DM me the plan" on Alice's request
    Then Dana is told "Discord didn't take the plan. Press the button again in a minute."
