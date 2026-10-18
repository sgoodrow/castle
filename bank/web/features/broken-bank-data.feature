Feature: Broken bank data
  The bank's data comes from files the bot writes. When part of it is malformed the page still
  opens, and tells us once so the data gets fixed.

  Scenario: A spell without all 15 class levels is reported, and the bank still opens
    Given the bank holds the usual stock
    And the spell data for "Splurt" has only 14 class levels
    When I open the bank page
    Then the bank lists 9 items
    And the bank lists "Spell: Splurt"
    And the page reports one error: "Error: Spell data without 15 class levels: 502"
