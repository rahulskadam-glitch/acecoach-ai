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

"${script_dir}/setup-analysis.sh"

if [[ ! -f "${secrets_file}" ]]; then
  echo "Missing ${secrets_file}"
  exit 1
fi

exec "${api_dir}/.venv/bin/uvicorn" app:app \
  --app-dir "${api_dir}" \
  --env-file "${secrets_file}" \
  --host "${api_host}" \
  --port "${api_port}"
