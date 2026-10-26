Feature: Posting a bank request
  Members send their tab from the bank page: bank items to #bank-requests, and made-to-order jewelry
  to #jewelry-requests. The site checks the post fits in a Discord message, titles it with the
  member's name linked to their Discord profile, and posts it as the bot without pinging anyone. A
  bank post gets a "DM me the plan" button for bankers, and the site, not the page, decides how each of
  its lines is filled.

  Background:
    Given the bank site is set up for Discord sign-in
    And posting bank requests is set up
    And the wiki cache has the page for "Cloak of Flames" with icon 77 and these Green sales:
      | date | seller | price |
    And Alice is a Castle member with the bank role
    And Alice has signed in with Discord

  Scenario: A bank request is posted as one entry, titled with the member's name
    When Alice posts the bank request:
      """
      {"channel": "bank",
       "embeds": [{"description": "**Total: 1,600pp**", "color": 5793266, "fields": [
         {"name": "\u200b", "value": "[Cloak of Flames](https://wiki.project1999.com/Cloak_of_Flames) (800pp)"},
         {"name": "\u200b", "value": "[Spell: Bedlam](https://wiki.project1999.com/Spell:_Bedlam) (800pp) · MQ: Ringolo"}
       ]}],
       "lines": [{"id": 11621, "qty": 1}, {"id": 19400, "qty": 1}]}
      """
    Then Alice's request is posted
    And the bot posts in #bank-requests:
      | title                            | url                                | description        | items                                                                                                                                      |
      | @Alice has placed a bank request | https://discord.com/users/id-Alice | **Total: 1,600pp** | [Cloak of Flames](https://wiki.project1999.com/Cloak_of_Flames) (800pp)\n[Spell: Bedlam](https://wiki.project1999.com/Spell:_Bedlam) (800pp) · MQ: Ringolo |
    And the log says "bank web: Alice (id-Alice) posted a bank request"

  Scenario: A bank request gets the "DM me the plan" button for its items
    When Alice posts a bank request for:
      | item            | quantity |
      | Cloak of Flames | 1        |
      | Pearl           | 3        |
    Then the post has the "DM me the plan" button for:
      | item            | quantity | from     |
      | Cloak of Flames | 1        | the bank |
      | Pearl           | 3        | the bank |

  Scenario: A line a banker priced as a DKP auction is marked an auction on the button
    Given the bankers' uploads hold:
      | banker | spot     | item          | count | price       |
      | mulea  | General1 | Spell: Bedlam | 1     | DKP auction |
    When Alice posts a bank request for:
      | item          | quantity |
      | Spell: Bedlam | 1        |
    Then the post has the "DM me the plan" button for:
      | item          | quantity | from        |
      | Spell: Bedlam | 1        | DKP auction |

  Scenario: A line only a multiquest holder has is marked a multiquest on the button
    Given the Sky sheet's Multiquest tab is:
      """
      ,ITEM,CLASS,,
      phrixios,Wind Tablet,Wizard,,
      """
    And the site reads the Sky sheet
    When Alice posts a bank request for:
      | item        | quantity |
      | Wind Tablet | 1        |
    Then the post has the "DM me the plan" button for:
      | item        | quantity | from       |
      | Wind Tablet | 1        | multiquest |

  Scenario: A request with an item the bank's item database doesn't know is posted without the button
    When Alice posts a bank request for item 999999
    Then Alice's request is posted
    And the post has no button

  Scenario: A request is posted without the button when the bank can't be read
    Given the bank's database is down with "db down"
    When Alice posts a bank request for:
      | item  | quantity |
      | Pearl | 1        |
    Then Alice's request is posted
    And the post has no button
    And an issue is filed titled "[web] db down"
    And the issue "[web] db down" says "**What they saw:** The request was posted without its"

  Scenario: A post from a page opened before the button is posted without it
    When Alice posts the bank request:
      """
      {"embeds": [
        {"title": "Bank request", "description": "• Cloak of Flames (800pp)", "color": 5793266, "footer": "Thanks"},
        {"title": "Cloak of Flames", "description": "• mulea (inventory 1)", "color": 0, "item": 11621}
      ]}
      """
    Then Alice's request is posted
    And the bot posts in #bank-requests:
      | title                            | url                                | description               | footer | thumbnail                             |
      | @Alice has placed a bank request | https://discord.com/users/id-Alice | • Cloak of Flames (800pp) | Thanks |                                       |
      | Cloak of Flames                  |                                    | • mulea (inventory 1)     |        | https://bank.example.com/icons/77.png |
    And the post has no button

  Scenario: Made-to-order jewelry is posted to the jewelry requests channel, without the button
    When Alice posts the bank request:
      """
      {"channel": "jewelry",
       "embeds": [{"description": "• [Golden Cat Eye Bracelet](https://wiki.project1999.com/Golden_Cat_Eye_Bracelet) (13pp)\n-# Cgjewelry (bank 1)\n\n**Total: 13pp**", "color": 5793266}],
       "lines": [{"id": 14618, "qty": 1}]}
      """
    Then Alice's request is posted
    And the bot posts in #jewelry-requests:
      | title                            | url                                | description                                                                                                                       |
      | @Alice has placed a bank request | https://discord.com/users/id-Alice | • [Golden Cat Eye Bracelet](https://wiki.project1999.com/Golden_Cat_Eye_Bracelet) (13pp)\n-# Cgjewelry (bank 1)\n\n**Total: 13pp** |
    And the post has no button

  Scenario: The page shows who's signed in, for its preview
    When Alice asks for the bank
    Then the bank says Alice is signed in as "Alice"

  Scenario: Only members who've signed in can post
    When Bob posts a bank request of 1 embed
    Then the answer is 401 "Sign in"
    And the bot posts nothing

  Scenario: Posting says it isn't set up when the site can't post
    Given the site restarts without the bot's token
    When Alice posts a bank request of 1 embed
    Then the answer is 503 "Posting isn't set up"

  Scenario: A malformed post is refused
    When Alice posts a bank request that isn't JSON
    Then the answer is 400 "Bad request"

  Scenario: A post with no entries is refused
    When Alice posts a bank request of 0 embeds
    Then the answer is 400 "Bad request"

  Scenario: A jewelry post says so when the site has no jewelry channel
    Given posting bank requests is set up
    And the site restarts without the jewelry channel
    When Alice posts a bank request to #jewelry
    Then the answer is 503 "Posting jewelry isn't set up"
    And the bot posts nothing

  Scenario: A post to a channel that isn't one of the request channels is refused
    When Alice posts a bank request to #jewlery
    Then the answer is 400 "Bad request"
    And the bot posts nothing

  Scenario: A post with too many entries for Discord is refused
    When Alice posts a bank request of 11 embeds
    Then the answer is 400 "Bad request"
    And the bot posts nothing

  Scenario: An entry too long for Discord is refused
    When Alice posts a bank request with a 4097-character description
    Then the answer is 400 "Bad request"

  Scenario: A post with more items than Discord's 25 is refused
    When Alice posts a bank request of 26 items
    Then the answer is 400 "Bad request"
    And the bot posts nothing

  Scenario: An item line too long for Discord is refused
    When Alice posts a bank request with a 1025-character item
    Then the answer is 400 "Bad request"

  Scenario: A post too long for Discord overall is refused
    When Alice posts a bank request of 3 embeds with 2000-character descriptions
    Then the answer is 400 "Bad request"

  Scenario Outline: Each entry in a post must be one Discord would accept
    When Alice posts the bank request:
      """
      {"embeds": [<embed>]}
      """
    Then the answer is 400 "Bad request"

    Examples:
      | embed                                                                     |
      | null                                                                      |
      | {"title": "", "description": "", "color": 0}                              |
      | {"description": "", "color": 0, "fields": []}                             |
      | {"description": "x", "color": 0, "fields": {}}                            |
      | {"description": "x", "color": 0, "fields": [null]}                        |
      | {"description": "x", "color": 0, "fields": [{"name": " ", "value": "x"}]} |
      | {"description": "x", "color": 0, "fields": [{"name": "x", "value": ""}]}  |
      | {"title": "T", "description": 1, "color": 0}                              |
      | {"title": 1, "description": "x", "color": 0}                              |
      | {"description": " ", "color": 0, "fields": [{"name": "x", "value": "x"}]} |
      | {"title": "T", "description": "x", "color": 16777216}                     |
      | {"title": "T", "description": "x", "color": -1}                           |
      | {"title": "T", "description": "x", "color": 0.5}                          |
      | {"title": "T", "description": "x", "color": 0, "item": 0}                 |
      | {"title": "T", "description": "x", "color": 0, "footer": 1}               |

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
