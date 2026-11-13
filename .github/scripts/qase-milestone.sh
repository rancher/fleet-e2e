#!/usr/bin/env bash
# Create the QASE run of a CI lane under a milestone, so the reporter only appends results to it.
# cypress-qase-reporter has no milestone setting, hence the run is created here through the API.
#
# Milestone: MILESTONE when given (2.15.4 or v2.15.4), else with MILESTONE_AUTO=true the next patch
# of the latest released Rancher of the lane's minor (released v2.15.3 -> v2.15.4; none released -> .0).
# The milestone is created in QASE when missing. One that cannot be resolved/created never fails the job: the run is simply not created here and the
# reporter creates it as before (no milestone).
#
# NOTE: release-testing runs are titled "Fleet Automation E2E ..." (qase-release-run.sh filters on that
# prefix to find them under a milestone). Daily runs keep the "[N] Rancher-..." title, never use that prefix.
#
# Env: QASE_API_TOKEN, RANCHER_VERSION, MILESTONE, MILESTONE_AUTO, RUN_TITLE, RUN_DESCRIPTION, GH_TOKEN
# Writes qase_run_id to $GITHUB_OUTPUT / QASE_TESTOPS_RUN_ID to $GITHUB_ENV, and a block to $GITHUB_STEP_SUMMARY.

set -euo pipefail
shopt -s inherit_errexit

: "${QASE_API_TOKEN:?QASE_API_TOKEN is required}"
QASE_PROJECT_CODE="${QASE_PROJECT_CODE:-FLEET}"
API="https://api.qase.io/v1"

summary() { echo -e "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stderr}"; }
skip() { # skip <reason>: report and carry on without milestone
  echo "::warning::QASE milestone: $*"
  summary "\n### QASE Milestone\nNot set: $*"
  exit 0
}

qase() { # qase <path> [curl args...]
  local path=$1; shift
  curl --silent --show-error --fail -H "Token: ${QASE_API_TOKEN}" -H "Accept: application/json" \
    "$@" "${API}/${path}"
}

if [[ -n "${MILESTONE:-}" ]]; then
  title="v${MILESTONE#v}"
  source_note="from the workflow input"
elif [[ "${MILESTONE_AUTO:-false}" == "true" ]]; then
  minor=$(grep -oE '[0-9]+\.[0-9]+' <<<"${RANCHER_VERSION:-}" | head -n1 || true)
  [[ -n "$minor" ]] || skip "cannot derive the Rancher minor from '${RANCHER_VERSION:-}'"
  # Alpha/RC channels have no "released + 1" meaning
  [[ "${RANCHER_VERSION}" =~ (alpha|rc) ]] && skip "'${RANCHER_VERSION}' is a pre-release channel"
  last=$(gh api --paginate "repos/rancher/rancher/releases?per_page=100" \
    --jq '.[] | select(.prerelease == false and .draft == false) | .tag_name' \
    | grep -E "^v${minor//./\\.}\.[0-9]+$" | sed -E 's/.*\.//' | sort -n | tail -n1 || true)
  if [[ -n "$last" ]]; then
    title="v${minor}.$((last + 1))"
    source_note="auto: latest released is v${minor}.${last}"
  else
    title="v${minor}.0"
    source_note="auto: no v${minor} release yet"
  fi
else
  exit 0
fi

find_milestone() { # find_milestone <title> -> id or empty (exact title match, paginated)
  local offset=0 page id count
  while :; do
    page=$(qase "milestone/${QASE_PROJECT_CODE}?limit=100&offset=${offset}") || return 1
    id=$(jq -r --arg t "$1" '[.result.entities[] | select(.title == $t) | .id][0] // empty' <<<"$page")
    if [[ -n "$id" ]]; then echo "$id"; return 0; fi
    count=$(jq '.result.entities | length' <<<"$page")
    [[ "$count" -lt 100 ]] && return 0
    offset=$((offset + 100))
  done
}

milestone_id=$(find_milestone "$title") || skip "QASE milestone lookup failed"
if [[ -z "$milestone_id" ]]; then
  # Not there yet (first run after the previous version shipped): create it. Lanes of the same minor can start
  # together, so on failure look it up again before giving up.
  milestone_id=$(qase "milestone/${QASE_PROJECT_CODE}" -X POST -H "Content-Type: application/json" \
    --data "$(jq -n --arg t "$title" '{title: $t}')" | jq -r '.result.id // empty' || true)
  if [[ -z "$milestone_id" ]]; then
    milestone_id=$(find_milestone "$title" || true)
  else
    source_note="${source_note}, milestone created"
  fi
fi
[[ -n "$milestone_id" ]] || skip "milestone '${title}' (${source_note}) could not be found or created in QASE project ${QASE_PROJECT_CODE}"

body=$(jq -n --arg title "${RUN_TITLE:?RUN_TITLE is required}" --arg desc "${RUN_DESCRIPTION:-}" \
  --argjson milestone_id "$milestone_id" \
  '{title: $title, description: $desc, milestone_id: $milestone_id, is_autotest: true, include_all_cases: false}')
run_id=$(qase "run/${QASE_PROJECT_CODE}" -X POST -H "Content-Type: application/json" --data "$body" \
  | jq -r '.result.id // empty') || skip "QASE run creation failed"
[[ -n "$run_id" ]] || skip "QASE run creation returned no id"

echo "qase_run_id=${run_id}" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "QASE_TESTOPS_RUN_ID=${run_id}" >> "${GITHUB_ENV:-/dev/null}"
summary "\n### QASE Milestone\nRun ${run_id} created under milestone **${title}** (${source_note})."
