# UUID conversion blocker

No database changes applied. The read-only audit found 2,812 unmatched club references across 14 tables, including 288 players and two user records. Existing clubs: Demo FC, Liverpool Michigan, Michigan Jaguars. Three missing IDs appear in player, team or user references; ownership must be resolved without guessing.

Current credentials also exist in plaintext columns in club_integration_secrets, club_credentials, club_quick_books_connections and payment_processors. Vault exposure through hosted API configuration remains unverified.

Complete conversion SQL and replacement policy review depend on resolving missing club ownership. The new storage SQL is in the approved preparation plan; no execution approval has been requested.
