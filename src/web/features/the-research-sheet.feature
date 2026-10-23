Feature: The research sheet
  The research bankers list each class's research spells, and the components they take, in a tab
  per class of their "Research Spells & Components" Google Sheet. The bank gives those away. The
  site reads the sheet in the background and marks the items the research mules hold that the sheet
  lists. The research mules also hold things the sheet doesn't list, and the sheet lists everyday
  items other bankers hold too, so an item needs both.

  Background:
    Given the site is in dev mode without sign-in
    And the bankers' uploads hold:
      | banker     | spot     | item                   | count |
      | cgnecro    | General1 | Words of Odus          | 7     |
      | cgstorageb | General1 | Words of Odus          | 2     |
      | cgnecro    | General2 | Words of Haunting      | 1     |
      | cgwiz      | General1 | Rune of Ap`Sagor       | 1     |
      | cgenc      | General1 | Velishoul's Tome Pg.68 | 1     |
      | cgmage     | General1 | Spell: Burnout IV      | 1     |
      | cgnecro    | Chest    | Gnome Skin Tunic       | 1     |
      | mulea      | General1 | Dagger                 | 1     |

  Scenario: Listed items the research mules hold are given away
    Given the research sheet's Necromancer tab is:
      """
      Spell,Level,Title,Count
      Words of Odus,,Words of Odus,
      ,,Words of Haunting,
      """
    And the research sheet's Magician tab is:
      """
      Spell,Component List
      Elemental: Air,Dagger
      """
    When the site reads the research sheet
    And Someone asks for the bank
    Then the bank gives away "Words of Odus", "Words of Haunting"
    And the bank doesn't give away "Dagger", "Gnome Skin Tunic", "Spell: Burnout IV"

  Scenario: The sheet's spelling of a name still finds the item
    Given the research sheet's Wizard tab is:
      """
      Spell,Name of Rune
      ,Rune of Ap'Sagor
      """
    And the research sheet's Enchanter tab is:
      """
      Spell,Page Name
      ,Velishoul's Tome Pg. 68 (Left)
      """
    When the site reads the research sheet
    And Someone asks for the bank
    Then the bank gives away "Rune of Ap`Sagor", "Velishoul's Tome Pg.68"

  Scenario: Names that are no item are logged
    Given the research sheet's Necromancer tab is:
      """
      Spell,Title
      Words of Odus,Words of Nothing
      ,Words of Nothing
      """
    When the site reads the research sheet
    Then the log says "bank web: research sheet: no such item Spell: Words of Odus, Words of Nothing"

  Scenario: A copy is kept, so the bank still knows its research items when Google is down
    Given a saved copy of the research sheet lists "Words of Odus"
    And Google answers the research sheet with 500
    When the site reads the research sheet
    And Someone asks for the bank
    Then the bank gives away "Words of Odus"
    And the log says "bank web: research sheet: Error: tab 1540745837: HTTP 500"

  Scenario: A tab without its columns keeps the old copy
    Given a saved copy of the research sheet lists "Words of Odus"
    And the research sheet's Wizard tab is:
      """
      Something else entirely
      """
    When the site reads the research sheet
    And Someone asks for the bank
    Then the bank gives away "Words of Odus"
    And the log says "bank web: research sheet: Error: no Spell and Name of Rune columns"

  Scenario: Bankers are told when the research sheet names no such item
    Given the bank office is set up
    And the research sheet's Necromancer tab is:
      """
      Spell,Level,Title,Count
,,Words of Nothing,
      """
    When the site reads the research sheet
    Then the bank office is told "The research sheet has a problem: no such item Words of Nothing."
    And the bank office has been told 1 time

  Scenario: Bankers are told when the research sheet can't be read, and when it reads again
    Given the bank office is set up
    And Google answers the research sheet with 500
    When the site reads the research sheet
    And the site reads the research sheet
    Then the bank office is told "The research sheet has a problem: it couldn't be read, so the bank keeps its last copy if it has one."
    And the bank office has been told 1 time
    Given Google answers the research sheet with 200
    When the site reads the research sheet
    Then the bank office is told "The research sheet reads again."
    And the bank office has been told 2 times
