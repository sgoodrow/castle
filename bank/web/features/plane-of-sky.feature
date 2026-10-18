Feature: Plane of Sky
  The Sky mules hold the guild's Plane of Sky quest items. A member finds them under Plane of Sky,
  and requests them in #bank-requests like anything else, in the bot's "Sky:" format. Each is 250pp,
  once the member has won the DKP items its quest needs, which a banker checks. Efreeti weapons and
  items the Sky sheet marks "dkp bid" go to DKP auction. A banker's price still wins. Items are
  picked up at the East Freeport docks.

  Scenario: Plane of Sky lists only the Sky mules' items
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I pick "Plane of Sky"
    Then the bank lists only "Emerald Spiroc Feather", "Efreeti War Axe", "Bixie Stinger", "Backpack", "Kite Shield", "Efreeti Statuette"
    And "Plane of Sky" is picked

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
      | Efreeti War Axe        | DKP auction | Plane of Sky item. A banker starts a DKP auction. Pick up at the East Freeport docks.                                    |
      | Bixie Stinger          | DKP auction | Island 3 quest item (dkp bid). A banker starts a DKP auction. Pick up at the East Freeport docks.                        |
      | Kite Shield            | 100pp       | Set by a banker: 100p.                                                                                                   |

  Scenario Outline: Each Sky request line is in the bot's Sky format
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    Then the request line for <count> "<item>" for anyone reads "<line>"

    Examples:
      | count | item                   | line                                         |
      | 1     | Emerald Spiroc Feather | Sky: Emerald Spiroc Feather (Cgskya, 2)      |
      | 2     | Emerald Spiroc Feather | Sky: Emerald Spiroc Feather (Cgskya, 2) x2   |
      | 1     | Efreeti Statuette      | Sky: Efreeti Statuette (Cgskya, 3)           |

  Scenario: An Efreeti weapon is one DKP auction at a time
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    When I add 2 "Efreeti War Axe" to my tab
    Then I am told "One DKP auction at a time for Efreeti War Axe"
    And the tab button shows "1 DKP auction"
