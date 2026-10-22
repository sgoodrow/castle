Feature: Filling a request in few logins
  A banker fills a request by logging in to the bank characters that hold its items. The post
  plans the fewest logins that fill every line, names them under the total, and orders the item
  cards by them, so a banker logs in to each character once for the whole request.

  Scenario: One character that holds everything is the only login
    Given the bank holds the usual stock
    And the bank also holds:
      | character | spot     | item           | count |
      | Mulec     | General1 | Bone Chips     | 3     |
      | Mulec     | General2 | Spell: Lifetap | 1     |
      | Mulec     | General3 | Spell: Splurt  | 1     |
    And I have opened the bank page
    And I have added "Spell: Lifetap" to my tab
    And I have added "Spell: Splurt" to my tab
    And I have added "Bone Chips" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "1 login: Mulec"
    And the post reads, in order:
      | line                          |
      | • Mulec (inventory 2)         |
      | • Mulea (inventory 2)         |
      | • Mulec (inventory 1) ×3      |
      | • Mulea (pack 5, slot 1) ×20  |
      | • Mulec (inventory 3)         |
      | • Muleb (bank 5) ×2           |

  Scenario: The item cards follow the logins
    Given the bank holds the usual stock
    And the bank also holds:
      | character | spot     | item           | count |
      | Mulec     | General1 | Bone Chips     | 3     |
      | Mulec     | General2 | Spell: Lifetap | 1     |
      | Mulec     | General3 | Spell: Splurt  | 1     |
    And I have opened the bank page
    And I have added "Fine Steel Long Sword" to my tab
    And I have added "Spell: Lifetap" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "2 logins: Mulea, Muleb"
    When I confirm the post
    Then #bank-requests gets my request for "Spell: Lifetap", "Fine Steel Long Sword"

  Scenario: A line needs a second login when one character doesn't hold enough
    Given the bank holds the usual stock
    And the bank also holds:
      | character | spot     | item           | count |
      | Mulec     | General1 | Bone Chips     | 3     |
      | Mulec     | General2 | Spell: Lifetap | 1     |
      | Mulec     | General3 | Spell: Splurt  | 1     |
    And I have opened the bank page
    And I have added 21 "Bone Chips" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "2 logins: Mulea, Muleb"

  Scenario: The cards can list only the planned logins' spots
    Given the bank holds the usual stock
    And the bank also holds:
      | character | spot     | item           | count |
      | Mulec     | General1 | Bone Chips     | 3     |
      | Mulec     | General2 | Spell: Lifetap | 1     |
      | Mulec     | General3 | Spell: Splurt  | 1     |
    And I have opened the bank page
    And the request cards list only the planned logins' spots
    And I have added "Spell: Lifetap" to my tab
    And I have added "Spell: Splurt" to my tab
    And I have added "Bone Chips" to my tab
    When I open my tab
    And I send my tab to Discord
    Then the post reads "1 login: Mulec"
    And the post reads "• Mulec (inventory 1) ×3"
    And the post reads "…and 2 more on other characters"
    And the post doesn't read "Mulea"
    And the post doesn't read "Muleb"
