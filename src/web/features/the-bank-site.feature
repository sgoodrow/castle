Feature: The bank site
  The web process serves the bank page and its data to Castle members. Health checks and the
  wiki's icons are open to anyone; everything else waits until sign-in is set up.

  Background:
    Given the bank site is set up for Discord sign-in
    And the site is running commit "abc123"

  Scenario: Health checks need no sign-in
    When Someone visits "/healthz"
    Then the answer is 200 "ok"

  Scenario: Only read requests are allowed
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    When Alice sends a PUT to "/api/bank"
    Then the answer is 405 "Method not allowed"

  Scenario: A member gets the page for the version that's running
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    When Alice visits "/"
    Then the answer is the page built for commit "abc123"
    And the answer's content-type is "text/html; charset=utf-8"
    And the answer's content-security-policy includes "frame-ancestors 'none'"

  Scenario: The page keeps the version it started with, even after a new build is written
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    And Alice has visited "/"
    When the built page is replaced on disk
    And Alice visits "/index.html"
    Then the answer is the page built for commit "abc123"

  Scenario: The bank's data is never cached
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    When Alice asks for the bank
    Then the answer is 200
    And the answer's cache-control is "no-store"

  Scenario: Asking only for the headers
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    When Alice sends a HEAD to "/api/bank"
    Then the answer is 200
    And the answer is empty

  Scenario: Icons are open to anyone and kept for a week
    Given the wiki cache has icon 500
    When Someone visits "/icons/500.png"
    Then the answer is the PNG for icon 500
    And the answer's cache-control is "public, max-age=604800"

  Scenario Outline: Icons the cache doesn't have aren't found
    Given the wiki cache has icon 500
    When Someone visits "<path>"
    Then the answer is 404 "Not found"

    Examples:
      | path                        |
      | /icons/501.png              |
      | /icons/..%2F..%2Fsecret.png |
      | /icons/500.jpg              |

  Scenario: Pages the site doesn't have aren't found
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    When Alice visits "/nope"
    Then the answer is 404 "Not found"

  Scenario Outline: A failure is filed and answered plainly
    Given Alice is a Castle member with the bank role
    And Alice has signed in with Discord
    And the bank's database <fails> "db down"
    When Alice visits "/api/bank?q=dragon"
    Then the answer is 500 "Something went wrong"
    And an issue is filed titled "[web] db down"
    And the issue "[web] db down" says "**Feature:** GET /api/bank"
    And the issue "[web] db down" says "**What they saw:** The request got a 500"
    And the issue "[web] db down" doesn't say "dragon"

    Examples:
      | fails                 |
      | is down with          |
      | throws the bare value |

  Scenario: Before sign-in is set up, the site says so
    Given the bank site isn't set up for sign-in
    When Alice visits each of "/", "/api/bank", "/auth/login"
    Then each is answered 503 saying "The guild bank site isn't set up yet."
    And the log says "bank web: set clientId, guildId, discordClientSecret, bankWebRoleId and bankWebSessionSecret to open the bank"

  Scenario: Before sign-in is set up, health checks and icons still work
    Given the bank site isn't set up for sign-in
    And the wiki cache has icon 500
    When Someone visits "/healthz"
    Then the answer is 200 "ok"
    When Someone visits "/icons/500.png"
    Then the answer is the PNG for icon 500

  Scenario: Before sign-in is set up, page errors can't be filed
    Given the bank site isn't set up for sign-in
    When Someone reports a page error:
      """
      {"message": "boom"}
      """
    Then the answer is 401 "Sign in"
    And no issue is filed

  Scenario: Dev mode opens the bank to anyone, with no sign-in pages
    Given the bank site isn't set up for sign-in
    And the site is in dev mode without sign-in
    When Someone visits each of "/api/bank", "/"
    Then each is answered 200
    When Someone visits "/auth/login"
    Then the answer is 404 "Not found"
    When Someone reports a page error:
      """
      {"message": "boom", "rev": "abc123"}
      """
    Then the answer is 204
    And an issue is filed titled "[page] boom"

  Scenario: Dev mode is never on in production
    Given the bank site isn't set up for sign-in
    And the site is in dev mode without sign-in
    And the site is running in production
    When Someone asks for the bank
    Then the answer is 503 saying "The guild bank site isn't set up yet."

  Scenario: Dev mode is never on once sign-in is set up
    Given the site is in dev mode without sign-in
    When Someone asks for the bank
    Then the answer is 401 with the JSON:
      """
      {"error": "sign in"}
      """
