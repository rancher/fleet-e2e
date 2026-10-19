#!/usr/bin/env bash
# QASE release test-run helper for the UI-RM_Release_QASE workflow (also usable locally).
#
#   resolve   Reuse the in-progress release run of MILESTONE, or create one from the
#             "<minor> Release Plan" test plan. Skipped when QASE_RUN_ID is already set.
#   suites    Work out which of SUITES still need to run, from the results of every release
#             run under MILESTONE (so a run closed by a cancelled job does not lose progress).
#   finalize  Print the per-suite status and complete the run when COMPLETE_RUN=true and
#             every plan case of SUITES has passed.
#
# Env: QASE_API_TOKEN, MILESTONE, RANCHER_VERSION, K3S_VERSION, QASE_RUN_ID, PLAN_ID,
#      SUITES (e.g. "p0 p1 p1_2 rbac special_tests"), RERUN (missing|failed|all), COMPLETE_RUN
# Writes qase_run_id / suites / all_passed to $GITHUB_OUTPUT and a table to $GITHUB_STEP_SUMMARY.

set -euo pipefail
# Make errors inside $(...) abort too, otherwise a failed API call leaves list_all looping forever
shopt -s inherit_errexit

: "${QASE_API_TOKEN:?QASE_API_TOKEN is required}"
: "${MILESTONE:?MILESTONE is required (e.g. v2.15.2)}"
# QASE milestones are titled "vX.Y.Z": add the "v" when it is left out (2.15.3 -> v2.15.3)
MILESTONE="v${MILESTONE#v}"
QASE_PROJECT_CODE="${QASE_PROJECT_CODE:-FLEET}"
API="https://api.qase.io/v1"
TITLE_PREFIX="Fleet Automation E2E"
SPEC_DIR="$(cd "$(dirname "$0")/../../tests/cypress/e2e/unit_tests" && pwd)"

# Suite tag (without @) -> spec file holding its tests
declare -A SUITE_SPEC=(
  [p0]=p0_fleet.spec.ts
  [p1]=p1_fleet.spec.ts
  [p1_2]=p1_2_fleet.spec.ts
  [rbac]=rbac_fleet.spec.ts
  [special_tests]=special_fleet_tests.spec.ts
  [appco]=appco_fleet_tests.spec.ts
)

die() { echo "ERROR: $*" >&2; exit 1; }
output() { echo "$1=$2" >> "${GITHUB_OUTPUT:-/dev/null}"; }
summary() { echo -e "$*" >> "${GITHUB_STEP_SUMMARY:-/dev/stderr}"; }

qase() { # qase <path> [curl args...]
  local path=$1; shift
  curl --silent --show-error --fail -H "Token: ${QASE_API_TOKEN}" -H "Accept: application/json" \
    "$@" "${API}/${path}" || die "QASE API call failed: ${path}"
}

list_all() { # list_all <endpoint> [--data-urlencode k=v...] -> all entities as one JSON array
  local endpoint=$1; shift
  local offset=0 page count all='[]'
  while true; do
    page=$(qase "${endpoint}/${QASE_PROJECT_CODE}" --get \
      --data-urlencode "limit=100" --data-urlencode "offset=${offset}" "$@")
    all=$(jq -c --argjson acc "$all" '$acc + (.result.entities // [])' <<<"$page")
    count=$(jq -r '.result.entities | length' <<<"$page")
    [ "${count:-0}" -lt 100 ] && break
    offset=$((offset + count))
  done
  echo "$all"
}

milestone_id() {
  local id
  id=$(list_all milestone | jq -r --arg m "$MILESTONE" '[.[] | select(.title == $m) | .id][0] // empty')
  [ -n "$id" ] || die "milestone '${MILESTONE}' not found in QASE project ${QASE_PROJECT_CODE}"
  echo "$id"
}

