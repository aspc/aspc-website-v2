/**
 * Vote counting script for ranked-choice elections.
 *
 * Usage (from backend directory):
 *   npx ts-node -r dotenv/config src/scripts/countVotes.ts [electionId]
 *
 * If electionId is omitted, tallies the most recent election by endDate.
 *
 * Outputs:
 *   - First-preference (plurality) counts per position
 *   - Optional: instant-runoff (RCV) winner per position
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root when script is run via ts-node
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { Election, Candidate, Vote } from '../models/Voting';

const MONGODB_URI =
    process.env.NODE_ENV === 'development'
        ? process.env.MONGODB_URI
        : process.env.MONGODB_TEST_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI or MONGODB_TEST_URI must be set in .env');
    process.exit(1);
}

interface FirstPreferenceResult {
    candidateId: string;
    candidateName: string;
    firstPreferenceCount: number;
}

interface PositionTally {
    position: string;
    totalVotes: number;
    firstPreference: FirstPreferenceResult[];
    rcvWinner?: string; // winner (from first-preference or after runoff)
    rcvTie?: string[]; // when runoff ends in a tie (e.g. 50–50)
    runoffUsed?: boolean; // true only when instant-runoff was run (no first-choice majority)
}

function countFirstPreference(
    votes: { ranking: mongoose.Types.ObjectId[] }[],
    candidateIdToName: Map<string, string>
): FirstPreferenceResult[] {
    const counts = new Map<string, number>();
    for (const vote of votes) {
        const first = vote.ranking[0];
        if (first) {
            const id = first.toString();
            counts.set(id, (counts.get(id) || 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .map(([candidateId, firstPreferenceCount]) => ({
            candidateId,
            candidateName: candidateIdToName.get(candidateId) ?? '(unknown)',
            firstPreferenceCount,
        }))
        .sort((a, b) => b.firstPreferenceCount - a.firstPreferenceCount);
}

/**
 * Instant-runoff (RCV): each round, eliminate the candidate with the fewest
 * votes. When a candidate is eliminated, their votes are redistributed by
 * looking at who each of those voters wanted as their next choice (second
 * choice if still in the race, otherwise third, etc.) and giving the vote
 * to that candidate. Repeat until one candidate has a majority.
 */
type RunoffResult = string | { tie: string[] } | undefined;

