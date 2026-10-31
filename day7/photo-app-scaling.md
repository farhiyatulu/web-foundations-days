# SnapShare: Scaling Plan for 10 Million Users

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

| #   | Assumption                                                           |
| --- | -------------------------------------------------------------------- |
| 1   | 10,000,000 registered users                                          |
| 2   | 10% are active on a given day, so 1,000,000 daily active users (DAU) |
| 3   | Each active user uploads 1 photo per day                             |
| 4   | Each active user views 50 feed pages per day                         |
| 5   | An average photo is 2 MB                                             |
| 6   | Each photo also gets a thumbnail of 50 KB                            |
| 7   | Busy hours are about 5x the average (rule of thumb)                  |
| 8   | 1 day is rounded to 100,000 seconds for easy maths                   |
| 9   | Metadata per photo (owner, caption, time, file paths) is about 1 KB  |

## 2. Load estimates

```text
Uploads (writes):   1,000,000 users x 1 photo        = 1,000,000 per day
                    1,000,000 / 100,000              = 10 uploads per second (average)
                    peak (x5)                        = 50 uploads per second

Feed views (reads): 1,000,000 users x 50 pages       = 50,000,000 per day
                    50,000,000 / 100,000             = 500 feed views per second (average)
                    peak (x5)                        = 2,500 feed views per second

Storage per day:    originals:   1,000,000 x 2 MB    = 2,000,000 MB = 2 TB
                    thumbnails:  1,000,000 x 50 KB   = 50,000,000 KB = 50 GB
                    metadata:    1,000,000 x 1 KB    = 1 GB

Storage per year:   originals:   2 TB x 365          = 730 TB
                    thumbnails:  50 GB x 365         = 18,250 GB, about 18 TB
                    metadata:    1 GB x 365          = 365 GB
                    total                            = about 750 TB per year

Upload bandwidth:   10 uploads/s x 2 MB              = 20 MB/s average
                    50 uploads/s x 2 MB              = 100 MB/s at peak
```

## 3. Read-heavy or write-heavy?

**SnapShare is read-heavy in requests**: 500 feed views per second against 10 uploads per second is **50 times more reads than writes** (2,500 vs 50 at peak). So caching and read replicas will help a lot.

It is also **storage-heavy**: the number of writes is small, but each one is large. About 750 TB per year is far too much for a normal database, so photo files must live in object storage, and the database holds only small metadata rows. Compare this with QuickNotes (about 180 GB per year): here the data size, not the request rate, is the main challenge.

**Why photo files go in object storage and not in the database:** a database is built for small, structured rows that are queried, joined and updated. Storing 2 MB binary files in it would make the tables and backups huge (about 750 TB per year), slow down the metadata queries that every feed view needs, and make replication copy every photo to every replica. Object storage is built for large files: it is cheap per GB, grows almost without limit, keeps several copies automatically, and works directly with a CDN. The database keeps only the file key (path) for each photo.

## 4. Architecture diagram

```text
 ┌───────────────┐ DNS lookup ┌───────┐
 │   Browser /   ├───────────>│  DNS  │
 │ mobile client │            └───────┘
 └──┬─────────┬──┘
    │         │         ┌───────────────┐ cache miss  ┌────────────────────┐
    │         └────────>│  CDN (edge)   ├────────────>│   Object storage   │
    │                   └───────────────┘             │    originals +     │
    │ API calls (HTTPS, JSON)                         │     thumbnails     │
    v                                                 └────────────────────┘
 ┌───────────────┐                                             ^      ^
 │ Load balancer │                                             │      │
 └───────┬───────┘                                             │      │
         │                                                     │      │
     ┌───┴──────┬──────────┐                                   │      │
     v          v          v                                   │      │
 ┌───────┐  ┌───────┐  ┌───────┐      ┌───────────────┐        │      │
 │ App 1 │  │ App 2 │  │ App 3 ├─────>│ Cache (Redis) │        │      │
 │       │  │       │  │       │      └───────────────┘        │      │
 │       │  │       │  │       ├───────────────────────────────┘      │
 └───────┘  └───────┘  └───────┘        save original photo           │
     │ writes   │ reads    │ jobs                                     │
     v          v          v                                          │
 ┌───────┐  ┌───────┐  ┌───────┐      ┌──────────────┐ save thumbnail │
 │Primary├─>│ Read  │  │ Queue ├─────>│    Worker    ├────────────────┘
 │  DB   │  │replica│  │       │      │ (thumbnails) │
 └───────┘  └───────┘  └───────┘      └──────────────┘
```

How to read it:

- **(a) Loading the page:** browser -> DNS -> CDN for HTML, CSS and JS.
- **(b) Viewing the feed:** browser -> load balancer -> app server -> Redis (hit) or read replica (miss). The photos in the feed are thumbnails fetched from the CDN, which gets them from object storage on a miss.
- **(c) Uploading a photo:** browser -> load balancer -> app server -> object storage (original photo), primary database (metadata) and queue (thumbnail job). The worker later saves the thumbnail to object storage.

