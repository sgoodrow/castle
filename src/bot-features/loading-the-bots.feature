Feature: Loading the bots
  The guild's bots come from the "Bot Info" tab of the public sheet. The bot stores them in its
  database, replacing them all at once, when it starts and every 15 minutes after. If the sheet
  can't be read or has a bad row, it keeps the bots it has, turns bot commands off and tells raid
  chat once, then tries again every minute until the sheet is fixed.

  Scenario: The sheet's bots replace the stored ones
    Given these bots are stored:
      | name  | class  |
      | Zayin | Cleric |
    And the "Bot Info" sheet has these rows:
      | row | Name  | Class   | Level | Current Location | Current Bot Pilot | Bind Location | Factioned | CoV Faction |
      | 2   | Aleph | Wizard  | 60    | Plane of Fear    | Bob               | North Qeynos  |           |             |
      | 3   |       |         |       |                  |                   |               |           |             |
      | 4   | Bet   | Cleric  | 59    | Plane of Hate    |                   | Kelethin      | x         | Ally        |
    When the bot starts
    Then bot commands are on
    And the stored bots are:
      | name  | class  | level | location      | pilot | bind         | factioned | faction |
      | Aleph | Wizard | 60    | Plane of Fear | Bob   | North Qeynos | no        |         |
      | Bet   | Cleric | 59    | Plane of Hate |       | Kelethin     | yes       | Ally    |
    And raid chat is told nothing

  Scenario: A bot can be flown by the roles the shared accounts sheet allows
    Given the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password | Officers | Knights | Guards | Bankers | Raiders |
      | 2   | Aleph      | Wizard | aleph1  | secret   | TRUE     | TRUE    | FALSE  | FALSE   | FALSE   |
      | 3   | Bet        | Cleric | bet1    | secret   | FALSE    | FALSE   | FALSE  | FALSE   | TRUE    |
    And the "Bot Info" sheet has these rows:
      | row | Name  | Class  |
      | 2   | Aleph | Wizard |
      | 3   | Bet   | Cleric |
      | 4   | Gimel | Rogue  |
    When the bot starts
    Then the stored bots are:
      | name  | required roles  |
      | Aleph | officer, knight |
      | Bet   | raider          |
      | Gimel |                 |

  Scenario: A bot taken off the shared accounts sheet needs no role at its next load
    Given the shared accounts sheet has these rows:
      | row | Characters | Class  | Account | Password | Officers |
      | 2   | Aleph      | Wizard | aleph1  | secret   | TRUE     |
    And the "Bot Info" sheet has these rows:
      | row | Name  | Class  |
      | 2   | Aleph | Wizard |
    When the bot starts
    And the shared accounts sheet has these rows:
      | row | Characters | Class | Account | Password | Officers |
    And 15 minutes pass
    Then the stored bots are:
      | name  | required roles |
      | Aleph |                |

  Scenario: A sheet without its "Bot Info" tab keeps the stored bots and turns bot commands off
    Given these bots are stored:
      | name  | class  |
      | Zayin | Cleric |
    And the public sheet has no "Bot Info" tab
    When the bot starts
    Then bot commands are off, saying:
      """
      The "Bot Info" sheet couldn't be loaded, so bot commands are off. A knight needs to fix the sheet and restart the bot.
      """
    And the stored bots are:
      | name  |
      | Zayin |
    And raid chat is told:
      """
      The bots couldn't be loaded from the "Bot Info" sheet, so bot commands are off. Fix the sheet and restart the bot (it also tries again every minute). The error: Error: Failed to load bot sheet data. Does it exist in the public sheet with name 'Bot Info'?
      """

  Scenario: A sheet that can't be read keeps the stored bots
    Given these bots are stored:
      | name  | class  |
      | Zayin | Cleric |
    And the "Bot Info" tab can't be read
    When the bot starts
    Then bot commands are off, saying:
      """
      The "Bot Info" sheet couldn't be loaded, so bot commands are off. A knight needs to fix the sheet and restart the bot.
      """
    And the stored bots are:
      | name  |
      | Zayin |
    And raid chat is told that:
      """
      The error: Error: Google Sheets didn't answer
      """

  Scenario: A bad row fails the whole load, naming every row to fix
    Given these bots are stored:
      | name  | class  |
      | Zayin | Cleric |
    And the "Bot Info" sheet has these rows:
      | row | Name  | Class  |
      | 2   | Aleph | Wizard |
      | 3   |       | Cleric |
      | 4   | Bet   |        |
      | 5   | aleph | Wizard |
      | 6   |       |        |
      | 7   | Gimel | Rogue  |
    When the bot starts
    Then bot commands are off, saying:
      """
      The "Bot Info" sheet couldn't be loaded, so bot commands are off. A knight needs to fix the sheet and restart the bot.
      """
    And the stored bots are:
      | name  |
      | Zayin |
    And raid chat is told that:
      """
      The error: Error: these rows need fixing:
      • Row 3: no name
      • Row 4 (Bet): no class
      • Row 5 (aleph): the name is on an earlier row too
      """

  Scenario: Raid chat hears once when the sheet breaks, and once when it's fixed
    Given the public sheet has no "Bot Info" tab
    When the bot starts
    And 3 minutes pass
    Then raid chat has been told 1 time
    Given the "Bot Info" sheet has these rows:
      | row | Name  | Class  |
      | 2   | Aleph | Wizard |
    When 1 minute passes
    Then bot commands are on
    And the stored bots are:
      | name  |
      | Aleph |
    And raid chat is told:
      """
      The bots load from the "Bot Info" sheet again.
      """
    And raid chat has been told 2 times

  Scenario: A sheet that loads is read again every 15 minutes
    Given the "Bot Info" sheet has these rows:
      | row | Name  | Class  |
      | 2   | Aleph | Wizard |
    When the bot starts
    And the "Bot Info" sheet has these rows:
      | row | Name | Class  |
      | 2   | Bet  | Cleric |
    And 14 minutes pass
    Then the stored bots are:
      | name  |
      | Aleph |
    When 1 minute passes
    Then the stored bots are:
      | name |
      | Bet  |

  Scenario: Raid chat is told once Discord can be reached again
    Given the public sheet has no "Bot Info" tab
    And Discord can't be reached
    When the bot starts
    Then raid chat has been told 0 times
    And the log says "bot sheet: couldn't tell raid chat: Error: Discord can't be reached"
    Given Discord can be reached again
    When 1 minute passes
    Then raid chat has been told 1 time

  Scenario: A row that ends in blank cells still loads
    Google Sheets leaves those cells out of the row altogether.
    Given the "Bot Info" sheet has these rows:
      | row | Name  | Class  | Level | Current Location | Current Bot Pilot | Bind Location | Factioned | CoV Faction | Date and Time (EST) of pilot login |
      | 2   | Aleph | Wizard | 60    |                  |                   |               |           |             |                                    |
    When the bot starts
    Then bot commands are on
    And the stored bots are:
      | name  | level | location | pilot | bind | factioned | faction | checkout |
      | Aleph | 60    |          |       |      | no        |         |          |

  Scenario: A padded name is stored trimmed, the way the bot checks it
    Given the "Bot Info" sheet has a Rogue named with spaces around it: "Gimel"
    When the bot starts
    Then the stored bots are:
      | name  |
      | Gimel |
