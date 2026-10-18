Feature: Bank request pricing
  A member sees what the guild charges, gathers items on a tab, and sends the request to #bank-requests.

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
      | Spell: Aegolism  | a Cleric      | The lesser of 200pp (market 150pp) or 1 DKP (levels 55–60).                                    |
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

  Scenario: An item's details add it to my tab and take it off
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have clicked "Bone Chips" in the bank
    When I add one "Bone Chips" from its details
    Then I am told "Added Bone Chips to your tab"
    And I add one "Bone Chips" from its details
    And I am told "Bone Chips ×2 on your tab"
    And the details show "2/35" on my tab
    And I take one "Bone Chips" off my tab from its details
    And I am told "Bone Chips ×1 on your tab"
    And the tab button shows "1 unknown"

  Scenario: An item's details can't add more than the bank has
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have clicked "Cloak of Flames" in the bank
    When I add one "Cloak of Flames" from its details
    And I add one "Cloak of Flames" from its details
    Then I am told "The bank only has one, and it's on your tab"
    And the tab button shows "800pp"

  Scenario: Items a banker has to price are counted as unknown
    Given the bank holds the usual stock
    And I have opened the bank page
    When I add "Bone Chips" to my tab
    Then the tab button shows "1 unknown"
    And I add "Cloak of Flames" to my tab
    And the tab button shows "800pp + 1 unknown"
    And I open my tab
    And my tab says "800pp + 1 unknown"

  Scenario: Level 55 and up spells can be paid with DKP
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Cleric
    When I add "Spell: Aegolism" to my tab
    And I open my tab
    Then my tab says "Some spells can be paid with 1 DKP each instead."
    And "Spell: Aegolism" can be paid with DKP for a Cleric
    And "Scaled Tunic" can be paid with DKP for anyone

  Scenario Outline: The spell sheet's price beats the level rules
    Given the bank holds the usual stock
    And the bank also holds spells priced by the spell sheet
    And I have opened the bank page
    When I play <who>
    Then "<item>" is priced "<price>"
    And the price of "<item>" for <who> is explained as "<explanation>"

    Examples:
      | item                      | who           | price | explanation                              |
      | Spell: Aegis              | a Cleric      | 50pp  | Spell sheet price: 50pp.                 |
      | Spell: Gift of Brilliance | an Enchanter  | 200pp | Spell sheet price: 200pp or 1 DKP.       |

  Scenario: A forbidden spell is a request for a DKP auction
    Given the bank holds the usual stock
    And the bank also holds spells priced by the spell sheet
    And I have opened the bank page
    Then "Spell: Bedlam" is priced "DKP auction"
    And the price of "Spell: Bedlam" for anyone is explained as "DKP auction only. A banker starts a DKP auction for it."
    When I click "Spell: Bedlam" in the bank
    Then the page says "A banker starts a DKP auction for it."

  Scenario: A DKP auction is for one spell at a time
    Given the bank holds the usual stock
    And the bank also holds spells priced by the spell sheet
    And I have opened the bank page
    When I add 2 "Spell: Bedlam" to my tab
    Then I am told "One DKP auction at a time for Spell: Bedlam"
    And the tab button shows "1 DKP auction"

  Scenario: A DKP auction is counted apart from platinum
    Given the bank holds the usual stock
    And the bank also holds spells priced by the spell sheet
    And I have opened the bank page
    When I add "Spell: Bedlam" to my tab
    Then the tab button shows "1 DKP auction"
    And I add "Cloak of Flames" to my tab
    And I add "Bone Chips" to my tab
    And the tab button shows "800pp + 1 DKP auction + 1 unknown"
    And I open my tab
    And my tab says "800pp + 1 DKP auction + 1 unknown"
    And my tab says "A banker starts a DKP auction for each auction spell."
    When I send my tab to Discord
    Then the post reads "• Spell: Bedlam (DKP auction)"
    And the post reads "Total: 800pp + 1 DKP auction + 1 unknown"

  Scenario: Seeing the request as it will look in Discord
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    And I have added 3 "Pearl" to my tab
    And I have added "Bone Chips" to my tab
    When I open my tab
    Then my tab lists "Cloak of Flames", "3 × Pearl" and "Bone Chips"
    When I send my tab to Discord
    Then the post reads "@Alice has placed a bank request"
    And the post reads "• Cloak of Flames (800pp)"
    And the post reads "• 3 × Pearl (free)"
    And the post reads "Total: 800pp + 1 unknown"
    And the post reads "• Mulea (pack 1, slot 2)"
    And the post reads "• Muleb (bank 2) ×4"
    And the post doesn't read "✅"

  Scenario: Sending my tab to #bank-requests
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    And I have added 3 "Pearl" to my tab
    When I open my tab
    And I send my tab to Discord
    And I confirm the post
    Then #bank-requests gets my request for "Cloak of Flames", "Pearl"
    And I'm told "Posted to #bank-requests"
    And the tab button shows "0pp"

  Scenario: A post the site refuses stays on my tab
    Given the bank holds the usual stock
    And the site refuses posts with 429
    And I have opened the bank page
    And I have added "Cloak of Flames" to my tab
    When I open my tab
    And I send my tab to Discord
    And I confirm the post
    Then I'm told "That's a lot of requests. Try again in a few minutes." before it posts
    And nothing is posted
    And my tab lists "Cloak of Flames"

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
    Then my tab says "Nothing yet. Double-click an item, or use its + button."
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
