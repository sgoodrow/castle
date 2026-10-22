Feature: Request cards keep tab order when they share a login
  Two items picked up from the same character at the same stop keep the order
  they were added to the request, on their cards.

  Scenario: Items from the same login keep their tab order
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Bone Chips" to my tab
    And I have added "Cloak of Flames" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "1 login: Mulea"
    And I confirm the post
    Then #bank-requests gets my request for "Cloak of Flames", "Bone Chips"
