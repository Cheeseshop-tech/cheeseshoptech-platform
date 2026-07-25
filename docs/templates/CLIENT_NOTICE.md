# Client notice — template

For when the client saw the outage, or is about to. Five sentences. Send it before they ask; a
notice that arrives after the question has already cost you the credit it was meant to buy.

---

Subject: <Feature> — resolved

<Feature> was <symptom, in their words not yours> between <start> and <end>. The cause was
<one clause, plain English, no stack trace>. It's fixed and verified — <the one number that
proves it>. <What, if anything, they need to do — usually "nothing on your end.">
<What prevents a repeat, in one clause.>

---

Worked example:

> Downloading full-size PNGs from the Media Hub and Product Catalog was failing on about 30 product
> images since this morning. The download was requesting an uncompressed version larger than our
> image service will deliver in one file. It's fixed and verified across every affected image —
> all 32 now download correctly. Nothing needed on your end; if you downloaded a file and got an
> error page, just try again. The size limit is now enforced at the point of download, so it can't
> recur as images are added.

Rules: no jargon that requires a follow-up question — "our image service" beats "Cloudinary's
derived asset cap." Name the time window; "briefly" invites them to supply their own guess, which
is always worse than reality. Never apologise twice. Never promise it can't happen again unless
something structural changed — and if it did, say what.
