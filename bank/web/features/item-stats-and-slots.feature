Feature: Item stats and slots
  A member sees what an item does, where it's worn, who holds it and what it sells for on Green.

  Scenario Outline: Each row sums up the item
    Given the bank holds the usual stock
    When I open the bank page
    Then the row for "<item>" shows <stats>

    Examples:
      | item                  | stats                                                  |
      | Cloak of Flames       | "AC 10", "HP +5", "STR +3", "FR +10", "Worn: Flame Shield" |
      | Fine Steel Long Sword | "DMG 8/30"                                             |
      | Spell: Lifetap        | "SHD 9, NEC 1"                                         |

  Scenario: Opening gear shows its stats and where it's worn
    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Fine Steel Long Sword" in the bank
    Then the page says:
      | text                     |
      | Slot: Primary Secondary  |
      | Class: WAR PAL           |
    And the doll shows "Fine Steel Long Sword" fits the primary and secondary slots

  Scenario: Opening a spell shows who can scribe it, and at what level
    Levels past 60 are from later EverQuest expansions, so those classes can't scribe it on P99.

    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Spell: Lifetap" in the bank
    Then the page says "Class: SHD(9) NEC(1)"
    And the page doesn't say "Spell: Lifetap ·"
    And the page doesn't say "BRD(61)"
    When I play a Bard
    Then the page says "Your character can't use this."

  Scenario: Opening a bag shows its size
    Given the bank also holds the Plane of Sky items
    And I have opened the bank page
    Then the row for "Backpack" shows "8 slots, LARGE"
    When I click "Backpack" in the bank
    Then the page says "Capacity: 8 Size: LARGE"

  Scenario: A stack held by several bankers is counted together
    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Bone Chips" in the bank
    Then the page says:
      | text       |
      | Bank location · 35 |
      | Mulea ×20  |
      | Muleb ×15  |

  Scenario: Pointing at a banker shows where they keep it
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have clicked "Bone Chips" in the bank
    When I point at "Mulea ×20" among the holders
    Then the page says "pack 5, slot 1 · ×20"

  Scenario Outline: Bank spots read the way members say them
    Then the bank spot "<spot>" reads "<reads>"

    Examples:
      | spot           | reads              |
      | General1-Slot2 | pack 1, slot 2     |
      | General2       | inventory 2        |
      | Bank3-Slot4    | bank bag 3, slot 4 |
      | Bank3          | bank 3             |
      | Cursor         | cursor             |

  Scenario: A steady market shows its median and sales
    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Cloak of Flames" in the bank
    Then the page says "1000pp ± 141pp"
    And the page says "N=5"
    And the page doesn't say "Thin data"

  Scenario: A market with one sale is flagged as thin
    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Spell: Aegolism" in the bank
    Then the page says "Thin data"

  Scenario: An item nobody tracks on Green has no market data
    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Bone Chips" in the bank
    Then the page says "None"
