"""Build and commit the atomic production matching payload.

Ported from ML/Algorithm/commit_payload.py. The RPC (commit_matching_run,
security definer, granted only to service_role) is the actual transaction
boundary — it selects/consumes vouchers, inserts Rides/Matches, and updates
Flights.matching_status, all atomically, and is idempotent per run_id (keyed
on a payload hash, see documentation/sql/001_commit_matching_run.sql). This
module only builds and validates the payload client-side before sending it.

Not ported: Connect-merge-with-existing-DB-groups (ML/Algorithm/connect_merge.py).
connect_cleanup_flight_ids is always empty here, so Connect shuttles formed in
one run don't blend with Connect shuttles already sitting in the database from
a previous run — each run's groups stand alone. Safe (no double-matching, no
corruption), just not full parity with the CLI tool's merge behavior.
"""

from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence

from . import config
from .payload import compute_group_time_window, determine_uber_type, match_datetime_from_earliest
from .rider import RiderLite
from .rule_matching import Match
from .subsidy import is_ride_date_covered


class MatchingCommitError(ValueError):
    """Raised when a matching commit payload violates required invariants."""


class MatchingCommitRetryExhausted(RuntimeError):
    """Raised when transient commit failures continue after all retry attempts."""


_TRANSIENT_ERROR_MARKERS = (
    "timeout",
    "timed out",
    "temporarily unavailable",
    "connection reset",
    "connection aborted",
    "connection refused",
    "network",
    "service unavailable",
    "bad gateway",
    "gateway timeout",
    "too many requests",
)

_TRANSIENT_STATUS_CODES = {408, 425, 429, 500, 502, 503, 504}


def _bag_units(riders: Sequence[RiderLite]) -> int:
    num_large_bags = sum(int(r.bags_no_large or 0) for r in riders)
    num_normal_bags = sum(int(r.bags_no or 0) for r in riders)
    bag_units = (num_large_bags * config.LARGE_BAG_MULTIPLIER) + num_normal_bags
    if config.PERSONAL_CONSTRAINT:
        bag_units += sum(int(getattr(r, "bag_no_personal", 0) or 0) for r in riders)
    return bag_units


def cleanup_flight_ids(connect_matches: Sequence[Match]) -> List[int]:
    """Return the flight ids whose existing ride memberships should be replaced."""
    return sorted(
        {
            int(r.flight_id)
            for m in connect_matches
            for r in m.riders
            if r.flight_id is not None
        }
    )


def build_matching_commit_payload(
    *,
    run_id: str,
    matches: Sequence[Match],
    all_riders: Sequence[RiderLite],
    connect_for_cleanup: Sequence[Match] = (),
) -> Dict[str, Any]:
    considered_ids = {int(r.flight_id) for r in all_riders}
    matched_ids = {int(r.flight_id) for m in matches for r in m.riders}
    unmatched_ids = sorted(considered_ids - matched_ids)

    groups: List[Dict[str, Any]] = []
    for m in matches:
        ride_date, match_time = match_datetime_from_earliest(m)
        group_earliest_time, group_latest_time = compute_group_time_window(m.riders)
        ride_type = getattr(m, "ride_type", None)
        group_size = len(m.riders)
        uber_type = ride_type or determine_uber_type(group_size, _bag_units(m.riders))

        ride_date_for_cover = datetime.fromisoformat(m.suggested_time_iso).date()
        to_airport = m.riders[0].to_airport
        write_subsidized = bool(
            getattr(m, "group_subsidy", False)
            and is_ride_date_covered(ride_date_for_cover, to_airport)
        )
        airport = (m.riders[0].airport or "").upper()

        members = []
        for r in m.riders:
            members.append(
                {
                    "user_id": r.user_id,
                    "flight_id": int(r.flight_id),
                    "date": ride_date,
                    "time": match_time,
                    "earliest_time": group_earliest_time,
                    "latest_time": group_latest_time,
                    "source": "ml",
                    "is_verified": False,
                    "is_subsidized": write_subsidized,
                    "uber_type": uber_type,
                }
            )

        groups.append(
            {
                "ride_date": ride_date,
                "ride_type": ride_type,
                "airport": airport,
                "to_airport": to_airport,
                "is_subsidized": write_subsidized,
                "members": members,
            }
        )

    payload = {
        "run_id": run_id,
        "groups": groups,
        "matched_flight_ids": sorted(matched_ids),
        "unmatched_flight_ids": unmatched_ids,
        "connect_cleanup_flight_ids": cleanup_flight_ids(connect_for_cleanup),
    }
    validate_matching_commit_payload(payload)
    return payload


