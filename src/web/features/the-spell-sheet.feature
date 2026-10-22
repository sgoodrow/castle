Feature: The spell sheet
  The bankers keep what each Kunark and Velious spell costs, and which spells only go to DKP
  auction, in their "Kunark/Velious Spells" Google Sheet. The site reads it in the background and
  sends each scroll's price with the bank. The forbidden list wins over a spell's Cost.

  Background:
    Given the site is in dev mode without sign-in
    And the bankers' uploads hold:
      | banker | spot     | item                  | count |
      | mulea  | General1 | Spell: Bedlam         | 1     |
      | mulea  | General2 | Spell: Aegis          | 1     |
      | mulea  | General3 | Spell: Gift of Brilliance | 1 |
      | mulea  | General4 | Cloak of Flames       | 1     |

  Scenario: Each scroll gets the sheet's price, and forbidden spells go to auction
    Given the spell sheet's "Enchanter Spells" tab is:
      """
      Level,Name,# In Bank,Banker,Cost,Last Updated
      60,Gift of Brilliance,5,Cgkench,200p OR 1DKP,"10/17/2026, ""restocked"""
      60,Bedlam,1,Cgkench,200p OR 1DKP,10/17/2026
      """
    And the spell sheet's "Cleric Spells" tab is:
      """
      Level,Name,# In Bank,Banker,Cost,Last Updated,
      57,Aegis,1,Cgkcleric,50p,10/15/2026,Price reduced
      """
    And the spell sheet's "Forbidden Spells" tab is:
      """
      Magician,Necromancer,Wizard,Enchanter
      Call of the Hero,Demi Lich,,Bedlam
      ,,,
      ,The spells on this list are for DKP auctions only.,,
      ,Removed:,,
      ,Gift of Brilliance 6-3-2023,,
      """
    When the site reads the spell sheet
    And Someone asks for the bank
    Then the bank describes "Spell: Bedlam" with:
      | field | value               |
      | sheet | {"kind": "auction"} |
    And the bank describes "Spell: Gift of Brilliance" with:
      | field | value                                |
      | sheet | {"kind": "pp", "pp": 200, "dkp": 1} |
    And the bank describes "Spell: Aegis" with:
      | field | value                                   |
      | sheet | {"kind": "pp", "pp": 50, "dkp": null} |
    And the bank sends no sheet price for "Cloak of Flames"

  Scenario: A copy is kept, so the bank still has prices when Google is down
    Given a saved copy of the spell sheet prices "Bedlam" at {"kind": "auction"}
    And Google answers the spell sheet with 500
    When the site reads the spell sheet
    And Someone asks for the bank
    Then the bank describes "Spell: Bedlam" with:
      | field | value               |
      | sheet | {"kind": "auction"} |
    And the log says "bank web: spell sheet: Error: tab 673309190: HTTP 500"

  Scenario: A tab without Name and Cost columns keeps the old copy
    Given a saved copy of the spell sheet prices "Bedlam" at {"kind": "auction"}
    And the spell sheet's "Wizard Spells" tab is:
      """
      Something else entirely
      """
    When the site reads the spell sheet
    And Someone asks for the bank
    Then the bank describes "Spell: Bedlam" with:
      | field | value               |
      | sheet | {"kind": "auction"} |
    And the log says "bank web: spell sheet: Error: no Name and Cost columns"

  Scenario: Names that are no spell, and costs that can't be read, are logged
    Given the spell sheet's "Bard Songs" tab is:
      """
      Level,Name,# In Bank,Banker*,,Cost
      34,Cantana of Soothing,0,,,50pp
      60,Composition of Ervaj,11,Cgkxclass,10/4/2026,ask Vijo
      """
    When the site reads the spell sheet
    Then the log says "bank web: spell sheet: no such spell Cantana of Soothing; can't read the cost of Composition of Ervaj "ask Vijo""

  Scenario: Bankers are told once when the spell sheet breaks, and again when it reads again
    Given the bank office is set up
    And the spell sheet's "Bard Songs" tab is:
      """
      Level,Name,# In Bank,Banker*,,Cost
      34,Cantana of Soothing,0,,,50pp
      """
    When the site reads the spell sheet
    And the site reads the spell sheet
    Then the bank office is told "The spell sheet needs fixing: no such spell Cantana of Soothing."
    And the bank office has been told 1 time
    Given the spell sheet's "Bard Songs" tab is:
      """
      Level,Name,# In Bank,Banker*,,Cost
      34,Aegis,0,,,50pp
      """
    When the site reads the spell sheet
    Then the bank office is told "The spell sheet reads again."
    And the bank office has been told 2 times

  Scenario: A message the bank office refuses is tried again on the next read
    Given the bank office is set up
    And the bank office refuses posts
    And the spell sheet's "Bard Songs" tab is:
      """
      Level,Name,# In Bank,Banker*,,Cost
      34,Cantana of Soothing,0,,,50pp
      """
    When the site reads the spell sheet
    And the bank office accepts posts again
    And the site reads the spell sheet
    Then the bank office is told "The spell sheet needs fixing: no such spell Cantana of Soothing."
    And the bank office has been told 1 time
