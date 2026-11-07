SOURCE COLLECTOR
Collect dated items within the assigned window. Source groups can be assigned separately for parallel collection. Use one output contract for all groups.
Use the source registry for official, world, defense and aggregator indexes. Read each assigned page once and preserve the original outlet when an aggregator carries another outlet’s headline. Record failures and headline-only entries explicitly.

Official releases
Read each page once. List every item dated in the window. Open any item whose title alone does not say what was done (for example a proclamation title) and give the operative facts (rates, dates, who is covered).
Pages: White House releases https://www.whitehouse.gov/releases/ (and /page/2/ if the window reaches back further); White House presidential actions https://www.whitehouse.gov/presidential-actions/ ; Treasury https://home.treasury.gov/news/press-releases (page 1 only; its page numbers do not work) ; OFAC https://ofac.treasury.gov/recent-actions (and ?page=1 for older items) ; State https://www.state.gov/press-releases/ and /page/2/ (deeper pages fail or shift) ; Justice https://www.justice.gov/news (page 1 only; page 2 is barred by robots.txt) ; Federal Reserve https://www.federalreserve.gov/newsevents/pressreleases/2026-press.htm .

World, defense and aggregator indexes
Read each page once and list every item dated in the window (headline, outlet, date, link). Aggregators (Memeorandum, NewsNow, RealClearPolitics) show headlines from outlets we cannot reach (Politico, NYT, Washington Post, WSJ, Reuters); list those too, with the original outlet named. Do not filter by topic.
Pages: https://www.memeorandum.com/ ; https://www.newsnow.com/us/News/US+Politics ; https://www.realclearpolitics.com/ ; https://www.aljazeera.com/news/ ; https://www.euronews.com/news/international ; https://www.aa.com.tr/en/world ; https://www.cbsnews.com/politics/ ; https://defensescoop.com/ ; https://www.sofx.com/ ; https://federalnewsnetwork.com/ ; https://www.europarl.europa.eu/news/en ; https://thehill.com/news-sitemap.xml (headlines only, list every entry dated in the window as headlineOnly; The Hill article pages are blocked; sitemap times are UTC, convert to America/Chicago).

Weekday digest
For each WEEKDAY date fetch directly (do not search for it first; search returns junk):
- https://theverardogroup.substack.com/p/tvg-daily-brief-{d}-{mon}-2026  (day WITHOUT a leading zero, mon lowercase three letters, e.g. tvg-daily-brief-23-oct-2026, tvg-daily-brief-8-oct-2026; the 08-oct form fails)
If it fails, record the exact error and move on (do not search for substitutes). Weekends have no issue; say so rather than treating it as a failure.

Return pages with url, printedDate, loaded and error. Return items with date, headline, oneLine, source, originalOutlet when applicable, url, sourcePage and headlineOnly.