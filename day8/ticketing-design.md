# TicketHub: Design Document

## 1. Context

TicketHub is a website where people browse concerts and events, pick seats and buy tickets. It has 2 million registered users. The hardest moment is a "big sale", when a popular concert opens and many more people want seats than exist.

## 2. Requirements

### Functional

- Users can browse and search events.
- Users can view the seat map of an event with each seat's status.
- Users can hold seats temporarily (10 minutes) while they pay.
- Users can pay for held seats and receive tickets.
- Users can view their own tickets.

### Non-functional

- **Correctness (most important):** a seat is never sold to two people. Nobody is charged for a seat they do not get.
- **Speed:** browsing pages load in under 500 ms. Holding a seat responds in under 1 second, even during a big sale.
- **Fairness:** during a big sale, people are served roughly in the order they arrived, and bots cannot jump the line.
- **Availability:** browsing stays up at 99.9%, and an overloaded purchase flow degrades gracefully (people wait in a queue) instead of crashing.
- **Scalability:** handles the big-sale peak below without redesign.

### Non-goals

Refunds, resale between users, and multiple currencies.

## 3. Estimates

### Normal day

- 50,000 visitors x 10 pages = 500,000 page views/day. 500,000 / 100,000 s = about **5 page views/s** (about 25/s at peak).
- 5,000 tickets/day = about **0.05 purchases/s** (one every 20 seconds).

### Big sale

- 200,000 people in 10 minutes (600 s) = about **333 new visitors/s**.
- If each views about 10 pages: 200,000 x 10 / 600 = about **3,300 page views/s**.
- 20,000 seats sold in 600 s = about **33 purchases/s** at best.
- Demand is 10 people for every seat (200,000 / 20,000), all competing for the same rows.

### Comparison

| Measure                  | Normal      | Big sale           | Increase         |
| ------------------------ | ----------- | ------------------ | ---------------- |
| Page views/s             | 5           | 3,300              | about 660x       |
| Purchases/s              | 0.05        | 33                 | about 660x       |
| Competition for one seat | almost none | 10 buyers per seat | heavy contention |

Conclusion: normal traffic is trivial for one server and one database. The big sale is a short, extreme spike (about 600x) focused on one event, so the design is built around the spike, and contention for the same seats is the real problem.

## 4. API

| Method and path                                                   | Purpose                                             | Success                                     | Errors                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `GET /events?query=&page=`                                        | Browse and search events                            | 200                                         | 400                                                    |
| `GET /events/{eventId}`                                           | Event details                                       | 200                                         | 404                                                    |
| `GET /events/{eventId}/seats`                                     | Seat map with status (available, held, sold)        | 200                                         | 404                                                    |
| `POST /events/{eventId}/holds` body `{ "seatIds": [101, 102] }`   | Hold seats for 10 minutes (creates a pending order) | 201 `{ "orderId": 77, "expiresAt": "..." }` | 409 if any seat is taken, 401, 429                     |
| `DELETE /orders/{orderId}`                                        | Release a hold early                                | 204                                         | 404                                                    |
| `POST /orders/{orderId}/payment` body `{ "paymentToken": "..." }` | Pay for the held seats                              | 201 with tickets                            | 410 hold expired, 402 payment failed, 409 already paid |
| `GET /me/tickets`                                                 | View my tickets                                     | 200                                         | 401                                                    |

Payment requests carry an `Idempotency-Key` header, so a retried request never charges twice.

## 5. Data Model

```sql
CREATE TABLE users (
  id         BIGINT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id        BIGINT PRIMARY KEY,
  title     TEXT NOT NULL,
  venue     TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  on_sale_at TIMESTAMP NOT NULL
);

CREATE TABLE orders (
  id         BIGINT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id),
  event_id   BIGINT NOT NULL REFERENCES events(id),
  status     TEXT NOT NULL CHECK (status IN ('pending','paid','expired','cancelled')),
  expires_at TIMESTAMP,                 -- hold deadline while pending
  total_cents INT NOT NULL,
  idempotency_key TEXT UNIQUE
);

CREATE TABLE seats (
  id        BIGINT PRIMARY KEY,
  event_id  BIGINT NOT NULL REFERENCES events(id),
  section   TEXT NOT NULL,
  row_label TEXT NOT NULL,
  seat_no   INT  NOT NULL,
  price_cents INT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'available'
            CHECK (status IN ('available','held','sold')),
  order_id  BIGINT REFERENCES orders(id),   -- who holds or bought it
  hold_expires_at TIMESTAMP,
  UNIQUE (event_id, section, row_label, seat_no)
);

CREATE TABLE tickets (
  id       BIGINT PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  seat_id  BIGINT NOT NULL UNIQUE REFERENCES seats(id),  -- one ticket per seat, ever
  qr_code  TEXT NOT NULL UNIQUE
);
```

