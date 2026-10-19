Feature: The bank's data
  The page gets who holds what from the bankers' inventory uploads, with each item's stats from
  the item database, the bankers' prices, and the icons and auctions in the wiki cache.

  # Who may see the bank is the signing-in feature's business; here the site runs in dev mode.
  Background:
    Given the site is in dev mode without sign-in

  Scenario: Items are listed under the uploads' spelling, with the item database's stats
    Given the bankers' uploads hold:
      | banker | spot     | item            | count |
      | mulea  | General1 | Cloak of flames | 1     |
    When Someone asks for the bank
    Then the bank lists:
      | banker | spot     | item            | count |
      | Mulea  | General1 | Cloak of flames | 1     |
    And the bank describes "Cloak of flames" by the item database, under that name, with its wiki page

  Scenario: NO DROP items and empty slots never leave the bank
    Given the bankers' uploads hold:
      | banker | spot     | item                 | count |
      | mulea  | General1 | Mask of the Deceiver | 1     |
      | mulea  | General2 | Empty                | 1     |
      | mulea  | General3 | (gone)               | 1     |
    When Someone asks for the bank
    Then the bank lists nothing
    And the bank is dated now

  Scenario: Only the spells the bank's items use are sent
    Given the bankers' uploads hold:
      | banker | spot     | item            | count |
      | mulea  | General1 | Cloak of Flames | 1     |
      | muleb  | Bank1    | Spell: Lifetap  | 1     |
    When Someone asks for the bank
    Then the bank sends the spells "Haste", "Lifetap"

  Scenario: Bankers' prices and the wiki's link, icon and auctions are added
    Given the bankers' uploads hold:
      | banker | spot     | item            | count | price |
      | mulea  | General1 | Cloak of Flames | 1     | 250p  |
    And the wiki cache has the page for "Cloak of Flames" with icon 77 and these Green sales:
      | date       | seller | price |
      | 2026-01-01 | Bo     | 900   |
    When Someone asks for the bank
    Then the bank describes "Cloak of Flames" with:
      | field | value                                         |
      | price | "250p"                                        |
      | wiki  | "https://wiki.project1999.com/Cloak_of_Flames" |
      | icon  | 77                                            |
      | green | [["2026-01-01", "Bo", 900]]                   |

  Scenario: Items the item database doesn't know are marked unknown
    Given the bankers' uploads hold:
      | banker | spot     | item        | count |
      | mulea  | General1 | Mystery Box | 1     |
    When Someone asks for the bank
    Then the bank describes "Mystery Box" as unknown, with its wiki page

  Scenario: Every item links to its wiki page from its name, before the wiki cache has it
    Given the bankers' uploads hold:
      | banker | spot     | item         | count |
      | mulea  | General1 | Mystery Box  | 1     |
    When Someone asks for the bank
    Then the bank describes "Mystery Box" with:
      | wiki | "https://wiki.project1999.com/Mystery_Box" |

  Scenario: An item in many spots is described once, and a missing count is one
    Given the bankers' uploads hold:
      | banker | spot     | item            | count |
      | mulea  | General1 | Cloak of Flames | 1     |
      | muleb  | Bank1    | Cloak of Flames |       |
    When Someone asks for the bank
    Then the bank lists:
      | banker | spot     | item            | count |
      | Mulea  | General1 | Cloak of Flames | 1     |
      | Muleb  | Bank1    | Cloak of Flames | 1     |
    And the bank describes 1 item

  Scenario: The bank is dated by the newest upload
    Given the bankers' uploads hold:
      | banker | spot     | item            | count | uploaded             |
      | mulea  | General1 | Cloak of Flames | 1     | 2026-05-01T00:00:00Z |
      | muleb  | Bank1    | Spell: Lifetap  | 1     | 2026-05-03T00:00:00Z |
    When Someone asks for the bank
    Then the bank is dated "2026-05-03T00:00:00.000Z"
