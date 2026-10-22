Feature: Jewelry
  The guild's jewelers make jewelry to order, at the prices on their sheet. A member finds it in the
  one catalog like anything else, held or not, and requests it in the jewelers' "Jewelry:" format.
  Its details are the same as any item's. A member can order more than the bank holds, up to ten.

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

  Scenario: Jewelry the bank holds none of is not Sky
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I pick "Sky"
    Then the bank doesn't list "Black Sapphire Velium Necklace"

  Scenario: A member can order more jewelry than the bank holds
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 3 "Golden Cat Eye Bracelet" to my tab
    Then the tab button shows "39pp"

  Scenario: Jewelry stops at ten, and says so
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 10 "Golden Cat Eye Bracelet" to my tab
    And I add 1 "Golden Cat Eye Bracelet" to my tab
    Then I am told "Up to 10 Golden Cat Eye Bracelet per request"

  Scenario: The post for jewelry the bank holds none of says it's made to order
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 1 "Black Sapphire Velium Necklace" to my tab
    And I open my tab
    And I send my tab to Discord
    Then the post reads "Made to order."

  Scenario: A tab with bank items and jewelry shows a post for each channel
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 1 "Cloak of Flames" to my tab
    And I add 1 "Black Sapphire Velium Necklace" to my tab
    And I open my tab
    And I send my tab to Discord
    Then the post reads "Cloak of Flames"
    And the post reads "Black Sapphire Velium Necklace"
    And the post reads "#jewelry-requests"
