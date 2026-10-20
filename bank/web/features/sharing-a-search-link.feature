Feature: Sharing a search link
  The address holds the search and filters, so a member can paste a link and others see the same list.

  Scenario Outline: A shared link opens with its filters picked, whatever its case
    Given the bank holds the usual stock
    When I open the link "<link>"
    Then <picked> is picked

    Examples:
      | link         | picked                  |
      | ?class=nec   | the class "Necromancer" |
      | ?race=iks    | the race "Iksar"        |
      | ?slot=HEAD   | the head slot           |
      | ?kind=Sky    | "Sky"                   |

  Scenario: A shared link fills in the search
    Given the bank holds the usual stock
    When I open the link "?q=bone"
    Then the search box reads "bone"
    And the bank lists only "Bone Chips"

  Scenario Outline: Parts of a link the bank doesn't know are ignored
    Given the bank holds the usual stock
    When I open the link "<link>"
    Then the bank lists 8 items
    And I can not clear the filters

    Examples:
      | link               |
      | ?class=XYZ&kind=3  |
      | ?slot=tail&q=      |
      | ?colour=red        |
      | ?kind=bag          |

  Scenario: Picking filters writes them into the address
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick the class "Necromancer"
    And I pick the race "Iksar"
    And I pick the head slot
    And I search for "bone"
    Then the address reads "/?class=NEC&race=IKS&slot=head&q=bone"

  Scenario: A search with spaces makes an ordinary link
    Given the bank holds the usual stock
    And I have opened the bank page
    When I search for "a b"
    Then the address reads "/?q=a+b"

  Scenario: Picking a kind writes it into the address
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick "Spells"
    Then the address reads "/?kind=spell"

  Scenario: Clearing everything leaves a plain address
    Given the bank holds the usual stock
    And I have opened the link "?class=NEC&q=bone"
    When I clear the filters
    Then the address reads "/"
