"""Rider-matching engine, ported from ML/Algorithm.

This package contains the deterministic bucket/matching/subsidy logic from
the pickup-matching pipeline, plus the production commit RPC call (voucher
selection/consumption and idempotency happen server-side in Postgres, see
ML/documentation/sql/001_commit_matching_run.sql). Not ported: Connect-merge
with pre-existing DB Connect groups (ML/Algorithm/connect_merge.py) — see
commit.py's docstring.
"""

from .commit import (
    MatchingCommitError,
    MatchingCommitRetryExhausted,
    build_matching_commit_payload,
    commit_matching_run,
)
from .pipeline import MatchResult, run_matching
from .rider import RiderLite, rider_lite_from_input
from .serializer import serialize_result

__all__ = [
    "MatchResult",
    "run_matching",
    "RiderLite",
    "rider_lite_from_input",
    "serialize_result",
    "MatchingCommitError",
    "MatchingCommitRetryExhausted",
    "build_matching_commit_payload",
    "commit_matching_run",
]
