Feature: Request cards follow the logins, then item order
  A banker goes through the request's cards by login. Cards at the same login stop keep the
  order of their item ids, and cards at a later stop come after.

  Scenario: Cards at the same login keep item order, not the order they were added
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Bone Chips" to my tab
    And I have added "Cloak of Flames" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "1 login: Mulea"
    And I confirm the post
    Then #bank-requests gets my request for "Cloak of Flames", "Bone Chips"

  Scenario: A card whose login comes later in the route comes after
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have added "Scaled Tunic" to my tab
    And I have added "Cloak of Flames" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "2 logins: Mulea, Muleb"
    And I confirm the post
    Then #bank-requests gets my request for "Cloak of Flames", "Scaled Tunic"
