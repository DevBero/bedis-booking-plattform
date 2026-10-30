#!/usr/bin/env bash
# Builds the booking page and the Studio and uploads both to the S3 bucket of the given environment.
# Usage: bash scripts/deploy-site.sh production
set -euo pipefail

ENV_NAME="${1:-}"
DOMAIN="$(node -e 'const s=require("fs").readFileSync("infra/config.ts","utf8");console.log(s.match(/DOMAIN = "([^"]+)"/)[1])')"
SANITY_PROJECT_ID="$(node -e 'const s=require("fs").readFileSync("infra/config.ts","utf8");console.log(s.match(/SANITY_PROJECT_ID = "([^"]+)"/)[1])')"
case "$ENV_NAME" in
  production) APP_URL="https://$DOMAIN"; DATASET="production" ;;
  *) echo "Usage: $0 production" >&2; exit 1 ;;
esac

STACK="Bedi-Site-$ENV_NAME"
REGION="eu-north-1"

output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(output BucketName)"
DISTRIBUTION_ID="$(output DistributionId)"
echo "→ $ENV_NAME: s3://$BUCKET, CloudFront $DISTRIBUTION_ID"

# Exported values win over .env files, so a local .env can never switch on the mock
export NEXT_PUBLIC_APP_URL="$APP_URL"
export NEXT_PUBLIC_API_MOCK=""
rm -rf out studio/dist
pnpm build

# Studio under /admin, pointed at the dataset of this environment
SANITY_STUDIO_PROJECT_ID="$SANITY_PROJECT_ID" SANITY_STUDIO_DATASET="$DATASET" pnpm --filter bedi-studio build
mkdir -p out/admin
cp -R studio/dist/. out/admin/

DEST="s3://$BUCKET"
# Hashed files never change under the same name
aws s3 sync out "$DEST" --exclude "*" --include "_next/static/*" --include "admin/static/*" \
  --cache-control "public,max-age=31536000,immutable"
# The Studio shell must always be fresh, or an old shell would request deleted bundles
aws s3 cp out/admin/index.html "$DEST/admin/index.html" --cache-control "no-cache"
# Fonts and images outside the hashed folders
aws s3 sync out "$DEST" --exclude "*" --include "*.woff2" --include "*.png" --include "*.svg" --include "*.ico" \
  --exclude "_next/static/*" --exclude "admin/*" --cache-control "public,max-age=86400,s-maxage=604800"
# HTML and everything else: browser always revalidates, CloudFront keeps it for a day
aws s3 sync out "$DEST" --exclude "_next/static/*" --exclude "admin/*" --exclude "*.woff2" --exclude "*.png" --exclude "*.svg" --exclude "*.ico" \
  --cache-control "public,max-age=0,s-maxage=86400"
# Remove files that are no longer part of the build
aws s3 sync out "$DEST" --delete --size-only

aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" \
  --query "Invalidation.Id" --output text
echo "✓ Live: $APP_URL (Studio: $APP_URL/admin/)"