def validate_matching_commit_payload(payload: Dict[str, Any]) -> None:
    """Validate invariants before sending the payload to the transactional RPC."""
    run_id = payload.get("run_id")
    if not run_id:
        raise MatchingCommitError("Matching commit payload requires a run_id.")

    groups = payload.get("groups")
    if not isinstance(groups, list):
        raise MatchingCommitError("Matching commit payload requires a groups list.")

    seen_matched: set[int] = set()
    for group in groups:
        members = group.get("members") if isinstance(group, dict) else None
        if not members:
            raise MatchingCommitError("Matching commit payload contains an empty group.")
        if not group.get("ride_date"):
            raise MatchingCommitError("Matching commit group is missing ride_date.")
        if group.get("airport") in (None, ""):
            raise MatchingCommitError("Matching commit group is missing airport.")
        if "to_airport" not in group:
            raise MatchingCommitError("Matching commit group is missing to_airport.")
        if "is_subsidized" not in group:
            raise MatchingCommitError("Matching commit group is missing is_subsidized.")

        for member in members:
            flight_id = member.get("flight_id")
            if flight_id is None:
                raise MatchingCommitError("Matching commit member is missing flight_id.")
            flight_id = int(flight_id)
            if flight_id in seen_matched:
                raise MatchingCommitError(f"Flight {flight_id} appears in multiple match groups.")
            seen_matched.add(flight_id)

            for field in ("user_id", "date", "time", "earliest_time", "latest_time", "source"):
                if member.get(field) in (None, ""):
                    raise MatchingCommitError(f"Flight {flight_id} is missing required field {field}.")

    unmatched_ids = {int(fid) for fid in payload.get("unmatched_flight_ids", [])}
    overlap = seen_matched & unmatched_ids
    if overlap:
        raise MatchingCommitError(
            f"Flights cannot be both matched and unmatched in the same commit: {sorted(overlap)}"
        )


def is_transient_commit_error(exc: Exception) -> bool:
    """Return True for failures that are reasonable to retry with the same run_id."""
    status = getattr(exc, "status_code", None) or getattr(exc, "status", None)
    try:
        if status is not None and int(status) in _TRANSIENT_STATUS_CODES:
            return True
    except (TypeError, ValueError):
        pass

    code = getattr(exc, "code", None)
    try:
        if code is not None and int(code) in _TRANSIENT_STATUS_CODES:
            return True
    except (TypeError, ValueError):
        pass

    message = str(exc).lower()
    return any(marker in message for marker in _TRANSIENT_ERROR_MARKERS)


def commit_matching_run(
    sb: Any,
    *,
    run_id: str,
    payload: Dict[str, Any],
    max_attempts: int = 3,
    retry_delay_seconds: float = 1.0,
) -> Dict[str, Any]:
    """Call the single transactional production commit RPC."""
    if max_attempts < 1:
        raise ValueError("max_attempts must be at least 1.")

    validate_matching_commit_payload(payload)

    last_exc: Optional[Exception] = None
    for attempt in range(1, max_attempts + 1):
        try:
            resp = sb.rpc(
                "commit_matching_run",
                {
                    "p_run_id": run_id,
                    "p_payload": payload,
                },
            ).execute()
            return resp.data or {}
        except Exception as exc:
            last_exc = exc
            if attempt >= max_attempts or not is_transient_commit_error(exc):
                raise
            time.sleep(retry_delay_seconds * (2 ** (attempt - 1)))

    raise MatchingCommitRetryExhausted(
        f"commit_matching_run failed after {max_attempts} attempts"
    ) from last_exc
