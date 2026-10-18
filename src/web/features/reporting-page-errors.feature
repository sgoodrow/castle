Feature: Reporting page errors
  The bank page sends its errors to the site, which files them as GitHub issues for fixing.
  Only members can report, a report must be small, and no one can flood the issues.

  Background:
    Given the bank site is set up for Discord sign-in
    And the site is running commit "abc123"
    And Alice is a Castle member with the bank role
    And Alice has signed in with Discord

  Scenario: An error from the current page points at the source
    When Alice reports a page error:
      """
      {"message": "boom", "stack": "at bankPage (https://bank.example.com/?q=dragon:2:35)", "componentStack": "\n    in App", "rev": "abc123"}
      """
    Then the answer is 204
    And an issue is filed titled "[page] boom"
    And the issue "[page] boom" says "at bankPage (bank/web/src/app.tsx:10:5 (bankPage))"
    And the issue "[page] boom" says "Component stack:"
    And the issue "[page] boom" says "**Browser:** TestBrowser/1"
    And the issue "[page] boom" says "**Commit:** abc123"
    And the issue "[page] boom" doesn't say "dragon"

  Scenario: An error from a page loaded before the last deploy is logged, not filed
    Its code may have a bug that's since been fixed, and the fix's issue closed.
    When Alice reports a page error:
      """
      {"message": "old", "stack": "at bankPage (https://bank.example.com/?q=dragon:2:35)", "rev": "older"}
      """
    Then the answer is 204
    And the log says "error (page, from older, not filed): old"
    And the log says "at bankPage (page:2:35)"
    And no issue is filed

  Scenario: An error from a page that doesn't say its commit is logged, not filed
    When Alice reports a page error:
      """
      {"message": "unknown"}
      """
    Then the answer is 204
    And the log says "error (page, from an unknown commit, not filed): unknown"
    And no issue is filed

  Scenario: A report with odd fields is still filed
    When Alice reports a page error:
      """
      {"message": 42, "stack": ["no"], "rev": "abc123"}
      """
    Then the answer is 204
    And an issue is filed titled "[page] (no message)"

  Scenario: Long messages are cut short
    When Alice reports a page error from the current page with a 1000-character message
    Then the answer is 204
    And the issue filed quotes a message of 500 "x"s

  Scenario: A report that isn't JSON is refused
    When Alice reports a page error that isn't JSON
    Then the answer is 400 "Bad report"
    And no issue is filed

  Scenario: A report that's too large is refused
    When Alice reports a page error with a 20000-character message
    Then the answer is 413 "Too large"
    And no issue is filed

  Scenario: Reporting needs sign-in
    When Someone reports a page error:
      """
      {"message": "boom"}
      """
    Then the answer is 401 "Sign in"
    And no issue is filed

  Scenario: Each member can report 10 a minute
    Given Bob is a Castle member with the bank role
    And Bob has signed in with Discord
    When Alice reports 10 page errors from the current page
    Then each is answered 204
    When Alice reports a page error:
      """
      {"rev": "abc123"}
      """
    Then the answer is 429 "Too many"
    When Bob reports a page error:
      """
      {"rev": "abc123"}
      """
    Then the answer is 204
    And the log says "error (page): (no message)" 11 times
    And 1 issue is filed
