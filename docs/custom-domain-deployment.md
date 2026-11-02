# Mijoli custom domain

Deployment record for 2 November 2026. The user selected **www.mijoli.com** as the primary address. Only the `mijoli.com` zone was changed; `mijoli.cz`, `mijoli.eu` and `mijoli.sk` were not changed or configured as redirects.

## Hosting and status

GitHub Pages for `MajkPowa/mijoli` has the custom domain `www.mijoli.com`. Publishing still uses the existing GitHub Actions workflow, branch `main` and `dist/` directory. No application, asset, checkout or workflow code changed for the domain connection. An Actions deployment does not require a `CNAME` file in `dist/`.

Live verification completed on 2 November 2026 at 20:04 CET:

- Strict TLS validation passed for both `mijoli.com` and `www.mijoli.com`.
- `https://www.mijoli.com/` serves the storefront with HTTP 200. The HTTPS apex redirects with HTTP 301 to the primary `www` address.
- GitHub Pages reports an approved certificate covering both names, expiring on 31 January 2027, and `https_enforced: true`.
- The public browser loaded the site over HTTPS. Search for Imunita, product details at 899 Kč and adding one package to the cart worked; the test item was then removed.

HTTPS requests were checked with normal certificate verification, without bypassing certificate errors. Older DNS and HTTP caches can temporarily retain the previous provider response; no alternative-domain routing was changed to work around those caches.

## Saved DNS configuration

The Webglobe editor confirmed a successful import. All records below use TTL 3600 seconds.

| Name | Type | Value |
| --- | --- | --- |
| `mijoli.com` | A | `185.199.108.153` |
| `mijoli.com` | A | `185.199.109.153` |
| `mijoli.com` | A | `185.199.110.153` |
| `mijoli.com` | A | `185.199.111.153` |
| `www.mijoli.com` | CNAME | `majkpowa.github.io` |

The previous apex `A 62.109.151.80` and wildcard `*.mijoli.com A 62.109.151.80` were replaced by these five web records. Other unspecified subdomains no longer inherit the previous wildcard. Nameservers remain `ns1.webglobe.cz`, `ns2.webglobe.cz` and `ns3.webglobe.com`; DNSSEC settings were not edited.

## Preservation and validation

Authenticated before/after zone exports were retained locally in `deployment-records/` beside this repository as `mijoli-com-zone-before.txt` and `mijoli-com-zone-after.txt`. They are outside the published `dist/` directory and are not required by the website.

A canonical comparison of owner, TTL, record type and value found 21 records before and 24 after, excluding SOA. Exactly the two previous web A records were removed and the five web records above were added. The other 19 records were unchanged:

- Four apex MX records, priority 10, for `email.webglobe.cz`, `email2.webglobe.cz`, `email3.webglobe.cz` and `email4.webglobe.cz`.
- Both existing apex SPF TXT values and `_dmarc` TXT.
- The three NS records.
- The `imap`, `mail`, `pop3` and `smtp` A records, still `62.109.151.33`.
- The `autoconfig`, `autodiscover`, `dbadmin` and `webmail` CNAME records and `_autodiscover._tcp` SRV record.

The SPF text retains its existing `a` mechanism, whose resolved addresses follow the new apex A records. Preserving DNS records is not an end-to-end email delivery test; no test messages were sent.

## Preview behavior

The storefront remains a design preview with `noindex,nofollow`. The local checkout does not send orders or process payments. Prices and availability remain a catalog snapshot. Existing links for actual purchases, contacts and terms still lead to the source Shoptet store. Switching origin creates a separate local cart and favorites store in the browser.

## Rollback

1. In the `mijoli.com` zone, replace the four GitHub apex A records with the previous `A 62.109.151.80`, TTL 3600.
2. Replace the explicit `www` CNAME with the previous wildcard `*.mijoli.com A 62.109.151.80`, TTL 3600. Preserve all unrelated records and any later intentional changes; use the authenticated before export as the reference.
3. Verify authoritative and public DNS have returned to the previous values.
4. Remove the custom domain from the repository's GitHub Pages settings (`cname: null`) to restore the default project address `https://majkpowa.github.io/mijoli/`.

Rollback restores the former routing, which previously showed the provider's default page. It does not guarantee content on that former server. The default GitHub project URL may redirect while a custom domain is configured, so it is not an independent live fallback until the custom-domain setting is removed.
