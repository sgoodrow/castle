Feature: Posting a bank request
  Members send their tab to #bank-requests from the bank page. The page builds the post; the site
  checks it fits in a Discord message, titles it with the member's name linked to their Discord
  profile, and posts it as the bot without pinging anyone. No one can flood the channel.

  Background:
    Given the bank site is set up for Discord sign-in
    And posting bank requests is set up
    And the wiki cache has the page for "Cloak of Flames" with icon 77 and these Green sales:
      | date | seller | price |
    And Alice is a Castle member with the bank role
    And Alice has signed in with Discord

  Scenario: The request is posted as the bot, naming who sent it
    When Alice posts the bank request:
      """
      {"embeds": [
        {"title": "Bank request", "description": "• Cloak of Flames (800pp)", "color": 5793266, "footer": "Thanks"},
        {"title": "Cloak of Flames", "description": "• mulea (inventory 1)", "color": 0, "item": 11621}
      ]}
      """
    Then the answer is 204
    And the bot posts in #bank-requests:
      | title                               | url                               | description               | footer | thumbnail                             |
      | @Alice has placed a bank request    | https://discord.com/users/id-Alice | • Cloak of Flames (800pp) | Thanks |                                       |
      | Cloak of Flames                     |                                   | • mulea (inventory 1)     |        | https://bank.example.com/icons/77.png |
    And the log says "bank web: Alice (id-Alice) posted a bank request"

  Scenario: Made-to-order jewelry is posted to the jewelry requests channel
    When Alice posts the bank request:
      """
      {"channel": "jewelry", "embeds": [
        {"title": "Bank request", "description": "• Golden Cat Eye Bracelet (13pp)", "color": 5793266},
        {"title": "Golden Cat Eye Bracelet", "description": "Made to order.", "color": 0, "item": 14618}
      ]}
      """
    Then the answer is 204
    And the bot posts in #jewelry-requests:
      | title                            | url                               | description                      | footer | thumbnail                             |
      | @Alice has placed a bank request | https://discord.com/users/id-Alice | • Golden Cat Eye Bracelet (13pp) |        |                                       |
      | Golden Cat Eye Bracelet          |                                   | Made to order.                   |        |                                       |

  Scenario: The bank tells the page who's signed in, for its preview
    When Alice asks for the bank
    Then the bank says Alice is signed in as "Alice"

  Scenario: Only members who've signed in can post
    When Bob posts a bank request of 1 embed
    Then the answer is 401 "Sign in"
    And the bot posts nothing

  Scenario: A site without the bot's token can't post
    Given the site restarts without the bot's token
    When Alice posts a bank request of 1 embed
    Then the answer is 503 "Posting isn't set up"

  Scenario: A post that isn't JSON is refused
    When Alice posts a bank request that isn't JSON
    Then the answer is 400 "Bad request"

  Scenario: A post with no embeds is refused
    When Alice posts a bank request of 0 embeds
    Then the answer is 400 "Bad request"

  Scenario: A post to a channel that isn't one of the request channels is refused
    When Alice posts a bank request to #jewlery
    Then the answer is 400 "Bad request"
    And the bot posts nothing

  Scenario: A post of more embeds than Discord allows is refused
    When Alice posts a bank request of 11 embeds
    Then the answer is 400 "Bad request"
    And the bot posts nothing

  Scenario: An embed too long for Discord is refused
    When Alice posts a bank request with a 4097-character description
    Then the answer is 400 "Bad request"

  Scenario: A post longer than Discord allows in all is refused
    When Alice posts a bank request of 3 embeds with 2000-character descriptions
    Then the answer is 400 "Bad request"

  Scenario Outline: Each embed must be one Discord would take
    When Alice posts the bank request:
      """
      {"embeds": [<embed>]}
      """
    Then the answer is 400 "Bad request"

    Examples:
      | embed                                                              |
      | null                                                               |
      | {"title": "", "description": "", "color": 0}                       |
      | {"title": "T", "description": 1, "color": 0}                       |
      | {"title": "T", "description": "", "color": 16777216}               |
      | {"title": "T", "description": "", "color": -1}                     |
      | {"title": "T", "description": "", "color": 0.5}                    |
      | {"title": "T", "description": "", "color": 0, "item": 0}           |
      | {"title": "T", "description": "", "color": 0, "footer": 1}         |

  Scenario: A post too large to read is refused
    When Alice posts a bank request with a 70000-character description
    Then the answer is 413 "Too large"

  Scenario: Members can post 5 requests every 10 minutes
    When Alice posts 6 bank requests
    Then the answer is 429 "Too many"
    And the bot has posted 5 bank requests

  Scenario: Discord refusing the post is passed on
    Given Discord refuses posts
    When Alice posts a bank request of 1 embed
    Then the answer is 502 "Discord didn't take it"
    And the log says "bank web: Discord refused Alice's bank request 403"