Relationships: a user has many orders; an event has many seats and many orders; an order covers many seats and produces many tickets; each seat has at most one ticket.

## 6. Preventing Double-Booking

The database is the only place that decides who gets a seat. The seat map in the cache is only a hint.

**Step 1: hold (atomic conditional update).** For each requested seat, in one transaction:

```sql
UPDATE seats
SET status = 'held', order_id = :orderId,
    hold_expires_at = NOW() + INTERVAL '10 minutes'
WHERE id = :seatId
  AND (status = 'available'
       OR (status = 'held' AND hold_expires_at < NOW()));
```

If the number of rows updated is **1**, this buyer got the seat. If it is **0**, someone else has it. The database locks the row during the update, so two simultaneous requests are processed one after the other, and only the first still sees `available`. If any seat in the request fails, the transaction rolls back (all or nothing) and the API returns `409`.

**Step 2: pay.** Inside a transaction, re-check ownership before confirming:

```sql
UPDATE seats SET status = 'sold'
WHERE id = :seatId AND order_id = :orderId
  AND status = 'held' AND hold_expires_at > NOW();
```

Then insert the tickets and mark the order `paid`. If the hold expired, the update affects 0 rows and the payment is not completed. The payment provider is called with an idempotency key, and a payment is refunded automatically if the transaction cannot complete.

**Step 3: safety net.** `tickets.seat_id` is `UNIQUE`. Even if a bug in the app code tried to issue a second ticket for the same seat, the database would reject it.

**Expired holds:** a background job periodically sets expired holds back to `available`, and the hold query above also treats an expired hold as free, so correctness never depends on the job running on time.

## 7. Architecture

```
Users -> CDN -> Waiting room (queue) -> Load balancer -> App servers (stateless)
                                                              |        |
                                                           Redis    Primary DB -> Read replicas
                                                                       |
                                                              Payment provider
                                                    Background worker (expires holds)
```

- **CDN:** serves static files and event pages and images, so most of the 3,300 page views/s never reach our servers.
- **Waiting room (virtual queue):** during a big sale, visitors enter a first-come-first-served queue and are admitted in batches (for example 1,000 at a time) at a rate the purchase flow can handle. This provides fairness, with bot checks and one place in line per account, and it protects the database from 200,000 people at once.
- **Load balancer:** spreads requests over several app servers and removes failed ones.
- **App servers:** stateless, so we can add more before a big sale (horizontal scaling). They contain the API and the business logic.
- **Redis cache:** holds event details and a snapshot of the seat map (refreshed every 1-2 seconds). Seat-map reads, the most frequent request, hit memory instead of the database.
- **Primary database:** the single source of truth for holds and sales. All writes (holds, payments) go here, which is what makes the atomic updates in section 6 work. At about 33 purchases/s this is well within what one primary can handle.
- **Read replicas:** serve event listings and ticket history, and take over if the primary fails.
- **Payment provider:** an external service that charges the card. Called only after a seat is held.
- **Background worker:** releases expired holds and cancels abandoned orders.

**How it survives the big sale:** the CDN and cache absorb the read spike, the waiting room flattens the traffic into a steady stream, extra app servers are added in advance, and only the small number of admitted buyers touch the primary database.

## 8. Trade-offs

1. **Cached seat map vs accuracy.** A 1-2 second old seat map means a user may click a seat that was just taken and get a `409`. We accept this because serving every view from the database would not survive 3,300 views/s. The database check keeps it correct, and the UI shows a friendly "seat just taken" message.
2. **Length of the hold (10 minutes).** A long hold gives people time to pay but locks seats away from others, which matters when demand is 10 to 1. A short hold frees seats faster but frustrates slow payers. We chose 10 minutes, and could shorten it during big sales.
3. **Waiting room vs speed.** The queue makes people wait and adds a component to maintain, but without it the system could fail for everyone. We give up instant access to gain fairness and stability.
4. **Single primary database vs sharding.** One primary keeps transactions simple and correct. Sharding by event could scale writes further but adds complexity we do not need at about 33 writes/s.

## 9. Alternatives Considered

- **Selling without holds (check only at payment):** rejected, because people would pay and then learn the seat is gone.
- **Locking seats in Redis only:** faster, but the cache is not the source of truth and could lose data on a crash. We prefer the database.
- **No queue, just autoscaling:** autoscaling is too slow for a spike that starts within seconds, and it does not provide fairness.

## 10. Risks and Open Questions

- Bots buying seats: needs rate limiting (`429`) and CAPTCHA, details undecided.
- Payment succeeds but the database transaction fails: needs automatic refunds, which should be tested.
- How many people the waiting room should admit at once: to be set by load testing.
- What to monitor: error rate, response time (p95), queue length, database CPU, number of expired holds.
