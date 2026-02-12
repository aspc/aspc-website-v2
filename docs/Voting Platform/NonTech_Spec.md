# Voting Platform - Non-Technical Specifications

## System Architecture

### Frontend Applications

The voting platform consists of two separate frontend applications:

1. **End User Frontend**: 
   - Interface for voters to view and cast their votes
   - Displays ballots that the user is eligible to vote on
   - Allows voters to rank candidates for each position

2. **Admin Frontend**:
   - Interface for administrators to manage elections
   - Used to create and configure ballots
   - Manages voter eligibility lists

### Ballot Structure

A ballot consists of:
- **Position**: The office or role being voted on (e.g., "ASPC President", "Class Representative")
- **Candidates**: List of candidates running for the position
- **Eligible Voters**: Specification of who can vote on this ballot

### Voter Eligibility

#### Admin-Provided Voter Information

Administrators provide a list of eligible voters with the following information:
- **Email**: Voter's email address (used for authentication and ballot matching)
- **Year**: Student's class year (e.g., 2024, 2025, 2026, 2027)
- **Building**: Student's residence hall or building

#### Ballot Access Control

The backend determines which ballots a user can vote on using:
- **User's email**: Extracted from the authenticated login session
- **Eligibility matching**: Compares the user's email against the voter eligibility list for each ballot
- **One vote per ballot**: Each eligible voter can only vote once per ballot

#### Example Ballot Configuration

```
Ballot: "2024 Class Representative Election"
Position: "Class Representative"
Candidates: 
  - Alice Johnson
  - Bob Smith
  - Carol Williams
Eligible Voters:
  - Email: student1@pomona.edu, Year: 2024, Building: Clark I
  - Email: student2@pomona.edu, Year: 2024, Building: Harwood
  - Email: student3@pomona.edu, Year: 2024, Building: Oldenborg
  ...
```

When a user logs in with email `student1@mymail.pomona.edu`, the backend:
1. Checks if their email is in the eligible voters list for any active ballots
2. Returns only the ballots where they are eligible to vote
3. Prevents them from voting on ballots where they are not listed

## Privacy-Preserving Vote Storage

### Overview

The voting platform is designed to store minimal information about individual votes to protect voter privacy. Instead of storing who voted for what, the system stores aggregated ranking data.

### Vote Storage Mechanism

For a given position with candidates, voters can rank all candidates in any order. The system stores these rankings as keys and increments their values as new votes come in.

#### Example

For a position with candidates **A**, **B**, and **C**, there are 6 possible ranking permutations:

1. A, B, C
2. A, C, B
3. B, A, C
4. B, C, A
5. C, A, B
6. C, B, A

When a voter submits their ranking, the system:
- Uses the ranking permutation as a key (e.g., "A,B,C" or "B,C,A")
- Increments the counter value for that key
- **Does not store any information linking the vote to the voter**

### Data Structure

The vote data for a position would be stored as:

```
{
  positionId: "position-123",
  rankings: {
    "A,B,C": 15,    // 15 voters ranked A first, B second, C third
    "A,C,B": 8,     // 8 voters ranked A first, C second, B third
    "B,A,C": 13,    // 13 voters ranked B first, A second, C third
    "B,C,A": 5,     // 5 voters ranked B first, C second, A third
    "C,A,B": 10,    // 10 voters ranked C first, A second, B third
    "C,B,A": 7      // 7 voters ranked C first, B second, A third
  },
  totalVotes: 58
}
```

### Privacy Benefits

1. **No voter traceability**: Once a vote is cast, there is no way to determine which specific voter submitted which ranking
2. **Aggregated data only**: The system only stores counts of ranking permutations, not individual vote records
3. **Minimal data retention**: All voting data is stored until the voting period ends, then can be processed and cleared

### Data Retention

- All voting data is stored until the voting period is over
- After the voting period ends, results can be calculated and the raw vote data can be archived or deleted as per policy

### Vote Counting Method

The platform uses **Ranked-choice voting (RCV)**, also known as instant-runoff voting, to determine election winners.

#### How Ranked-Choice Voting Works

1. **Initial Count**: Count first-choice votes for each candidate
2. **Majority Check**: If a candidate receives more than 50% of first-choice votes, they win
3. **Elimination Rounds**: If no majority exists:
   - Eliminate the candidate with the fewest first-choice votes
   - Redistribute votes from eliminated candidates to the next-ranked candidate on each ballot
   - Repeat until a candidate receives a majority

#### Example with Stored Rankings

Using the stored ranking data, RCV calculations work as follows:

**Initial Round:**
- Candidate A: 23 first-choice votes (from "A,B,C": 15 + "A,C,B": 8)
- Candidate B: 18 first-choice votes (from "B,A,C": 13 + "B,C,A": 5)
- Candidate C: 17 first-choice votes (from "C,A,B": 10 + "C,B,A": 7)
- Total: 58 votes, no majority (need 29+)

**Elimination Round 1:**
- Candidate C is eliminated (fewest first-choice votes: 17)
- Votes redistributed from C's rankings:
  - "C,A,B" (10 votes) → go to Candidate A (next choice after C)
  - "C,B,A" (7 votes) → go to Candidate B (next choice after C)
- New totals:
  - Candidate A: 23 + 10 = 33 votes
  - Candidate B: 18 + 7 = 25 votes
  - Total: 58 votes, no majority yet (need 29+)

**Elimination Round 2:**
- Candidate B is eliminated (fewest votes: 25)
- Votes redistributed from B's rankings:
  - "B,A,C" (13 votes) → go to Candidate A (C is eliminated, so A is next)
  - "B,C,A" (5 votes) → go to Candidate A (C is eliminated, so A is next)
- Final totals:
  - Candidate A: 33 + 13 + 5 = 51 votes
  - Candidate A wins with 51 votes (87.9% majority)

