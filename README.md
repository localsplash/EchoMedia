# EchoMedia

EchoMedia serves existing media files over HTTP. `src/server.js` reads only
`PORT` (default `8082`) and `MEDIA_ROOT` (default `/media`) from the environment.
It has no SQL driver, no `echo_tbl_Settings` reader, and no NocoDB client.

## Configuration decision

Keep the current environment-only configuration. The listener port and mounted
media directory are deployment invariants, read once at startup. Changing either
requires matching the Compose listener/volume and restarting the service. They
are not suitable for a 30-second runtime configuration cache.

There are currently no scoped PlatformConfig requirements for this service.
Do not introduce an `echo-media` reader, NocoDB token, bootstrap volume or store
availability dependency merely to mirror other Echo applications. Add scoped
settings only when a concrete runtime feature needs them, with its own issue and
acceptance checks. This resolves the incorrect SQL-reader premise of
[issue #1](https://github.com/localsplash/EchoMedia/issues/1).

## Deployment and access

An environment includes this repo's `compose.yaml` alongside EchoWeb and
EchoService. Set `ECHO_NETWORK` to its existing private network and
`ECHO_MEDIA_VOLUME` to the external volume written by EchoService. This file
publishes no port and joins no public proxy network. It mounts media read-only.
Set `ECHO_MEDIA_REVISION`, `ECHO_MEDIA_EPOCH`, and `ECHO_MEDIA_DIRTY` from this
checkout when building alongside other repos; the unprefixed BUILD_* fallback
is for a single-repository build. See `.env.example`.

Keep EchoMedia private and use EchoWeb's authenticated media proxy
(`MEDIA_INTERNAL_BASE_URL`) for tenant access. The standalone Compose file
publishes its listener for local development; it is not a tenant authorization
boundary. `MEDIA_ROOT` must refer to the same stored media files written by
EchoService.

Verify a stored image, thumbnail, draft attachment and range request through
EchoWeb after deployment. Confirm that another tenant cannot retrieve the same
path and that EchoMedia has no public upstream exposing raw files. This is live
deployment acceptance, separate from the configuration decision.

## Disposable Dev cleanup

The owner authorized deletion of obsolete configuration and local authentication/
provenance data in the disposable Dev environment. The previous preservation and
rollback-window plan is superseded; EchoMedia adds no dependency or waiting period
to this cleanup.

EchoWeb and EchoService now read only PlatformConfig. Deploy their matching
revisions and apply AidaPlatformDB/echo migration
`013_retire_legacy_configuration_and_auth.sql`, which removes the obsolete SQL
settings/auth/provenance tables. See
[AidaPlatformDB #8](https://github.com/localsplash/AidaPlatformDB/issues/8) for the
exact inventory; record deployment evidence in the deployment PR or issue. No database migration belongs in EchoMedia.
Active messaging/media tables and the migration ledger remain in use.

This remains an environment-only media service: no legacy SQL reader, no
PlatformConfig token, and no configuration-data copy or rollback mechanism.
The private media access checks above still apply after deployment.

Asterisk/OfficePulse remain the source for PBX extensions, queues, memberships,
trunks and live state. EchoMedia has no PBX provisioning or synchronization role.
AidaAgent, AidaHandset and deprecated PBX admin applications are outside this work.

## Health version and Pacific timezone

The liveness response includes `version` (`YYYY.M.D.H.M`), full Git `revision`,
`sourceUpdatedAt` (ISO 8601 with Pacific offset), `timeZone` (`America/Los_Angeles`),
and `dirty`. Existing status fields and readiness behavior are preserved.
`GET /healthz` stays independent of authentication and external dependencies.

Versions use HEAD's committer timestamp in Pacific time (PST/PDT), never build time.
For example, `2026-09-14T21:30:42Z` becomes `2026.9.14.14.30` and
`sourceUpdatedAt: "2026-09-14T14:30:42-07:00"`. The clock belongs to the machine
creating the commit, including GitHub for web-created commits. Rebuilding a commit
preserves its version. Same-minute commits and the repeated autumn DST hour are
distinguished by `revision`; dates alone are not a monotonic sequence.

`npm run build` embeds identity in the artifact. Uncommitted/staged/untracked changes
append `-dirty`; commit before building releases. Unbuilt source development reports
`unbuilt` with null revision fields. Package and API contract versions stay separate.
Runtime `TZ` defaults to `America/Los_Angeles` and may be overridden explicitly;
version formatting always stays Pacific. Docker includes timezone data. Explicit UTC
storage/protocol timestamp contracts remain UTC to preserve existing data semantics.

Docker/source archive builds require all three values: `BUILD_REVISION` (full SHA),
`SOURCE_DATE_EPOCH` (Git committer epoch), and `BUILD_DIRTY` (`true` or `false`).
Missing or malformed identity fails the build. The wrapper derives them from Git:

```sh
scripts/with-build-info.sh sh -c 'docker build \
  --build-arg BUILD_REVISION --build-arg SOURCE_DATE_EPOCH --build-arg BUILD_DIRTY \
  -t echomedia:local .'
scripts/with-build-info.sh docker compose up -d --build

```

External orchestrators building this Dockerfile must forward these same build args.
No runtime Git checkout or version environment override is needed.
