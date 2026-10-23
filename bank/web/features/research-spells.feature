Feature: Research spells and components
  The research mules hold the spells the research bankers list, and the Words, Runes and pages
  those spells take. The bank gives them away, so each is 0pp. A member requests them in the bot's
  "Research spell:" and "Research component:" formats, and picks them up at North Freeport Bank.
  A banker's price still wins.

  Scenario Outline: Research items are free
    Given the bank also holds research spells and components
    And I have opened the bank page
    Then "<item>" is priced "<price>"
    And the price of "<item>" for anyone is explained as "<explanation>"

    Examples:
      | item             | price | explanation                                                   |
      | Words of Odus    | 0pp   | Research components are free. Pick up at North Freeport Bank. |
      | Spell: Lich      | 0pp   | Research spells are free. Pick up at North Freeport Bank.     |
      | Rune of Ap`Sagor | 5pp   | Set by a banker: 5p.                                          |

  Scenario Outline: Each research request line is in the bot's research format
    Given the bank also holds research spells and components
    And I have opened the bank page
    Then the request line for <count> "<item>" for <who> reads "<line>"

    Examples:
      | count | item          | who              | line                                          |
      | 1     | Words of Odus | anyone           | Research component: Words of Odus             |
      | 3     | Words of Odus | anyone           | Research component: Words of Odus x3          |
      | 1     | Spell: Lich   | a Necromancer    | Research spell: Necromancer, 49, Lich         |
      | 1     | Spell: Lich   | anyone           | Research spell: Shadow Knight, 60, Lich       |

  Scenario: The details say where to pick a research item up
    Given the bank also holds research spells and components
    And I have opened the bank page
    When I click "Words of Odus" in the bank
    Then the page says "Bank location · 9"
    And the page says "Pick up at North Freeport Bank."

  Scenario: A research request costs nothing
    Given the bank also holds research spells and components
    And I have opened the bank page
    When I add 3 "Words of Odus" to my tab
    Then the tab button shows "0pp"
    When I open my tab
    And I send my tab to Discord
    Then the post reads "• 3 × Words of Odus (0pp)"
    And the post doesn't read "Pick up at"
