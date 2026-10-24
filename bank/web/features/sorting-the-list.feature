Feature: Sorting the list
  A member orders the bank by name or by what their class would pay, and a link keeps the order.

  Scenario: The list starts A to Z
    Given the bank holds the usual stock
    When I open the bank page
    Then "Item" is sorted ascending
    And "Guild price" is sorted none

  Scenario: Sorting by price puts the cheapest first, with no known price counted as 0, ties by name
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Necromancer
    When I sort by "Guild price"
    Then "Guild price" is sorted ascending
    And "Item" is sorted none
    And the address reads "/?class=NEC&sort=price"
    And the bank lists, in order:
      | item             |
      | Bone Chips       |
      | Pearl            |
      | Spell: Lifetap   |
      | Spell: Splurt    |
      | Scaled Tunic     |
      | Cloak of Flames  |

  Scenario: Sorting by price again puts the priciest first, with ties still A to Z
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Necromancer
    And I have sorted by "Guild price"
    When I sort by "Guild price" again
    Then "Guild price" is sorted descending
    And the address reads "/?class=NEC&sort=-price"
    And the bank lists, in order:
      | item             |
      | Cloak of Flames  |
      | Scaled Tunic     |
      | Spell: Splurt    |
      | Bone Chips       |
      | Pearl            |
      | Spell: Lifetap   |

  Scenario: Spells that go to DKP auction sort above any platinum price
    Given the bank holds the usual stock
    And the bank also holds spells priced by the spell sheet
    And I have opened the bank page
    When I sort by "Guild price"
    Then the bank lists, in order:
      | item                      |
      | Bone Chips                |
      | Fine Steel Long Sword     |
      | Pearl                     |
      | Spell: Lifetap            |
      | Spell: Aegis              |
      | Spell: Splurt             |
      | Spell: Aegolism           |
      | Spell: Gift of Brilliance |
      | Scaled Tunic              |
      | Cloak of Flames           |
      | Spell: Bedlam             |

  Scenario: Sorting by name again goes Z to A, and once more back to A to Z
    Given the bank holds the usual stock
    And I have opened the bank page
    And I search for "spell"
    When I sort by "Item"
    Then "Item" is sorted descending
    And the address reads "/?q=spell&sort=-name"
    And the bank lists, in order:
      | item            |
      | Spell: Splurt   |
      | Spell: Lifetap  |
      | Spell: Aegolism |
    When I sort by "Item" again
    Then "Item" is sorted ascending
    And the address reads "/?q=spell"

  Scenario: Switching to the other column starts it low to high
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have sorted by "Item"
    When I sort by "Guild price"
    Then "Guild price" is sorted ascending
    And the address reads "/?sort=price"

  Scenario Outline: A shared link opens in its order, whatever its case
    Given the bank holds the usual stock
    When I open the link "<link>"
    Then "<column>" is sorted <how>

    Examples:
      | link         | column      | how        |
      | ?sort=price  | Guild price | ascending  |
      | ?sort=-PRICE | Guild price | descending |
      | ?sort=-name  | Item        | descending |
      | ?sort=cost   | Item        | ascending  |
