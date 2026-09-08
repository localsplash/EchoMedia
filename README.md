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

Use the canonical [EchoOrchestrator](https://github.com/localsplash/EchoOrchestrator)
deployment. Keep EchoMedia private and use EchoWeb's authenticated media proxy
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
revisions and apply EchoDatabase migration
`013_retire_legacy_configuration_and_auth.sql`, which removes the obsolete SQL
settings/auth/provenance tables. See
[EchoDatabase #8](https://github.com/localsplash/EchoDatabase/issues/8) for the
exact inventory and [EchoOrchestrator #11](https://github.com/localsplash/EchoOrchestrator/issues/11)
for actual Dev deployment evidence. No database migration belongs in EchoMedia.
Active messaging/media tables and the migration ledger remain in use.

This remains an environment-only media service: no legacy SQL reader, no
PlatformConfig token, and no configuration-data copy or rollback mechanism.
The private media access checks above still apply after deployment.

Asterisk/OfficePulse remain the source for PBX extensions, queues, memberships,
trunks and live state. EchoMedia has no PBX provisioning or synchronization role.
AidaAgent, AidaHandset and deprecated PBX admin applications are outside this work.
