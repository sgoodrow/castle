Feature: Multiquest cards come last
  An item held only for multiquesting isn't fetched from its holder, so its card goes after the
  cards the banker fills at the bank, even when a character who holds it is also on the login route.

  Scenario: A multiquest card goes after the cards at a character on the route
    Given the bank also holds the Plane of Sky items
    And the bank also holds:
      | character | spot     | item  | count |
      | Gmskytwo  | General1 | Pearl | 1     |
    And I have opened the bank page
    And I have added "Griffon Eye" to my tab
    And I have added "Cloak of Flames" to my tab
    And I have added "Pearl" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "2 logins: Gmskytwo, Mulea"
    And the post reads, in order:
      | line                      |
      | • Gmskytwo (inventory 1)  |
      | • Mulea (pack 1, slot 2)  |
      | • Gmskytwo (multiquest)   |
