Feature: Filling a bank request
  Requests in #bank-requests come from the bank page or from /bank request. A banker marks one
  filled with ✅: the bot copies it to #bank-transactions, naming the banker, and removes it.
  The member who asked, or a banker, cancels it with ❌, and the bot removes it. Officers and mods
  count as bankers here.

  Background:
    Given Alice is a Castle member
    And Bob is a Castle member
    And Carol is a Castle member
    And Dana is a Castle banker

  Scenario: A banker fills a request from the bank page
    Given Alice placed a bank request on the bank page:
      """
      • Cloak of Flames (800p)
      """
    When Dana reacts ✅ to Alice's request
    Then the bot posts in #bank-transactions:
      | content       | title                            | url                             | description              | pings |
      | ✅ by <@Dana> | @Alice has placed a bank request | https://discord.com/users/Alice | • Cloak of Flames (800p) | no    |
    And Alice's request is no longer in #bank-requests

  Scenario: A banker fills a request posted before titles named members
    Given Alice placed a bank request on the bank page before titles named members:
      """
      • Pearl (free)
      """
    When Dana reacts ✅ to Alice's request
    Then the bot posts in #bank-transactions:
      | content       | title | url | description                                         | pings |
      | ✅ by <@Dana> |       |     | <@Alice> has placed a bank request.\n\n• Pearl (free) | no    |

  Scenario: A banker fills a request from the bank page with nothing in it
    Given Alice placed a bank request on the bank page:
      """
      """
    When Dana reacts ✅ to Alice's request
    Then the bot posts in #bank-transactions:
      | content       | title                            | description |
      | ✅ by <@Dana> | @Alice has placed a bank request |             |

  Scenario: A banker fills a /bank request
    Given Bob placed a bank request with /bank request: "Cloak of Flames"
    When Dana reacts ✅ to Bob's request
    Then the bot posts in #bank-transactions:
      | content                                               | title |
      | ✍️ <@Bob> requests: Cloak of Flames -- ✅ by <@Dana> |       |
    And Bob's request is no longer in #bank-requests

  Scenario: A jeweler fills a jewelry request
    Given Frances is a Castle jeweler
    And Alice placed a jewelry request in #jewelry-requests:
      """
      • Golden Cat Eye Bracelet (13pp)
      """
    When Frances reacts ✅ to Alice's request in #jewelry-requests
    Then the bot posts in #bank-transactions:
      | content       | title                            | description                        | pings |
      | ✅ by <@Frances> | @Alice has placed a bank request | • Golden Cat Eye Bracelet (13pp) | no    |
    And Alice's request is no longer in #jewelry-requests

  Scenario: A member who isn't a jeweler can't fill a jewelry request
    Given Bob is a Castle member
    And Alice placed a jewelry request in #jewelry-requests:
      """
      • Golden Cat Eye Bracelet (13pp)
      """
    When Bob reacts ✅ to Alice's request in #jewelry-requests
    Then nothing is posted in #bank-transactions
    And Alice's request is still in #jewelry-requests

  Scenario: A jeweler can't fill a bank request
    Given Frances is a Castle jeweler
    And Alice placed a bank request on the bank page:
      """
      • Cloak of Flames (800p)
      """
    When Frances reacts ✅ to Alice's request
    Then nothing is posted in #bank-transactions
    And Alice's request is still in #bank-requests

  Scenario: A banker fills a jewelry request
    Given Alice placed a jewelry request in #jewelry-requests:
      """
      • Golden Cat Eye Bracelet (13pp)
      """
    When Dana reacts ✅ to Alice's request in #jewelry-requests
    Then the bot posts in #bank-transactions:
      | content       | title                            | description                      | pings |
      | ✅ by <@Dana> | @Alice has placed a bank request | • Golden Cat Eye Bracelet (13pp) | no    |
    And Alice's request is no longer in #jewelry-requests

  Scenario: A member cancels their own jewelry request
    Given Alice placed a jewelry request in #jewelry-requests:
      """
      • Golden Cat Eye Bracelet (13pp)
      """
    When Alice reacts ❌ to Alice's request in #jewelry-requests
    Then Alice's request is no longer in #jewelry-requests

  Scenario: A ✅ on the jewelry instructions does nothing
    Given Dana is a Castle banker
    And the bot's jewelry instructions are in #jewelry-requests
    When Dana reacts ✅ to the bot's instructions in #jewelry-requests
    Then nothing is posted in #bank-transactions
    And the bot's jewelry instructions are still in #jewelry-requests

  Scenario Outline: Officers and mods can fill requests too
    Given Erin is a Castle <role>
    And Alice placed a bank request on the bank page:
      """
      • Pearl (free)
      """
    When Erin reacts ✅ to Alice's request
    Then Alice's request is no longer in #bank-requests

    Examples:
      | role    |
      | officer |
      | mod     |

  Scenario: Only a banker can mark a request filled, not even the member who asked
    Given Alice placed a bank request on the bank page:
      """
      • Cloak of Flames (800p)
      """
    When Alice reacts ✅ to Alice's request
    Then nothing is posted in #bank-transactions
    And Alice's request is still in #bank-requests

  Scenario: A ✅ outside #bank-requests does nothing
    Given Bob placed a bank request with /bank request in #general: "Cloak of Flames"
    When Dana reacts ✅ to Bob's request in #general
    Then nothing is posted in #bank-transactions
    And Bob's request is still in #general

  Scenario: The member who asked cancels a request from the bank page
    Given Alice placed a bank request on the bank page:
      """
      • Cloak of Flames (800p)
      """
    When Alice reacts ❌ to Alice's request
    Then Alice's request is no longer in #bank-requests
    And nothing is posted in #bank-transactions

  Scenario: The member who asked cancels a request posted before titles named members
    Given Alice placed a bank request on the bank page before titles named members:
      """
      • Pearl (free)
      """
    When Alice reacts ❌ to Alice's request
    Then Alice's request is no longer in #bank-requests

  Scenario: The member who asked cancels a /bank request
    Given Bob placed a bank request with /bank request: "Cloak of Flames"
    When Bob reacts ❌ to Bob's request
    Then Bob's request is no longer in #bank-requests

  Scenario: A /bank request whose embed names no one is cancelled by the member it mentions
    Given Bob placed a bank request with /bank request: "Pearl"
    And Bob's /bank request also has an embed titled "Pearl"
    When Bob reacts ❌ to Bob's request
    Then Bob's request is no longer in #bank-requests

  Scenario: A banker cancels a request
    Given Alice placed a bank request on the bank page:
      """
      • Cloak of Flames (800p)
      """
    When Dana reacts ❌ to Alice's request
    Then Alice's request is no longer in #bank-requests
    And nothing is posted in #bank-transactions

  Scenario: No one else can cancel a request
    Given Alice placed a bank request on the bank page:
      """
      • Cloak of Flames (800p)
      """
    And Bob placed a bank request with /bank request: "Pearl"
    When Carol reacts ❌ to Alice's request
    And Carol reacts ❌ to Bob's request
    Then Alice's request is still in #bank-requests
    And Bob's request is still in #bank-requests
