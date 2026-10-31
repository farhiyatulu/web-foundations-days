# SnapShare: Scaling Plan for 10 Million Users

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- 10,000,000 registered users.
- 10% are active on a given day.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- An average photo is 2 MB, and each photo also gets a 50 KB thumbnail.
- One day is about 100,000 seconds (rounded for easy maths).
- Peak traffic is about 5x the average.

**Daily active users (DAU):** 10,000,000 x 10% = **1,000,000 DAU**

## 2. Estimates

### Uploads per second (writes)

```
Uploads per day:  1,000,000 users x 1 photo = 1,000,000 per day
Average:          1,000,000 / 100,000       = 10 uploads per second
Peak (5x):        10 x 5                    = 50 uploads per second
```

### Feed views per second (reads)

```
Feed views per day: 1,000,000 users x 50 views = 50,000,000 per day
Average:            50,000,000 / 100,000       = 500 feed views per second
Peak (5x):          500 x 5                    = 2,500 feed views per second
```

### Photo storage per year

```
Originals per day:   1,000,000 x 2 MB   = 2,000,000 MB = 2 TB per day
Thumbnails per day:  1,000,000 x 50 KB  = 50,000,000 KB = 50 GB per day
Total per day:       about 2.05 TB per day

Originals per year:  2 TB x 365         = 730 TB
Thumbnails per year: 50 GB x 365        = about 18 TB
Total per year:      about 748 TB (roughly 0.75 PB) per year
```

| Measure               | Average                                            | Peak (5x) |
| --------------------- | -------------------------------------------------- | --------- |
| Uploads per second    | 10                                                 | 50        |
| Feed views per second | 500                                                | 2,500     |
| Storage per year      | about 748 TB (730 TB originals + 18 TB thumbnails) | n/a       |

## 3. Read-heavy or write-heavy?

**SnapShare is read-heavy.** There are 500 feed views per second against 10 uploads per second, a ratio of about **50 reads for every 1 write**.

What this means for the design:

-
