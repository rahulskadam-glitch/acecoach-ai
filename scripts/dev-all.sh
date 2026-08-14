#!/bin/zsh
set -eu

script_dir="${0:A:h}"
repo_root="${script_dir:h}"
workspace_root="${repo_root:h}"
secrets_file="${workspace_root}/secrets/.env.local"
fallback_secrets_file="${repo_root}/secrets/.env.local"
if [[ ! -f "${secrets_file}" && -f "${fallback_secrets_file}" ]]; then
  secrets_file="${fallback_secrets_file}"
fi
api_dir="${repo_root}/services/api"
api_host="${ANALYSIS_API_HOST:-127.0.0.1}"
api_port="${ANALYSIS_PORT:-${ANALYSIS_API_PORT:-8000}}"
web_host="${WEB_HOST:-127.0.0.1}"
web_port="${PORT:-3000}"
api_pid=""
web_pid=""

cleanup() {
  trap - INT TERM EXIT
  if [[ -n "${web_pid}" ]] && kill -0 "${web_pid}" 2>/dev/null; then
    kill -TERM "${web_pid}" 2>/dev/null || true
  fi
  if [[ -n "${api_pid}" ]] && kill -0 "${api_pid}" 2>/dev/null; then
    kill -TERM "${api_pid}" 2>/dev/null || true
  fi
  [[ -n "${web_pid}" ]] && wait "${web_pid}" 2>/dev/null || true
  [[ -n "${api_pid}" ]] && wait "${api_pid}" 2>/dev/null || true
}

trap cleanup INT TERM EXIT
"${script_dir}/setup-analysis.sh"

if [[ ! -f "${secrets_file}" ]]; then
  echo "Missing ${secrets_file}"
  exit 1
fi

export ANALYSIS_API_URL="${ANALYSIS_API_URL:-http://${api_host}:${api_port}}"

"${api_dir}/.venv/bin/uvicorn" app:app \
  --app-dir "${api_dir}" \
  --env-file "${secrets_file}" \
  --host "${api_host}" \
  --port "${api_port}" &
api_pid=$!

(cd "${repo_root}" && PORT="${web_port}" ANALYSIS_API_URL="${ANALYSIS_API_URL}" npm run dev -- --hostname "${web_host}" --port "${web_port}") &
web_pid=$!

while true; do
  if ! kill -0 "${api_pid}" 2>/dev/null; then
    wait "${api_pid}"
    exit $?
  fi
  if ! kill -0 "${web_pid}" 2>/dev/null; then
    wait "${web_pid}"
    exit $?
  fi
  sleep 1
done
