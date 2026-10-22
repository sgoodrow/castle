Feature: The jewelry sheet
  The jewelers price what they make to order in the first tab of their "Castle Jewelcrafting Table"
  Google Sheet: a gem price table at the top, then a header row per section of recipes. The site
  reads it as the jewelers keep it, in the background, and sends each recipe with the item it makes,
  whether or not the bank holds any. A name is matched exactly, to the one item of that name that
  gives something: jewelry made with unenchanted metal shares the name and gives nothing.

  Background:
    Given the site is in dev mode without sign-in
    And the bankers' uploads hold:
      | banker    | spot     | item                    | id    | count |
      | cgjewelry | General1 | Golden Cat Eye Bracelet | 14618 | 1     |

  Scenario: Each recipe is sent with the jewelry it makes, held or not
    Given the jewelry sheet's price table is:
      """
      ,a,,,,,,,,,,,
      ,Gem,Market Price (pp),Guild Buy (pp)**,,,,,,,,,
      ,Black Sapphire,350,450,,,,,,,,,
      ,,,,,,,,,,,,
      ,ITEM NAME,SLOT,STATS,BAR COST (pp),GEM COST (pp),TRIVIAL,SUCCESS RATE,AVG. COST,COMMISSION,MARKET PRICE,GUILD PRICE (pp),Notes
      ,DROPPED MATERIALS; VARIABLE PRICES,,,,,,,,,,,
      ,Black Sapphire Velium Necklace,Neck,65hp / 65mp,252,350,287,86.25%,685,0.2,,822,
      None,Black Sapphire Silvered Necklace,Neck,3ac / 30hp / 30mp,1,350,68,95%,369,0.2,,442,Don't ask for this
      ,ITEM NAME,SLOT,STATS,MATERIAL COST (pp),TRIVIAL,SUCCESS RATE,AVG. COST,COMMISSION,MARKET PRICE,GUILD PRICE (pp),Notes,
      ,"VENDOR-AVAILABLE MATERIALS; CONSISTENT PRICES (INCOMPLETE LIST, BLACK PEARLS & FIRE OPALS INCLUDED)",,,,,,,,,,,
      ,Golden Cat Eye Bracelet,Wrist,7cha,11,156,95%,12,0.15,,13,,
      """
    When the site reads the jewelry sheet
    And Someone asks for the bank
    Then the bank sends item 30351, "Black Sapphire Velium Necklace", made to order with:
      | field     | value                                                 |
      | materials | [{"what": "Bar", "pp": 252}, {"what": "Gem", "pp": 350}] |
      | trivial   | 287                                                   |
      | success   | 0.8625                                                |
      | price     | 822                                                   |
      | note      | ""                                                    |
    And the bank sends item 14618, "Golden Cat Eye Bracelet", made to order with:
      | field     | value                            |
      | materials | [{"what": "Material", "pp": 11}] |
      | trivial   | 156                              |
      | success   | 0.95                             |
      | price     | 13                               |
      | note      | ""                               |
    And the bank describes 2 items

  Scenario: A recipe the jewelers say not to ask for is left out
    Given the jewelry sheet's price table is:
      """
      ,ITEM NAME,SLOT,STATS,BAR COST (pp),GEM COST (pp),TRIVIAL,SUCCESS RATE,AVG. COST,COMMISSION,MARKET PRICE,GUILD PRICE (pp),Notes
      ,Black Sapphire Silvered Necklace,Neck,3ac / 30hp / 30mp,1,350,68,95%,369,0.2,,442,Don't ask for this
      """
    When the site reads the jewelry sheet
    And Someone asks for the bank
    Then the bank sends no jewelry

  Scenario: The wiki refresh covers jewelry the bank doesn't hold, so each gets its icon
    Given the jewelry sheet's price table is:
      """
      ,ITEM NAME,SLOT,STATS,BAR COST (pp),GEM COST (pp),TRIVIAL,SUCCESS RATE,AVG. COST,COMMISSION,MARKET PRICE,GUILD PRICE (pp),Notes
      ,Black Sapphire Velium Necklace,Neck,65hp / 65mp,252,350,287,86.25%,685,0.2,,822,
      """
    When the site reads the jewelry sheet
    And the site refreshes the wiki
    Then the wiki has been asked for "/Golden_Cat_Eye_Bracelet", "/Black_Sapphire_Velium_Necklace"

  Scenario: Names that are no one item are logged, and the rest still sent
    Given the jewelry sheet's price table is:
      """
      ,ITEM NAME,SLOT,STATS,MATERIAL COST (pp),TRIVIAL,SUCCESS RATE,AVG. COST,COMMISSION,MARKET PRICE,GUILD PRICE (pp),Notes,
      ,Velium Wolf's Eye Necklace,Neck,10mr,256,250,95%,269,0,,269,,
      ,Fire Emerald Velium Ring,Finger,6str / 6dex,338,276,94.50%,357,0.2,,428,,
      ,Golden Cat Eye Bracelet,Wrist,7cha,11,156,95%,12,0.15,,13,,
      """
    When the site reads the jewelry sheet
    And Someone asks for the bank
    Then the log says "bank web: jewelry sheet: no such item Velium Wolf's Eye Necklace; more than one item called Fire Emerald Velium Ring"
    And the bank describes 1 item

  Scenario: A recipe row whose costs aren't numbers keeps the old copy
    Given a saved copy of the jewelry sheet prices item 14618 at 13pp
    And the jewelry sheet's price table is:
      """
      ,ITEM NAME,SLOT,STATS,MATERIAL COST (pp),TRIVIAL,SUCCESS RATE,AVG. COST,COMMISSION,MARKET PRICE,GUILD PRICE (pp),Notes,
      ,Golden Cat Eye Bracelet,Wrist,7cha,11,156,95%,12,0.15,,#REF!,,
      """
    When the site reads the jewelry sheet
    And Someone asks for the bank
    Then the log says "bank web: jewelry sheet: Error: Golden Cat Eye Bracelet: no material costs, trivial, success rate and guild price"
    And the bank sends item 14618, "Golden Cat Eye Bracelet", made to order with:
      | field     | value |
      | materials | []    |
      | trivial   | 0     |
      | success   | 1     |
      | price     | 13    |
      | note      | ""    |

  Scenario: A copy is kept, so the bank still knows its jewelry when Google is down
    Given a saved copy of the jewelry sheet prices item 14618 at 13pp
    And Google answers the jewelry sheet with 500
    When the site reads the jewelry sheet
    And Someone asks for the bank
    Then the log says "bank web: jewelry sheet: Error: HTTP 500"
    And the bank sends item 14618, "Golden Cat Eye Bracelet", made to order with:
      | field     | value |
      | materials | []    |
      | trivial   | 0     |
      | success   | 1     |
      | price     | 13    |
      | note      | ""    |

  Scenario: A tab without an ITEM NAME header keeps the old copy
    Given the jewelry sheet's price table is:
      """
      Something else entirely
      """
    When the site reads the jewelry sheet
    And Someone asks for the bank
    Then the log says "bank web: jewelry sheet: Error: no ITEM NAME header"
    And the bank sends no jewelry