release_runs() { # all release runs (any status) under the milestone
  local mid
  mid=$(milestone_id)
  list_all run --data-urlencode "milestone=${mid}" \
    | jq -c --arg p "$TITLE_PREFIX" '[.[] | select(.title | startswith($p))]'
}

# Case IDs a spec reports to: qase(N, ...), data rows { qase_id: N }, and @fleet-N tags
spec_case_ids() {
  perl -0pe 's#/\*.*?\*/##gs; s#^\s*//.*$##mg' "${SPEC_DIR}/$1" | tr '\n' ' ' \
    | grep -oE 'qase\(\s*[0-9]+|qase_id:\s*[0-9]+|@fleet-[0-9]+' | grep -oE '[0-9]+' | sort -un \
    | jq -sc .
}

cmd_resolve() {
  # "auto" is the qase_run_id default of the other ui-rm_* lanes: treat it as "not set"
  [ "${QASE_RUN_ID:-}" = "auto" ] && QASE_RUN_ID=""
  if [ -n "${QASE_RUN_ID:-}" ]; then
    [[ "$QASE_RUN_ID" =~ ^[0-9]+$ ]] || die "QASE_RUN_ID must be a numeric run ID, got '${QASE_RUN_ID}'"
    echo "Using provided QASE run ${QASE_RUN_ID}" >&2
  else
    : "${RANCHER_VERSION:?RANCHER_VERSION is required}"
    QASE_RUN_ID=$(release_runs | jq -r '[.[] | select(.status == 0) | .id] | min // empty')
    if [ -n "$QASE_RUN_ID" ]; then
      echo "Reusing in-progress QASE run ${QASE_RUN_ID}" >&2
    else
      if [ -z "${PLAN_ID:-}" ]; then
        local minor plan_title
        minor=$(grep -oE '[0-9]+\.[0-9]+' <<<"$RANCHER_VERSION" | head -1)
        [ -n "$minor" ] || die "cannot derive Rancher minor from '${RANCHER_VERSION}'; set PLAN_ID"
        plan_title="${minor} Release Plan"
        PLAN_ID=$(list_all plan | jq -r --arg t "$plan_title" '[.[] | select(.title == $t) | .id] | min // empty')
        [ -n "$PLAN_ID" ] || die "test plan '${plan_title}' not found; set PLAN_ID"
      fi
      local payload create
      payload=$(jq -n \
        --arg title "${TITLE_PREFIX} Rancher=${RANCHER_VERSION} K3s=${K3S_VERSION:-n/a}" \
        --arg desc "${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-local}/actions/runs/${GITHUB_RUN_ID:-local}" \
        --argjson milestone_id "$(milestone_id)" --argjson plan_id "$PLAN_ID" \
        '{title: $title, description: $desc, milestone_id: $milestone_id, plan_id: $plan_id, is_autotest: true}')
      create=$(qase "run/${QASE_PROJECT_CODE}" -X POST -H "Content-Type: application/json" -d "$payload")
      QASE_RUN_ID=$(jq -r '.result.id // empty' <<<"$create")
      [ -n "$QASE_RUN_ID" ] || die "failed to create QASE run: ${create}"
      echo "Created QASE run ${QASE_RUN_ID} from plan ${PLAN_ID}" >&2
    fi
  fi
  output qase_run_id "$QASE_RUN_ID"
  summary "### QASE release run: https://app.qase.io/run/${QASE_PROJECT_CODE}/dashboard/${QASE_RUN_ID}"
  echo "$QASE_RUN_ID"
}

