Feature: Jewelry
  The guild's jewelers make jewelry to order, at the prices on their sheet. A member finds it in the
  one catalog like anything else, held or not, under Jewelry too, and requests it in the jewelers'
  "Jewelry:" format. The details say what the guild spends on the materials, since a member who
  brings some pays only for the rest, and owns the risk of a failed combine.

  Scenario: Jewelry is listed whether or not the bank holds any
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I pick "Jewelry"
    Then the bank lists only "Golden Cat Eye Bracelet", "Black Sapphire Velium Necklace"
    And "Jewelry" is picked

  Scenario Outline: Jewelry has the jewelers' price
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    Then "<item>" is priced "<price>"
    And the price of "<item>" for anyone is explained as "Made to order by the guild's jewelers."

    Examples:
      | item                           | price |
      | Golden Cat Eye Bracelet        | 13pp  |
      | Black Sapphire Velium Necklace | 822pp |

  Scenario Outline: Each jewelry request line is in the jewelers' format
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    Then the request line for <count> "<item>" for anyone reads "<line>"

    Examples:
      | count | item                           | line                                             |
      | 1     | Black Sapphire Velium Necklace | Jewelry: Black Sapphire Velium Necklace, 1 (822pp) |
      | 3     | Golden Cat Eye Bracelet        | Jewelry: Golden Cat Eye Bracelet, 3 (39pp)        |

  Scenario: A member can order more jewelry than the bank holds
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 3 "Golden Cat Eye Bracelet" to my tab
    Then the tab button shows "39pp"

  Scenario: The details show what the materials cost the guild
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I click "Black Sapphire Velium Necklace" in the bank
    Then the page says:
      | text                                                                                          |
      | Made to order                                                                                 |
      | Bar                                                                                           |
      | 252pp                                                                                         |
      | Gem                                                                                           |
      | 350pp                                                                                         |
      | 86%                                                                                           |
      | Bring your own materials and pay only for the ones the guild provides. A failed combine is on you. |

  Scenario: The post for jewelry the bank holds none of says it's made to order
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 1 "Black Sapphire Velium Necklace" to my tab
    And I open my tab
    And I send my tab to Discord
    Then the post reads "Made to order."
