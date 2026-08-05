#!/bin/zsh
set -eu

script_dir="${0:A:h}"
repo_root="${script_dir:h}"
api_dir="${repo_root}/services/api"
venv_dir="${api_dir}/.venv"
python_command="${PYTHON_BIN:-python3}"

if [[ ! -x "${venv_dir}/bin/python" ]]; then
  "${python_command}" -m venv "${venv_dir}"
fi

"${venv_dir}/bin/python" -m pip install \
  --disable-pip-version-check \
  --quiet \
  -r "${api_dir}/requirements.txt"
"${venv_dir}/bin/python" "${api_dir}/setup_runtime.py"
