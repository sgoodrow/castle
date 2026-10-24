Feature: Who can use an item
  A member picks their character's class and race, and the bank shows what that character can use.

  Scenario Outline: Gear and spells a character can't use are hidden, everything else stays
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick the <picker> "<choice>"
    Then the bank doesn't list <hidden>
    And the bank lists <kept>

    Examples:
      | picker | choice      | hidden                  | kept                                                         |
      | class  | Necromancer | "Fine Steel Long Sword" | "Spell: Lifetap", "Bone Chips" and "Pearl"                     |
      | class  | Cleric      | "Fine Steel Long Sword" | "Spell: Aegolism", "Cloak of Flames" and "Scaled Tunic"       |
      | class  | Warrior     | "Spell: Aegolism"       | "Fine Steel Long Sword" and "Cloak of Flames"                 |
      | class  | Paladin     | "Spell: Aegolism"       | "Fine Steel Long Sword" and "Scaled Tunic"                   |
      | race   | Human       | "Scaled Tunic"          | "Fine Steel Long Sword" and "Cloak of Flames"                 |

  Scenario: Gear for one race is kept for that race
    Given the bank holds the usual stock
    And I have opened the bank page
    When I pick the race "Iksar"
    Then the bank lists "Scaled Tunic"

  Scenario: Anyone can use gear without class or race limits
    Given the bank holds the usual stock
    When I open the bank page
    Then the bank lists "Cloak of Flames", "Scaled Tunic" and "Fine Steel Long Sword"

  Scenario: An open item the character can't use is called out
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have clicked "Fine Steel Long Sword" in the bank
    When I play a Cleric
    Then the page says "Your character can't use this."

  Scenario: An open item the character can use says nothing
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have clicked "Fine Steel Long Sword" in the bank
    When I play a Warrior
    Then the page doesn't say "Your character can't use this."

  Scenario Outline: Only a class and race a character can be made with stay picked together
    Given the bank holds the usual stock
    And I have opened the bank page
    And I have picked the <first> "<first choice>"
    When I pick the <second> "<second choice>"
    Then the <second> "<second choice>" is picked
    And the <first> "<first choice>" is <kept>

    Examples:
      | first | first choice | second | second choice | kept       |
      | race  | Iksar        | class  | Monk          | picked     |
      | class | Monk         | race   | Iksar         | picked     |
      | class | Monk         | race   | Barbarian     | not picked |
      | race  | Barbarian    | class  | Monk          | not picked |
      | race  | Barbarian    | class  | Warrior       | picked     |

  Scenario: Picking a class again turns it off
    Given the bank holds the usual stock
    And I have opened the bank page
    And I play a Necromancer
    When I play a Necromancer
    Then the class "Necromancer" is not picked
    And the bank lists 8 items

  Scenario Outline: An item's classes are listed, or the ones left out, or ALL or NONE
    Then an item for <who> lists its classes as "<text>"

    Examples:
      | who                 | text           |
      | WAR PAL             | WAR PAL        |
      | everyone except WAR | ALL except WAR |
      | everyone            | ALL            |
      | no one              | NONE           |

  Scenario: The details say who can use an item
    Given the bank holds the usual stock
    And I have opened the bank page
    When I click "Scaled Tunic" in the bank
    Then the page says:
      | text       |
      | Class: ALL |
      | Race: IKS  |
