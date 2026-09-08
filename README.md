# Task Report Frame

Bitrix24/VibeCode embedded frame for a smart-process project card. The app builds a task report for the selected project: it reads the smart-process item, resolves its company, loads linked tasks, applies client filters, shows totals, lets permitted users update planned task time, and provides a print-friendly view.

## Requested Access

The production app runs with `VIBECODE_APP_KEY` plus the embedded user session forwarded by VibeCode Gateway as `X-Vibe-Authorization: Bearer vibe_session_...`. The backend forwards both values to VibeCode API so Bitrix24 checks access as the current employee.

Required VibeCode/Bitrix24 access:

| Area | Endpoints used | Why it is needed |
| --- | --- | --- |
| Tasks read/write | `GET /v1/tasks/fields`, `POST /v1/tasks/search`, `POST /v1/tasks/update` | Find the configured task field for "Position", load tasks linked to the current smart-process project, and update `timeEstimate` when a permitted user changes planned time. |
| CRM/smart-process read | `GET /v1/items/{entityTypeId}/{id}` | Read the current project title and company binding for the report header. |
| Company read | `GET /v1/companies/{id}` | Show the contractor/company name in the report header and print title. |
| App placement management | `POST /v1/apps/{appId}/publish`, fallback `POST /v1/placements/bind` | Publish or bind the app tab to `CRM_DYNAMIC_<entityTypeId>_DETAIL_TAB`. Used by the publish script, not during normal report viewing. |

Viewing, filtering, sorting, and printing do not write data. Planned-time edits write only the selected task `timeEstimate` and require the embedded user session, so Bitrix24 permissions decide whether the current employee may save the change. Personal `VIBECODE_API_KEY` is not deployed to production by default and is allowed only for explicit local diagnostics with `VIBECODE_ALLOW_PERSONAL_API_KEY=true`.

## Security Model

- Production deploy must set `VIBECODE_APP_KEY` to the real `vibe_app_...` key.
- Production deploy must not set `VIBECODE_API_KEY`.
- `/api/report` requires `X-Vibe-Authorization` by default before accepting `entityTypeId` or `itemId`, including manually entered project IDs.
- `/api/report/tasks/:taskId/planned-time` also requires `X-Vibe-Authorization`; it does not accept anonymous direct calls.
- Manual project mode only changes how the frontend supplies `itemId`; backend access is still checked through the embedded user session.
- Direct external calls to the Black Hole URL without a Bitrix24 frame session are expected to return `401`.

## Known Limitations

- Report viewing is read-only, but users with Bitrix24 permission to edit a task can update that task's planned time from the report.
- Manual mode accepts a numeric project ID when the frame opens without smart-process context; inaccessible IDs should fail through VibeCode/Bitrix24 permission checks.
- Task links open as regular Bitrix24 task URLs in a new tab. Embedded side-panel opening is not part of this release.
- The smart-process type for manual mode is fixed internally as `entityTypeId=184`.

## Reviewer Check

1. Deploy with separate keys:

   ```powershell
   .\scripts\deploy-vibecode.ps1 -ServerId <black-hole-server-id> -DeployApiKey <vibe_api_deploy_key> -AppKey <vibe_app_key>
   ```

2. Open the app from the Bitrix24 smart-process detail tab published as `CRM_DYNAMIC_184_DETAIL_TAB`.
3. Confirm the report loads for a project the current employee can access.
4. Change a task planned time in `H:MM` format and confirm Bitrix24 stores the updated value before another planned-time edit is allowed.
5. Sort the task list in the UI, print the report, and confirm the print order matches the visible sort order.
6. Open the app without project context, enter a project ID in manual mode, and confirm accessible projects load while inaccessible IDs do not expose data.
7. Call the deployed `/api/report?entityTypeId=184&itemId=<id>` directly outside Bitrix24 frame; expected result is `401`.
8. Run local automated checks:

   ```bash
   npm test
   ```
