Feature: Finding items
  A member looks through the bank by name, stats, slot and kind of item.

  Scenario: Everything in the bank is listed by name
    Given the bank holds the usual stock
    When I open the bank page
    Then the bank lists 9 items
    And the bank lists, in order:
      | item                  |
      | Bone Chips            |
      | Cloak of Flames       |
      | Fine Steel Long Sword |
      | Large Sewing Kit      |
      | Pearl                 |
      | Scaled Tunic          |
      | Spell: Aegolism       |
      | Spell: Lifetap        |
      | Spell: Splurt         |

  Scenario: Items that can't leave the bank aren't listed
    Given the bank holds the usual stock
    When I open the bank page
    Then the bank doesn't list "Shiny Brass Idol"

  Scenario Outline: Searching matches every word, in any case, against names and stats
    Given the bank holds the usual stock
    And I have opened the bank page
    When I search for "<search>"
    Then the bank lists only <shown>

    Examples:
      | search            | shown                   |
      | CLOAK             | "Cloak of Flames"       |
      | spell lifetap     | "Spell: Lifetap"        |
      | flame shield      | "Cloak of Flames"       |
      | 8/30              | "Fine Steel Long Sword" |
      | sword   steel     | "Fine Steel Long Sword" |
      | 10 slots          | "Large Sewing Kit"      |
      | nothing like this | nothing                 |

  Scenario: Nothing matching says how to find more
    Given the bank holds the usual stock
    And I have opened the bank page
    When I search for "nothing like this"
    Then the bank lists 0 items
    And the page says "Nothing in the bank matches. Try clearing a filter."

  Scenario: Clearing the search shows everything again
    Given the bank holds the usual stock
    And I have opened the bank page
    And I search for "cloak"
    When I clear the search
    Then the search box reads ""
    And the bank lists 9 items

  Scenario Outline: Things that aren't worn have their own filters
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick "<kind>"
    Then the bank lists only <shown>

    Examples:
      | kind   | shown                                                    |
      | Spells | "Spell: Aegolism", "Spell: Lifetap" and "Spell: Splurt" |
      | Bags   | "Large Sewing Kit"                                       |
      | Other  | "Bone Chips" and "Pearl"                                 |

  Scenario Outline: The doll filters by where an item is worn
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick the <slot> slot
    Then the <slot> slot is picked
    And the bank lists only <shown>

    Examples:
      | slot      | shown                   |
      | back      | "Cloak of Flames"       |
      | primary   | "Fine Steel Long Sword" |
      | secondary | "Fine Steel Long Sword" |
      | chest     | "Scaled Tunic"          |
      | head      | nothing                 |

  Scenario: Both ear slots are one filter
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick the ear slot
    Then the ear slots are picked

  Scenario: Picking a slot again turns it off
    Given the bank holds the usual stock
    And I have opened the bank page
    And I pick the back slot
    When I pick the back slot
    Then the back slot is not picked
    And the bank lists 9 items

  Scenario: A slot means gear, so picking a kind of item drops the slot
    Given the bank holds the usual stock
    And I have opened the bank page
    And I pick the back slot
    When I pick "Spells"
    Then the back slot is not picked
    And "Spells" is picked
    And the bank lists 3 items

  Scenario: Picking a slot drops the kind of item
    Given the bank holds the usual stock
    And I have opened the bank page
    And I pick "Spells"
    When I pick the back slot
    Then "Spells" is not picked
    And the bank lists only "Cloak of Flames"

  Scenario: Search combines with the other filters
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Necromancer
    When I search for "spell"
    Then the bank lists only "Spell: Lifetap" and "Spell: Splurt"

  Scenario: Clearing the filters turns everything off
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Necromancer
    And I pick the race "Iksar"
    And I pick "Spells"
    And I search for "life"
    When I clear the filters
    Then the class "Necromancer" is not picked
    And the race "Iksar" is not picked
    And "Spells" is not picked
    And the search box reads ""
    And the bank lists 9 items
    And I can not clear the filters

  Scenario Outline: Clearing is offered once something is filtered
    Given the bank holds the usual stock
    When I open the link "<link>"
    Then I <can> clear the filters

    Examples:
      | link        | can    |
      | /           | can not |
      | ?q=cloak    | can     |
      | ?class=NEC  | can     |
      | ?race=IKS   | can     |
      | ?kind=bag   | can     |
      | ?slot=back  | can     |

  Scenario: An empty bank
    Given the bank is empty
    When I open the bank page
    Then the bank lists 0 items
    And the page says "Nothing in the bank matches. Try clearing a filter."

  Scenario: The bank server is having trouble
    Given the bank server answers 500
    When I open the bank page
    Then the page says "Couldn't load the bank. The bank server answered 500. Try reloading."
