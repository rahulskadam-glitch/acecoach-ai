"""AceCoach analysis-engine package.

Model runtimes are intentionally not imported at package import time. This keeps
pure biomechanics and temporal modules independently testable and allows future
pose providers to be swapped behind the pipeline boundary.
"""
