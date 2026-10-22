Feature: The Sky sheet
  The Sky bankers keep which island's quest each Plane of Sky item is for, with a note on some,
  in the "Item Counts and announcements" tab of their Plane of Sky Google Sheet. The site reads it
  in the background and marks each Sky item in the bank. An item the sheet doesn't list is still a
  Sky item when only the Sky mules hold it. The sheet's "Multiquest" tab lists who holds which NO
  DROP items for multiquesting; the bank sends those too. The sheet's waitlist stays in the sheet.

  Background:
    Given the site is in dev mode without sign-in
    And the bankers' uploads hold:
      | banker   | spot     | item                   | count |
      | cgskya   | General1 | Emerald Spiroc Feather | 2     |
      | cgskyb   | General2 | Efreeti War Axe        | 1     |
      | gmskyone | General3 | Mottled Spiroc Feather | 1     |
      | cgskya   | General4 | Efreeti Statuette      | 1     |
      | mulea    | General1 | Efreeti Statuette      | 1     |
      | mulea    | General2 | Cloak of Flames        | 1     |
      | cgskyc   | General1 | Cloak of Flames        | 1     |
      | cgskyc   | General2 | Ethereal Amethyst      | 1     |

  Scenario: Each Sky item gets its island and note
    Given the Sky sheet's announcements tab is:
      """
      Items,Island,Item Counts,Notes,Missing Items
      Island 4,Bird Whistle,Key of the Swift,,
      Emerald Spiroc Feather,Island 4,2,fd ring,
      Efreeti Statuette,Island 4,6,,
      Mottled Spiroc Feather,Island 6,1,war dagas,
      Ethereal Amethyst,Island 6,1,,
      Ethereal Amethyst,Island 7,1,,
      """
    When the site reads the Sky sheet
    And Someone asks for the bank
    Then the bank describes "Emerald Spiroc Feather" with:
      | field | value                            |
      | sky   | {"islands": [4], "note": "fd ring"} |
    And the bank describes "Efreeti Statuette" with:
      | field | value                     |
      | sky   | {"islands": [4], "note": ""} |
    And the bank describes "Mottled Spiroc Feather" with:
      | field | value                            |
      | sky   | {"islands": [6], "note": "war dagas"} |
    And the bank describes "Efreeti War Axe" with:
      | field | value                        |
      | sky   | {"islands": [], "note": ""}  |
    And the bank describes "Ethereal Amethyst" with:
      | field | value                        |
      | sky   | {"islands": [6, 7], "note": ""} |
    And the bank sends no Sky part for "Cloak of Flames"

  Scenario: The Multiquest tab's holders are sent, NO DROP or not
    Given the Sky sheet's Multiquest tab is:
      """
      ,ITEM,CLASS,,
      Rabbie,Griffon Eye,Druid,,
      Rabbie,Griffon Eye,Druid,,
      phrixios,Wind Tablet,Wizard,,
      Kelra,Stone Amulet,Cleric,,
      """
    When the site reads the Sky sheet
    And Someone asks for the bank
    Then the bank holds for multiquesting:
      | holder   | item         | id    | count |
      | Rabbie   | Griffon Eye  | 13739 | 2     |
      | Phrixios | Wind Tablet  | 20978 | 1     |
      | Kelra    | Stone Amulet | 20973 | 1     |
    And the bank describes "Griffon Eye" with:
      | field | value                       |
      | sky   | {"islands": [], "note": ""} |

  Scenario: The wiki refresh covers the Multiquest items, so each links to its wiki page
    Given the Sky sheet's Multiquest tab is:
      """
      ,ITEM,CLASS,,
      Rabbie,Griffon Eye,Druid,,
      """
    When the site reads the Sky sheet
    And the site refreshes the wiki
    Then the wiki has been asked for "/Cloak_of_Flames", "/Efreeti_Statuette", "/Efreeti_War_Axe", "/Emerald_Spiroc_Feather", "/Ethereal_Amethyst", "/Mottled_Spiroc_Feather", "/Griffon_Eye"

  Scenario: Multiquest rows the bank can't place are logged
    Given the Sky sheet's Multiquest tab is:
      """
      ,ITEM,CLASS,,
      Rabbie,Blood Sky Sapphire,Druid,,
      Kelra,Leather Cord,Cleric,,
      `````````,Griffon Eye,Druid,,
      """
    When the site reads the Sky sheet
    And Someone asks for the bank
    Then the bank holds for multiquesting:
      | holder | item | id | count |
    And the log says "bank web: sky sheet: multiquest: no such item Blood Sky Sapphire; multiquest: more than one item called Leather Cord; multiquest: no holder for "`````````" (Griffon Eye)"

  Scenario: A copy is kept, so the bank still knows its Sky items when Google is down
    Given a saved copy of the Sky sheet puts "Efreeti Statuette" on island 4
    And Google answers the Sky sheet with 500
    When the site reads the Sky sheet
    And Someone asks for the bank
    Then the bank describes "Efreeti Statuette" with:
      | field | value                     |
      | sky   | {"islands": [4], "note": ""} |
    And the log says "bank web: sky sheet: Error: tab 2041401641: HTTP 500"

  Scenario: A tab without Items, Island and Notes columns keeps the old copy
    Given a saved copy of the Sky sheet puts "Efreeti Statuette" on island 4
    And the Sky sheet's announcements tab is:
      """
      Something else entirely
      """
    When the site reads the Sky sheet
    And Someone asks for the bank
    Then the bank describes "Efreeti Statuette" with:
      | field | value                     |
      | sky   | {"islands": [4], "note": ""} |
    And the log says "bank web: sky sheet: Error: no Items, Island and Notes columns"

  Scenario: Bankers are told when the Sky sheet names no item
    Given the bank office is set up
    And the Sky sheet's announcements tab is:
      """
      Items,Island,Item Counts,Notes
      Phosporic Globe,Island 2,3,
      Efreeti Statuette,Island 4,6,
      """
    When the site reads the Sky sheet
    Then the bank office is told "The Plane of Sky sheet has a problem: no such item Phosporic Globe."
    And the bank office has been told 1 time

  Scenario: Names that are no item are logged
    Given the Sky sheet's announcements tab is:
      """
      Items,Island,Item Counts,Notes
      Phosporic Globe,Island 2,3,
      Efreeti Statuette,Island 4,6,
      """
    When the site reads the Sky sheet
    Then the log says "bank web: sky sheet: no such item Phosporic Globe"
