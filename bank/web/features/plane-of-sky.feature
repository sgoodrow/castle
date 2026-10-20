Feature: Plane of Sky
  The Sky mules hold the guild's Plane of Sky quest items. A member finds them under Sky,
  and requests them in #bank-requests like anything else, in the bot's "Sky:" format. Each is 250pp,
  once the member has won the DKP items its quest needs, which a banker checks. Efreeti weapons and
  items the Sky sheet marks "dkp bid" go to DKP auction. A banker's price still wins. Items are
  picked up at the East Freeport docks. Some items are held for multiquesting by characters the
  bankers don't log in to. A member requests those too, and a banker tells them how to set it up.

  Scenario: Sky lists only the Sky mules' items
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I pick "Sky"
    Then the bank lists only "Emerald Spiroc Feather", "Efreeti War Axe", "Bixie Stinger", "Backpack", "Kite Shield", "Efreeti Statuette", "Ethereal Amethyst", "Sky Sapphire", "Griffon Eye"
    And "Sky" is picked

  Scenario Outline: Sky items have the Sky prices
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    Then "<item>" is priced "<price>"
    And the price of "<item>" for anyone is explained as "<explanation>"

    Examples:
      | item                   | price       | explanation                                                                                                              |
      | Emerald Spiroc Feather | 250pp       | Island 4 quest item (fd ring): 250pp, once you've won the DKP items its quest needs. Pick up at the East Freeport docks. |
      | Efreeti Statuette      | 250pp       | Island 4 quest item: 250pp, once you've won the DKP items its quest needs. Pick up at the East Freeport docks.           |
      | Backpack               | 250pp       | Plane of Sky item: 250pp, once you've won the DKP items its quest needs. Pick up at the East Freeport docks.             |
      | Efreeti War Axe        | DKP         | A banker starts an auction at 1 DKP.                                                                                     |
      | Bixie Stinger          | DKP         | A banker starts an auction at 1 DKP.                                                                                     |
      | Kite Shield            | 100pp       | Set by a banker: 100p.                                                                                                   |
      | Ethereal Amethyst      | 250pp       | Islands 6 and 7 quest item: 250pp, once you've won the DKP items its quest needs. Pick up at the East Freeport docks.    |

  Scenario Outline: Each Sky request line is in the bot's Sky format
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    Then the request line for <count> "<item>" for anyone reads "<line>"

    Examples:
      | count | item                   | line                                         |
      | 1     | Emerald Spiroc Feather | Sky: Emerald Spiroc Feather (Cgskya, 2)      |
      | 2     | Emerald Spiroc Feather | Sky: Emerald Spiroc Feather (Cgskya, 2) x2   |
      | 1     | Efreeti Statuette      | Sky: Efreeti Statuette (Cgskya, 3)           |
      | 1     | Sky Sapphire           | Sky MQ: Sky Sapphire (held by Rabbie)        |
      | 2     | Griffon Eye            | Sky MQ: Griffon Eye (held by Kelra and Gmskytwo) x2 |

  Scenario: An Efreeti weapon is one DKP auction at a time
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I add 2 "Efreeti War Axe" to my tab
    Then I am told "One DKP auction at a time for Efreeti War Axe"
    And the tab button shows "1 DKP auction"

  Scenario: An item held only for multiquesting has no price, and a banker explains it
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    Then "Sky Sapphire" has no price
    And the price of "Sky Sapphire" for anyone is explained as "Island 2 quest item, held for a multiquest by Rabbie. A banker will tell you how to set it up."
    And the price of "Griffon Eye" for anyone is explained as "Plane of Sky item, held for a multiquest by Kelra and Gmskytwo. A banker will tell you how to set it up."

  Scenario: The details list multiquest holders with the bank's mules
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I click "Emerald Spiroc Feather" in the bank
    Then the page says "Bank location · 3"
    And the page says "Rabbie"
    And the page doesn't say "Held for multiquesting. Request it, and a banker will tell you how to set it up."

  Scenario: The details of an item only held for multiquesting say a banker will help
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I click "Griffon Eye" in the bank
    Then the page says "Bank location · 3"
    And the page says "Held for multiquesting. Request it, and a banker will tell you how to set it up."

  Scenario: A multiquest request goes to the holders, and the tab says a banker will help
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I add "Sky Sapphire" to my tab
    And I open my tab
    Then my tab says "A banker will tell you how to set up each multiquest."
    When I send my tab to Discord
    Then the post reads "• Sky Sapphire (unknown)"
    And the post reads "• Rabbie (multiquest)"

  Scenario: The bank's own stock is what a member can put on the tab
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I add 3 "Emerald Spiroc Feather" to my tab
    Then the tab button shows "500pp"