# status_json -> [{suite, cases, missing:[ids], failed:[ids]}] over the plan cases of each suite
status_json() {
  : "${QASE_RUN_ID:?QASE_RUN_ID is required}"
  local plan_cases run_ids latest suite ids rows='[]'
  plan_cases=$(qase "run/${QASE_PROJECT_CODE}/${QASE_RUN_ID}" --get --data-urlencode "include=cases" \
    | jq -c '.result.cases // [] | map(if type == "object" then (.case_id // .id) else . end)')
  run_ids=$(release_runs | jq -r --argjson id "$QASE_RUN_ID" '[.[].id] + [$id] | unique | map(tostring) | join(",")')
  # Latest result per case across all release runs of the milestone
  latest=$(list_all result --data-urlencode "run=${run_ids}" \
    | jq -c 'group_by(.case_id) | map(max_by(.end_time // "") | {key: (.case_id | tostring), value: .status}) | from_entries')
  for suite in ${SUITES:?SUITES is required}; do
    [ -n "${SUITE_SPEC[$suite]:-}" ] || die "unknown suite '${suite}' (known: ${!SUITE_SPEC[*]})"
    ids=$(spec_case_ids "${SUITE_SPEC[$suite]}")
    rows=$(jq -c --arg s "$suite" --argjson ids "$ids" --argjson plan "$plan_cases" --argjson r "$latest" '
      # Without plan cases (run not created from a plan) fall back to every case in the spec
      (if ($plan | length) == 0 then $ids else $ids | map(select(. as $i | $plan | index($i))) end) as $cases
      | . + [{suite: $s, cases: $cases,
              missing: [$cases[] | select($r[tostring] == null)],
              failed:  [$cases[] | select($r[tostring] != null and ($r[tostring] | IN("passed", "skipped") | not))]}]
    ' <<<"$rows")
  done
  echo "$rows"
}

print_table() {
  summary "\n| Suite | Plan cases | Missing | Failed | Action |\n|---|---|---|---|---|"
  jq -r --arg rerun "$1" '.[] | "| @\(.suite) | \(.cases | length) | \(.missing | join(", ")) | \(.failed | join(", ")) | \(
      if (.cases | length) == 0 and $rerun != "all" then "skip (no case in plan)"
      elif $rerun == "all" or (.missing | length) > 0 or ($rerun == "failed" and (.failed | length) > 0) then "run"
      else "done" end) |"' <<<"$2" >> "${GITHUB_STEP_SUMMARY:-/dev/stderr}"
}

cmd_suites() {
  local rerun="${RERUN:-failed}" rows selected
  case "$rerun" in missing|failed|all) ;; *) die "RERUN must be missing, failed or all" ;; esac
  rows=$(status_json)
  selected=$(jq -c --arg rerun "$rerun" '[.[] | select(
      $rerun == "all" or ((.cases | length) > 0 and ((.missing | length) > 0 or ($rerun == "failed" and (.failed | length) > 0)))
    ) | .suite]' <<<"$rows")
  print_table "$rerun" "$rows"
  output suites "$selected"
  echo "$selected"
}

cmd_finalize() {
  local rows all_passed status
  rows=$(status_json)
  print_table failed "$rows"
  all_passed=$(jq -r 'all(.[]; (.missing | length) == 0 and (.failed | length) == 0)' <<<"$rows")
  output all_passed "$all_passed"
  status=$(qase "run/${QASE_PROJECT_CODE}/${QASE_RUN_ID}" | jq -r '.result.status')
  if [ "$status" != "0" ]; then
    summary "\n**QASE run ${QASE_RUN_ID} is already completed** (e.g. by a cancelled job). The next trigger creates a new run and only re-runs what is still missing/failed."
  elif [ "$all_passed" = "true" ] && [ "${COMPLETE_RUN:-false}" = "true" ]; then
    qase "run/${QASE_PROJECT_CODE}/${QASE_RUN_ID}/complete" -X POST >/dev/null
    summary "\nAll plan cases passed - QASE run ${QASE_RUN_ID} completed."
  else
    summary "\nQASE run ${QASE_RUN_ID} left open. Re-trigger the workflow with the same milestone to re-run what is missing/failed."
  fi
}

case "${1:-}" in
  resolve)  cmd_resolve ;;
  suites)   cmd_suites ;;
  finalize) cmd_finalize ;;
  *)        sed -n 2,14p "$0"; exit 1 ;;
esac
