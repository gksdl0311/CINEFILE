# in frame.

A private film and television archive by Hanyee Labs. The homepage pairs an original cinema interior with expressive serif type, near-black and oxblood surfaces, and an ivory section inspired by printed film programmes. The layout shifts from a split composition to stacked imagery on small screens.

## Use the archive

Choose **Import archive** and select your existing CINEFILE JSON, Watcha Pedia CSV, or calendar activity CSV. Imports merge into the open session. **Export backup** saves your titles, dated activity and collections as JSON. Save a backup before closing or refreshing because the session lives in the current tab. **Clear session** empties the open archive after confirmation.

Imported data is processed in the browser. The deployed assets contain the app and original artwork only. The site makes no archive requests to third-party services. Embedded JPEG, PNG and WebP artwork can be displayed locally.

## Features

- Gallery and list views with pagination, bilingual title search, review and director search, format/rating/year/date filters, and sorting.
- Title details, personal ratings, homepage activity and statistics, and a year/month timeline.
- Watcha dates appear as logged activity. Explicitly confirmed viewing dates appear as watched.
- Stable source IDs and season numbers take precedence for merges. Exact matching on a title variant, year, format and season can link entries lacking an ID. Distinct dated events are retained. Same-day event counts are reconciled across overlapping imports.
- Journal displays imported reviews. Collections can be created, edited and populated from title details.

## Run and deploy

Run `sh build.sh`, then `python3 -m http.server 8000 --directory dist` and open `http://localhost:8000`. Serve the contents of `dist/` from any HTTPS static host. Hash navigation also works on GitHub Pages under a repository path. The root application files and `art/` can be served directly on a branch-based Pages deployment. Keep personal exports separate from the checkout.

## Verification and next steps

The importer was checked against the existing JSON, combined Watcha export, and incremental calendar CSV. They reconcile to 1,276 titles and dated entries. Browser checks use synthetic records.

Future improvements include composing longer journal entries, explicit series progress, and an interface for attaching local poster files. The current archive preserves source metadata and infers neither watch completion nor confirmed viewing dates.