To keep the picture readable, the cache and object-storage arrows are drawn from App 3 only. In reality **every** app server talks to the same Redis cache and the same object storage, so a feed cached by App 1 can be served by App 3. Writes go to the primary database, reads go to the replica, and slow jobs go to the queue.

Load estimate (corner note): **10 uploads/s and 500 feed views/s on average; 50 and 2,500 at peak; about 750 TB of new photos per year.**

## 5. Why each component exists

| Component                           | The problem it solves                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DNS                                 | Turns the name `snapshare.com` into server addresses so users do not need to know IP numbers.                                                                               |
| CDN                                 | Serves photos, thumbnails and static files from an edge server near the user, which cuts latency and keeps most of the 2,500 requests per second away from our own servers. |
| Load balancer                       | Spreads requests across several app servers and skips unhealthy ones, so no single server is overloaded or a single point of failure.                                       |
| App servers (stateless, at least 2) | Run the API logic (login, upload, feed) and can be added or removed easily because they keep no user data in memory.                                                        |
| Cache (Redis)                       | Keeps recently built feeds in memory so repeated feed views do not hit the database every time.                                                                             |
| Primary database                    | Stores the one true copy of the metadata (users, follows, photo records) and accepts all writes.                                                                            |
| Read replica                        | Copies the primary and answers read queries, so the heavy feed traffic does not slow down uploads.                                                                          |
| Object storage                      | Stores the photo files cheaply and almost without limit (750 TB per year), which a database cannot do.                                                                      |
| Message queue                       | Holds thumbnail jobs so the app can reply to the user straight away, and absorbs bursts of uploads without overload.                                                        |
| Worker                              | Takes jobs from the queue and creates the 50 KB thumbnail in the background, so uploads stay fast.                                                                          |

## 6. Flow: uploading a photo, step by step

1. The user picks a photo and taps **Upload**. The client sends `POST /photos` (HTTPS) with the 2 MB file and a caption.
2. DNS has already resolved the address, so the request goes to the **load balancer**, which forwards it to a healthy **app server**.
3. The app server checks the user's token and validates the file (type is JPEG/PNG, size under the limit).
4. It saves the **original photo** to **object storage** and gets back a file key (path).
5. It writes a **metadata row** (photo id, owner, caption, time, file key, `thumbnail_ready = false`) to the **primary database**.
6. It adds a job `{photo_id, file key}` to the **message queue**.
7. It deletes the uploader's cached feed entries in **Redis** so stale data is not served for too long.
8. It replies **201 Created** to the user. The user sees "Uploaded!" in well under a second, even though no thumbnail exists yet.
9. In the background, a **worker** takes the job from the queue, downloads the original from object storage, resizes it to a 50 KB thumbnail, and saves the thumbnail back to object storage.
10. The worker updates the database row (`thumbnail_ready = true`). If the worker crashes, the job stays in the queue and is retried.
11. The primary copies the new row to the **read replica** within a few milliseconds. Followers now see the photo in their feed, and its thumbnail is served by the **CDN**.

### How the background thumbnail queue works

Making a thumbnail is slow work that the user does not need to wait for, so the app server and the worker are separated by a queue:

- **The app server only adds a job and replies.** Adding a small message to the queue takes a few milliseconds, so the upload reply stays fast no matter how busy the workers are.
- **The worker pulls jobs at its own pace.** It takes one job at a time, makes the thumbnail, and then marks the job as done. The app server never waits for it.
- **Bursts wait in line instead of causing overload.** If 50 photos arrive in one second (the peak), the extra jobs wait in the queue and are processed a moment later, instead of overloading the app servers.
- **No job is lost.** A job is removed from the queue only after the worker finishes it. If the worker crashes halfway, the job becomes visible again and another worker retries it.
- **Workers scale separately.** If the queue keeps growing, we add more workers without touching the app servers.

## 7. Trade-offs

1. **Speed versus freshness (cache and replica).** The feed is served from Redis with a short TTL (for example 60 seconds) and from a read replica that may lag slightly. Followers may see a new photo a few seconds to a minute late. This is acceptable for a photo feed (unlike a bank balance) and it lets a few servers handle 2,500 views per second.
2. **Fast upload versus instant thumbnail (queue).** Making thumbnails in the background means the upload reply is fast, but for a short time the photo has no thumbnail yet. We accept this and show a placeholder until `thumbnail_ready` is true. The cost is extra components to run (queue and worker).
3. **Cost versus reliability (replicas and servers).** Extra app servers, a replica and object storage copies improve uptime and speed but cost more money. At this size, at least 2 app servers and one replica is a reasonable balance; more can be added if the metrics show a need.
4. **Simplicity versus scalability (no sharding, no microservices yet).** The metadata is small (about 365 GB per year), so one primary with a replica is enough for now and much simpler than sharding. We keep one well-organised application (a monolith) and split it only if the team or load clearly requires it.

## 8. What we would monitor

- Time for `GET /feed` for 95% of requests (p95 latency).
- Percentage of failed requests (error rate).
- Cache hit rate (target: 80-90%).
- Length of the thumbnail queue and the age of its oldest job (if it keeps growing, add workers).
- Replication lag of the read replica.