function runInstantRunoff(
    votes: { ranking: mongoose.Types.ObjectId[] }[],
    candidateIds: string[],
    candidateIdToName: Map<string, string>,
    options?: { verbose?: boolean }
): RunoffResult {
    if (votes.length === 0 || candidateIds.length === 0) return undefined;
    const verbose = options?.verbose ?? false;
    let active = new Set(candidateIds);
    const voteStack = votes.map((v) =>
        [...v.ranking].map((id) => id.toString())
    );
    let round = 0;

    while (active.size > 1) {
        round += 1;
        const counts = new Map<string, number>();
        for (const id of active) counts.set(id, 0);

        // Each ballot counts for the first candidate on that ballot who is still in the race.
        // So when we eliminated someone, their voters' ballots now count for that voter's
        // next choice (second choice, or third if second is already eliminated, etc.).
        for (const ballot of voteStack) {
            const firstActive = ballot.find((id) => active.has(id));
            if (firstActive) {
                counts.set(firstActive, (counts.get(firstActive) ?? 0) + 1);
            }
        }

        // #3 fix: use continuing ballots (non-exhausted) for majority threshold
        const continuingCount = voteStack.filter((ballot) =>
            ballot.some((id) => active.has(id))
        ).length;
        const sorted = [...active].sort(
            (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
        );
        const majority = Math.floor(continuingCount / 2) + 1;
        const leaderCount = counts.get(sorted[0]) ?? 0;

        if (verbose) {
            console.log(
                `\n    Round ${round} standings (${continuingCount} continuing ballots, majority = ${majority}):`
            );
            for (const id of sorted) {
                const name = candidateIdToName.get(id) ?? id;
                const voteCount = counts.get(id) ?? 0;
                const pct =
                    continuingCount > 0
                        ? ((voteCount / continuingCount) * 100).toFixed(1)
                        : '0.0';
                console.log(`      ${name}: ${voteCount} votes (${pct}%)`);
            }
        }

        if (leaderCount >= majority) {
            if (verbose) {
                console.log(
                    `    → ${candidateIdToName.get(sorted[0])} reaches majority. Winner.`
                );
            }
            return candidateIdToName.get(sorted[0]) ?? sorted[0];
        }

        const lastCount = counts.get(sorted[sorted.length - 1]) ?? 0;

        // #2 fix: detect multi-way tie for last place
        const tiedForLast = sorted.filter(
            (id) => (counts.get(id) ?? 0) === lastCount
        );

        // If all remaining candidates are tied, report a tie
        if (tiedForLast.length === active.size) {
            if (verbose) {
                console.log(
                    `    → All remaining candidates tied with ${lastCount} votes each. Tie.`
                );
            }
            const tieNames = tiedForLast.map(
                (id) => candidateIdToName.get(id) ?? id
            );
            return { tie: tieNames };
        }

        // If multiple candidates tied for last, report tie among them and stop
        if (tiedForLast.length > 1) {
            if (verbose) {
                console.log(
                    `    → Tie for last place among: ${tiedForLast.map((id) => candidateIdToName.get(id) ?? id).join(', ')} (${lastCount} votes each). Cannot eliminate.`
                );
            }
            const tieNames = tiedForLast.map(
                (id) => candidateIdToName.get(id) ?? id
            );
            return { tie: tieNames };
        }

        const eliminated = sorted[sorted.length - 1];
        const eliminatedName = candidateIdToName.get(eliminated) ?? eliminated;
        const eliminatedCount = counts.get(eliminated) ?? 0;

        // Track where eliminated candidate's votes are redistributed
        if (verbose) {
            const redistribution = new Map<string, number>();
            let exhausted = 0;
            for (const ballot of voteStack) {
                const current = ballot.find((id) => active.has(id));
                if (current !== eliminated) continue;
                // This ballot was counting for the eliminated candidate — find next active choice
                const next = ballot.find(
                    (id) => active.has(id) && id !== eliminated
                );
                if (next) {
                    redistribution.set(
                        next,
                        (redistribution.get(next) ?? 0) + 1
                    );
                } else {
                    exhausted++;
                }
            }
            console.log(
                `    → Eliminate ${eliminatedName} (${eliminatedCount} votes). Redistributing:`
            );
            for (const [id, n] of [...redistribution.entries()].sort(
                (a, b) => b[1] - a[1]
            )) {
                console.log(`      +${n} → ${candidateIdToName.get(id) ?? id}`);
            }
            if (exhausted > 0) {
                console.log(
                    `      ${exhausted} ballot(s) exhausted (no further ranked candidates).`
                );
            }
        }

        active.delete(eliminated);
    }

    const winner = active.values().next().value;
    return winner ? (candidateIdToName.get(winner) ?? winner) : undefined;
}

async function tallyElection(
    electionId: mongoose.Types.ObjectId
): Promise<void> {
    const election = await Election.findById(electionId).lean();
    if (!election) {
        console.error('Election not found:', electionId);
        process.exit(1);
    }

    const candidates = await Candidate.find({ electionId }).lean();
    const positionToCandidates = new Map<
        string,
        { id: string; name: string }[]
    >();
    const candidateIdToName = new Map<string, string>();
    for (const c of candidates) {
        const id = c._id.toString();
        candidateIdToName.set(id, c.name);
        const list = positionToCandidates.get(c.position) ?? [];
        list.push({ id, name: c.name });
        positionToCandidates.set(c.position, list);
    }

    const positions = [...new Set(candidates.map((c) => c.position))];
    const results: PositionTally[] = [];

    for (const position of positions) {
        const votes = await Vote.find({
            electionId,
            position,
        })
            .select('ranking')
            .lean();

        const candidateIds = (positionToCandidates.get(position) ?? []).map(
            (x) => x.id
        );
        const firstPreference = countFirstPreference(
            votes as { ranking: mongoose.Types.ObjectId[] }[],
            candidateIdToName
        );
        const totalVotes = votes.length;
        const majority = totalVotes > 0 ? Math.floor(totalVotes / 2) + 1 : 0;
        const leaderCount = firstPreference[0]?.firstPreferenceCount ?? 0;
        const hasFirstChoiceWinner = totalVotes > 0 && leaderCount >= majority;
        const needsRunoff = !hasFirstChoiceWinner;

        const runoffResult = needsRunoff
            ? runInstantRunoff(
                  votes as { ranking: mongoose.Types.ObjectId[] }[],
                  candidateIds,
                  candidateIdToName,
                  { verbose: true }
              )
            : firstPreference[0]?.candidateName;

        const rcvWinner =
            typeof runoffResult === 'string' ? runoffResult : undefined;
        const rcvTie =
            typeof runoffResult === 'object' &&
            runoffResult !== null &&
            'tie' in runoffResult
                ? runoffResult.tie
                : undefined;

        results.push({
            position,
            totalVotes,
            firstPreference,
            rcvWinner,
            rcvTie,
            runoffUsed: needsRunoff,
        });
    }

    // Print report
    console.log('\n========== ELECTION RESULTS ==========\n');
    console.log('Election:', election.name);
    console.log('Election ID:', electionId);
    console.log('End date:', election.endDate);
    console.log('');

    for (const r of results) {
        console.log('--- Position:', r.position, '---');
        console.log('Total votes:', r.totalVotes);
        console.log('\nFirst-preference (plurality) counts:');
        for (const row of r.firstPreference) {
            console.log(`  ${row.candidateName}: ${row.firstPreferenceCount}`);
        }
        if (r.rcvTie !== undefined && r.rcvTie.length > 0) {
            console.log(
                '\nRCV (instant-runoff): Tie between',
                r.rcvTie.join(' and ')
            );
        } else if (r.rcvWinner !== undefined) {
            if (r.runoffUsed) {
                console.log(
                    '\nRCV (instant-runoff) winner (elimination: last place out, their votes go to each voter’s next choice):',
                    r.rcvWinner
                );
            } else {
                console.log(
                    '\nWinner (first-preference majority):',
                    r.rcvWinner
                );
            }
        }
        console.log('');
    }

    console.log('======================================\n');
}

async function main(): Promise<void> {
    await mongoose.connect(MONGODB_URI!);
    const electionIdArg = process.argv[2];

    try {
        if (electionIdArg) {
            if (!mongoose.Types.ObjectId.isValid(electionIdArg)) {
                console.error('Invalid election ID:', electionIdArg);
                process.exit(1);
            }
            await tallyElection(new mongoose.Types.ObjectId(electionIdArg));
        } else {
            const election = await Election.findOne()
                .sort({ endDate: -1 })
                .lean();
            if (!election) {
                console.error('No elections found in database.');
                process.exit(1);
            }
            console.log(
                'No election ID provided; using most recent by end date:',
                election.name
            );
            await tallyElection(election._id as mongoose.Types.ObjectId);
        }
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
