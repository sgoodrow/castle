Feature: The web process
  Run on its own, the web process listens, keeps the wiki cache and the spell sheet current in the
  background, and files whatever would otherwise crash it.

  Background:
    Given the bank site is set up for Discord sign-in
    And the site is told to listen on a free port

  Scenario: Loading the code doesn't start the site
    When the web process's code is loaded
    Then nothing listens on that port

  Scenario: Starting listens and refreshes the wiki for what's in the bank
    Given the bankers' uploads hold:
      | banker | spot     | item                 | count |
      | mulea  | General1 | Cloak of Flames      | 1     |
      | muleb  | Bank1    | Cloak of Flames      | 1     |
      | mulea  | General2 | Mask of the Deceiver | 1     |
      | mulea  | General3 | Empty                | 1     |
      | mulea  | General4 | Spell: Lifetap       | 1     |
    And the wiki's pages show icon 77 and these Green sales:
      | date       | seller | price |
      | 2026-01-01 | Bo     | 900   |
    When the web process starts
    Then the log says "bank web: listening on"
    And the log says "as https://bank.example.com"
    When Someone visits "/healthz"
    Then the answer is 200 "ok"
    When the wiki refresh has finished
    Then the wiki has been asked for "/Cloak_of_Flames", "/Spell%3A_Lifetap"
    And the wiki has been asked for the icons "77", "504", "658"
    And the wiki and all three sheets are refreshed again every 30 minutes
    When Someone visits "/icons/658.png"
    Then the answer is the PNG for icon 658

  Scenario: In dev mode the log says sign-in is off
    Given the bank site isn't set up for sign-in
    And the site is in dev mode without sign-in
    When the web process starts
    Then the log says " (no auth)"

  Scenario Outline: A failed wiki refresh is filed
    Given the bank's database <fails> "db down"
    When the web process starts
    Then an issue is filed titled "[web] wiki refresh failed: db down"
    And the web process keeps running

    Examples:
      | fails                   |
      | is down with            |
      | throws the bare value   |

  Scenario Outline: A promise nothing catches is filed
    Given the web process has started
    When a promise fails with <what> "lost promise" and nothing catches it
    Then an issue is filed titled "[web] lost promise"
    And the web process keeps running

    Examples:
      | what           |
      | an error       |
      | the bare value |

  Scenario: An uncaught error is filed, then the process exits
    Given the web process has started
    When the web process hits an uncaught error "crash"
    Then an issue is filed titled "[web] crash"
    And the web process exits with code 1
