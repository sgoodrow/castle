Feature: DKP auction lines take no login
  A DKP auction isn't fetched from the bank, so its holders aren't logins. The banker logs in only
  to the characters the rest of the request needs.

  Scenario: A forbidden spell doesn't add its holder to the logins
    Given the bank also holds spells priced by the spell sheet
    And I have opened the bank page
    And I have added "Spell: Bedlam" to my tab
    And I have added "Bone Chips" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "1 login: Mulea"
    And the post reads, in order:
      | line                     |
      | Mulea (pack 5, slot 1) |
      | Mulec (inventory 1)    |
