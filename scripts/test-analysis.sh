#!/bin/zsh
set -eu

script_dir="${0:A:h}"
repo_root="${script_dir:h}"
api_dir="${repo_root}/services/api"

"${script_dir}/setup-analysis.sh"
exec "${api_dir}/.venv/bin/python" -m unittest discover -s "${api_dir}/tests" -v
