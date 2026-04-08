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
 *   - Round-by-round RCV elimination log
 *   - Winner per position
 *   - A markdown results file: election-results-{electionId}.md
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from backend root when script is run via ts-node
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { Election, Candidate, StudentBallotInfo, Vote } from '../models/Voting';

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
    rcvLog: string[];
    rcvWinner?: string;
    rcvTie?: string[];
    runoffUsed?: boolean;
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
 * Instant-runoff (RCV): each round, eliminate the candidate(s) with the
 * fewest votes. When candidates are eliminated, their votes are redistributed
 * to each voter's next remaining choice. Repeat until one candidate has a
 * majority of continuing ballots.
 */
type RunoffResult = string | { tie: string[] } | undefined;

function runInstantRunoff(
    votes: { ranking: mongoose.Types.ObjectId[] }[],
    candidateIds: string[],
    candidateIdToName: Map<string, string>,
    log: (line: string) => void
): RunoffResult {
    if (votes.length === 0 || candidateIds.length === 0) return undefined;

    let active = new Set(candidateIds);
    const voteStack = votes.map((v) =>
        [...v.ranking].map((id) => id.toString())
    );
    let round = 0;

    while (active.size > 1) {
        round += 1;
        const counts = new Map<string, number>();
        for (const id of active) counts.set(id, 0);

        for (const ballot of voteStack) {
            const firstActive = ballot.find((id) => active.has(id));
            if (firstActive) {
                counts.set(firstActive, (counts.get(firstActive) ?? 0) + 1);
            }
        }

        const continuingCount = voteStack.filter((ballot) =>
            ballot.some((id) => active.has(id))
        ).length;
        const sorted = [...active].sort(
            (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
        );
        const majority = Math.floor(continuingCount / 2) + 1;
        const leaderCount = counts.get(sorted[0]) ?? 0;
        const lastCount = counts.get(sorted[sorted.length - 1]) ?? 0;

        log(
            `\n  Round ${round} (${continuingCount} continuing ballots, majority needed: ${majority}):`
        );
        for (const id of sorted) {
            const name = candidateIdToName.get(id) ?? id;
            const voteCount = counts.get(id) ?? 0;
            const pct =
                continuingCount > 0
                    ? ((voteCount / continuingCount) * 100).toFixed(1)
                    : '0.0';
            log(`    ${name}: ${voteCount} votes (${pct}%)`);
        }

        if (leaderCount >= majority) {
            const winnerName = candidateIdToName.get(sorted[0]) ?? sorted[0];
            log(`  → ${winnerName} reaches majority. **WINNER.**`);
            return winnerName;
        }

        const tiedForLast = sorted.filter(
            (id) => (counts.get(id) ?? 0) === lastCount
        );

        // All remaining candidates are tied — true unresolvable tie
        if (tiedForLast.length === active.size) {
            const tieNames = tiedForLast.map(
                (id) => candidateIdToName.get(id) ?? id
            );
            log(
                `  → All remaining candidates tied with ${lastCount} votes each. Tie between: ${tieNames.join(', ')}`
            );
            return { tie: tieNames };
        }

        // Multiple candidates tied for last — eliminate all simultaneously and continue
        if (tiedForLast.length > 1) {
            const tieNames = tiedForLast.map(
                (id) => candidateIdToName.get(id) ?? id
            );
            log(
                `  → Tie for last place: ${tieNames.join(', ')} (${lastCount} votes each). Eliminating all simultaneously.`
            );
            for (const id of tiedForLast) {
                active.delete(id);
            }
            continue;
        }

        // Single last-place candidate — eliminate and redistribute
        const eliminated = sorted[sorted.length - 1];
        const eliminatedName = candidateIdToName.get(eliminated) ?? eliminated;
        const eliminatedCount = counts.get(eliminated) ?? 0;

        const redistribution = new Map<string, number>();
        let exhausted = 0;
        for (const ballot of voteStack) {
            const current = ballot.find((id) => active.has(id));
            if (current !== eliminated) continue;
            const next = ballot.find(
                (id) => active.has(id) && id !== eliminated
            );
            if (next) {
                redistribution.set(next, (redistribution.get(next) ?? 0) + 1);
            } else {
                exhausted++;
            }
        }

        log(
            `  → Eliminate ${eliminatedName} (${eliminatedCount} votes). Redistributing:`
        );
        for (const [id, n] of [...redistribution.entries()].sort(
            (a, b) => b[1] - a[1]
        )) {
            log(`      +${n} → ${candidateIdToName.get(id) ?? id}`);
        }
        if (exhausted > 0) {
            log(
                `      ${exhausted} ballot(s) exhausted (no further ranked candidates).`
            );
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
        const votes = await Vote.find({ electionId, position })
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

        const rcvLog: string[] = [];
        let runoffResult: RunoffResult;
        if (hasFirstChoiceWinner) {
            runoffResult = firstPreference[0]?.candidateName;
        } else {
            runoffResult = runInstantRunoff(
                votes as { ranking: mongoose.Types.ObjectId[] }[],
                candidateIds,
                candidateIdToName,
                (line) => rcvLog.push(line)
            );
        }

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
            rcvLog,
            rcvWinner,
            rcvTie,
            runoffUsed: !hasFirstChoiceWinner,
        });
    }

    // Voter participation stats from StudentBallotInfo
    const ballots = await StudentBallotInfo.find({ electionId }).lean();
    const totalEligible = ballots.length;
    const totalVoted = ballots.filter((b) => b.hasVoted).length;
    const overallRate =
        totalEligible > 0
            ? ((totalVoted / totalEligible) * 100).toFixed(1)
            : '0.0';

    // Group by graduation year
    const byYear = new Map<number, { eligible: number; voted: number }>();
    for (const b of ballots) {
        const entry = byYear.get(b.year) ?? { eligible: 0, voted: 0 };
        entry.eligible += 1;
        if (b.hasVoted) entry.voted += 1;
        byYear.set(b.year, entry);
    }
    const sortedYears = [...byYear.keys()].sort();

    // Build formatted report
    const reportLines: string[] = [];
    const r = (line: string) => reportLines.push(line);

    r('');
    r('# ELECTION RESULTS');
    r('');
    r(`Election: ${election.name}`);
    r(`Election ID: ${electionId}`);
    r(`End date: ${election.endDate}`);
    r('');
    r('---');
    r('');
    r('## VOTER PARTICIPATION');
    r('');
    r(`Total eligible voters: ${totalEligible}`);
    r(`Total voters who voted: ${totalVoted}`);
    r(`Overall turnout: ${overallRate}%`);
    r('');
    r('Turnout by class year:');
    for (const year of sortedYears) {
        const { eligible, voted } = byYear.get(year)!;
        const rate =
            eligible > 0 ? ((voted / eligible) * 100).toFixed(1) : '0.0';
        r(`  Class of ${year}: ${voted}/${eligible} voted (${rate}%)`);
    }
    r('');

    for (const tally of results) {
        r('---');
        r('');
        r(`## **POSITION: ${tally.position.toUpperCase()}**`);
        r('');
        r(`Total votes: ${tally.totalVotes}`);
        r('');
        r('First-preference (plurality) counts:');
        for (const row of tally.firstPreference) {
            r(`  ${row.candidateName}: ${row.firstPreferenceCount}`);
        }
        if (tally.runoffUsed && tally.rcvLog.length > 0) {
            r('');
            r('RCV round-by-round:');
            for (const line of tally.rcvLog) {
                r(line);
            }
        }
        r('');
        if (tally.rcvTie !== undefined && tally.rcvTie.length > 0) {
            r(`**TIE:** ${tally.rcvTie.join(' and ')}`);
        } else if (tally.rcvWinner !== undefined) {
            if (tally.runoffUsed) {
                r(`**WINNER (RCV instant-runoff):** ${tally.rcvWinner}`);
            } else {
                r(`**WINNER (first-preference majority):** ${tally.rcvWinner}`);
            }
        }
        r('');
    }

    r('---');

    // Print report to console and write to file
    for (const line of reportLines) {
        console.log(line);
    }

    const outputPath = path.resolve(
        __dirname,
        `../../election-results-${electionId}.md`
    );
    fs.writeFileSync(outputPath, reportLines.join('\n'), 'utf8');
    console.log(`\nResults written to: ${outputPath}`);
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
