from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from runtime_config import load_web_environment


class RuntimeEnvironmentTests(unittest.TestCase):
    def test_load_web_environment_reads_local_env_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            env_file = Path(tmpdir) / ".env.local"
            env_file.write_text("ANALYSIS_API_KEY=from-env-file\n", encoding="utf-8")

            with patch("runtime_config._candidate_env_files", return_value=[env_file]):
                with patch.dict(os.environ, {}, clear=True):
                    load_web_environment()
                    self.assertEqual(os.environ["ANALYSIS_API_KEY"], "from-env-file")


if __name__ == "__main__":
    unittest.main()
