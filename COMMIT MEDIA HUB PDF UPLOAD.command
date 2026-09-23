#!/bin/bash
cd "$(dirname "$0")"
# Self-heal: a Claude session stranded .git/index.lock on 2026-09-23 (sandbox cannot delete it; your Mac can).
rm -f .git/index.lock .git/HEAD.lock
git add "src/components/media/media-hub.jsx" "src/lib/cloudinary.js" "netlify/functions/media-list.js" "COMMIT MEDIA HUB PDF UPLOAD.command"
git commit -m "Media Hub: let the Upload button take PDFs (spec sheets, sales sheets)

Rick (2026-09-23): the Media Hub would not let him upload the new 04176
Drunken Cheese Wedge 7 oz spec sheet. Cause: the top-bar file input only
accepted image types, even though the empty Documents tab already tells the
user to upload PDFs there and media-upload-sign.js already signs them.

- media-hub.jsx: add application/pdf / .pdf to the Upload input's accept list.
- cloudinary.js: uploadAsset() keeps posting to image/upload (the same storage
  the 7 oz spec sheets use, so the PDF gets a page-1 thumbnail) and now marks a
  PDF result kind:document so the fresh tile renders as a document.
- media-list.js: docTypeOf() also reads the caption. Hub uploads get a random
  public_id, so the typed name (e.g. 04176-specsheet) is the only place the
  spec-sheet signal survives; without this they filed under Documents > Other.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LNUusUFJ2cRduSgt53UpcZ"
if [ $? -ne 0 ]; then echo ""; echo "COMMIT FAILED -- nothing was pushed. Ask Claude for help."; read -n 1; exit 1; fi
git push origin phase-2-6-build || { echo ""; echo "PUSH FAILED -- the commit is saved locally. Ask Claude for help."; read -n 1; exit 1; }
echo ""; echo "Pushed. Staging builds in ~1-2 min: https://cheeseshoptech-platform.netlify.app/?client=montitrentini"
echo ""
echo "Done. Press any key to close this window."
read -n 1
