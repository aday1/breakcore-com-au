# breakcore.com.au

Coming soon page for breakcore.com.au.

## Source of truth

Edit files under [public/](./public). Pushing to main deploys to Cloudflare via GitHub Actions.

`
public/
  index.html        <- the page
  _headers          <- Cloudflare-style security headers
wrangler.toml       <- Cloudflare Worker + assets config
.github/workflows/  <- deploy on push
`

## One-time secret setup

This repo needs one GitHub secret to deploy:

- CLOUDFLARE_API_TOKEN - create at https://dash.cloudflare.com/profile/api-tokens with the
  "Edit Cloudflare Workers" template scoped to the account containing zone breakcore.com.au.
  Add to this repo: Settings -> Secrets and variables -> Actions -> New repository secret.

After the secret is set, every push to main deploys automatically.

## Local preview

`
npx wrangler dev
`

Visit http://localhost:8787 to preview.