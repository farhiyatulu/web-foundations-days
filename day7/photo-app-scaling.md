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

**Why photo files go in object storage and not in the database:** a database is built for small, structured rows that are queried, joined and updated. Storing 2 MB
