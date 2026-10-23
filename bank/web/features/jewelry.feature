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

  Scenario: The jewelry post for an item the bank holds none of has no "made to order" line
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 1 "Black Sapphire Velium Necklace" to my tab
    And I open my tab
    And I send my tab to Discord
    Then the post doesn't read "Made to order."

  Scenario: A post the site refuses keeps its items on my tab, and the one that went through comes off
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 1 "Cloak of Flames" to my tab
    And I add 1 "Black Sapphire Velium Necklace" to my tab
    And I open my tab
    And the site refuses posts to #jewelry-requests with 502
    When I send my tab to Discord
    And I confirm the post
    Then I'm told "Couldn't post it. Try again in a moment."
    And #bank-requests gets my request for "Cloak of Flames"
    And my tab doesn't list "Cloak of Flames"
    And my tab lists "Black Sapphire Velium Necklace"
    When the site accepts posts to #jewelry-requests again
    And I send my tab to Discord again
    And I confirm the retry
    Then I'm told "Posted to #bank-requests and #jewelry-requests"
    And the tab button shows "0pp"

  Scenario: A mixed tab that posts in full says where both posts went
    Given the jewelers also make jewelry to order
    And I have opened the bank page
    When I add 1 "Cloak of Flames" to my tab
    And I add 1 "Black Sapphire Velium Necklace" to my tab
    And I open my tab
    And I send my tab to Discord
    And I confirm the post
    Then I'm told "Posted to #bank-requests and #jewelry-requests"

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
