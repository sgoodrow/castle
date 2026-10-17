Feature: Bank request pricing
  A member sees what the guild charges, gathers items on a tab, and pastes the request into #bank-requests.

  Scenario Outline: The guild price follows the bank's rules
    Given the bank holds the usual stock
    And I have opened the bank page
    When I play <who>
    Then "<item>" is priced "<price>"

    Examples:
      | item            | who           | price |
      | Cloak of Flames | anyone        | 800pp |
      | Spell: Splurt   | a Necromancer | 50pp  |
      | Pearl           | anyone        | free  |
      | Scaled Tunic    | anyone        | 300pp |

  Scenario: A price from a thin market is marked low confidence
    Given the bank holds the usual stock
    And I have opened the bank page
    When I play a Cleric
    Then "Spell: Aegolism" is priced "150pp" with low confidence

  Scenario Outline: Some items have to be priced by a banker, and bags aren't sold
    Given the bank holds the usual stock
    And I have opened the bank page
    When I play <who>
    Then "<item>" has no price

    Examples:
      | item             | who              |
      | Bone Chips       | anyone           |
      | Large Sewing Kit | anyone           |
      | Spell: Lifetap   | a Necromancer    |
      | Spell: Lifetap   | a Shadow Knight  |

  Scenario Outline: The price says what it's based on
    Given the bank holds the usual stock
    And I have opened the bank page
    Then the price of "<item>" for <who> is explained as "<explanation>"

    Examples:
      | item             | who           | explanation                                                                                      |
      | Cloak of Flames  | anyone        | About 800pp: 80% of the 1000pp Green median.                                                     |
      | Bone Chips       | anyone        | 80% of market rate. No recent Green sales to go by, so ask a banker.                             |
      | Scaled Tunic     | anyone        | Banker's price: 300p, 1dkp.                                                                      |
      | Spell: Splurt    | a Necromancer | 50pp (levels 51–54).                                                                             |
      | Spell: Aegolism  | a Cleric      | The lesser of 200pp (market 150pp) or 1 DKP (levels 55–60). Forbidden spells go to DKP auction. |
      | Spell: Lifetap   | a Necromancer | Level 1 spell. Ask a banker about price.                                                         |
      | Pearl            | anyone        | Free for raid use.                                                                               |
      | Large Sewing Kit | anyone        | Bags aren't for sale.                                                                            |

  Scenario Outline: Each request line is in the #bank-requests format
    Given the bank holds the usual stock
    And I have opened the bank page
    Then the request line for <count> "<item>" for <who> reads "<line>"

    Examples:
      | count | item            | who           | line                                                |
      | 1     | Cloak of Flames | anyone        | Misc item: Cloak of Flames (Mulea)                  |
      | 2     | Cloak of Flames | anyone        | Misc item: Cloak of Flames (Mulea) x2               |
      | 1     | Spell: Lifetap  | a Necromancer | Dropped spell: Necromancer, 1, Lifetap (Mulea, 1)   |
      | 1     | Spell: Lifetap  | anyone        | Dropped spell: Shadow Knight, 9, Lifetap (Mulea, 1) |
      | 1     | Spell: Splurt   | a Necromancer | Dropped spell: Necromancer, 52, Splurt (Muleb, 2)   |
      | 3     | Pearl           | anyone        | Raid Reagents: Pearl, 3                             |
      | 1     | Scaled Tunic    | anyone        | Misc item: Scaled Tunic (Muleb)                     |

  Scenario: Double-clicking an item puts it on my tab
    Given the bank holds the usual stock
    And I have opened the bank page
    When I add "Cloak of Flames" to my tab
    Then I am told "Added Cloak of Flames to your tab"
    And the tab button shows "800pp"

  Scenario: Adding more of the same counts up
    Given the bank holds the usual stock
    And I have opened the bank page
    When I add 2 "Pearl" to my tab
    Then I am told "Pearl ×2 on your tab"
    And the tab button shows "0pp"

  Scenario Outline: The tab can't hold more than the bank has
    Given the bank holds the usual stock
    And I have opened the bank page
    When I add <count> "<item>" to my tab
    Then I am told "<message>"

    Examples:
      | count | item            | message                                    |
      | 2     | Cloak of Flames | The bank only has one, and it's on your tab |
      | 5     | Pearl           | The bank only has 4, all on your tab       |

  Scenario: Bags aren't for sale
    Given the bank holds the usual stock
    And I have opened the bank page
    When I add "Large Sewing Kit" to my tab
    Then I am told "Large Sewing Kit isn't for sale"
    And the tab button shows "0pp"

  Scenario: Taking one off my tab
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added 2 "Pearl" to my tab
    When I take one "Pearl" off my tab
    Then I am told "Pearl ×1 on your tab"
    And I take one "Pearl" off my tab
    And I am told "Removed Pearl from your tab"

  Scenario: Items a banker has to price are left to ask about
    Given the bank holds the usual stock
    And I have opened the bank page
    When I add "Bone Chips" to my tab
    Then the tab button shows "ask"
    And I add "Cloak of Flames" to my tab
    And the tab button shows "800pp + ask"
    And I open my tab
    And my tab says "1 item needs a price from a banker."

  Scenario: Level 55 and up spells can be paid with DKP
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Cleric
    When I add "Spell: Aegolism" to my tab
    And I open my tab
    Then my tab says "Level 55+ spells can be paid with 1 DKP each instead."
    And "Spell: Aegolism" can be paid with DKP for a Cleric
    And "Scaled Tunic" can be paid with DKP for anyone

  Scenario: Copying the request to paste in Discord
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    And I have added 3 "Pearl" to my tab
    And I have added "Bone Chips" to my tab
    When I open my tab
    Then my tab lists "Cloak of Flames", "3 × Pearl" and "Bone Chips"
    And I copy the request
    And my clipboard holds a code block of:
      """
      Item            | Location | Count | Each |     Total
      ----------------|----------|-------|------|----------
      Cloak of Flames | Mulea    |     1 |  800 |       800
      Bone Chips      | Mulea    |     1 |  ask |       ask
      Pearl           | Muleb    |     3 |    0 |         0
      ----------------|----------|-------|------|----------
      GRAND TOTAL     |          |       |      | 800 + ask
      """

  Scenario: Removing a line from my tab
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    And I have added "Pearl" to my tab
    And I open my tab
    When I remove "Cloak of Flames" from my tab
    Then the tab button shows "0pp"

  Scenario: Clearing my tab
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    And I open my tab
    When I clear my tab
    Then my tab says "Nothing yet. Open an item and choose Add to tab."
    And the tab button shows "0pp"

  Scenario: An item on my tab opens its details
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Bone Chips" to my tab
    And I open my tab
    When I click "Bone Chips" on my tab
    Then the page says "Count · 35"

  Scenario: My tab is kept for next time
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    When I come back to the bank page
    Then the tab button shows "800pp"
