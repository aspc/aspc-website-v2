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

The voting platform is designed to store minimal information about individual votes to protect voter privacy. The system ensures that while we track who *has* voted (to prevent double voting), there is no link between a voter's identity and their specific ranking of candidates.

### Vote Storage Mechanism

When a voter submits their ballot, the system executes a secure atomic transaction:

1. **Voter Registration**: The student's record in the `StudentBallotInfo` collection is updated to `hasVoted: true`. This is tied to their email and ensures they cannot vote again.
2. **Anonymous Vote Record**: A new `Vote` document is created in the `Vote` collection. 
   - **No Identifiers**: This document contains the election ID, position, and candidate rankings, but **does not** contain the student's ID, email, or any other identifying information.
   - **Decoupled Documents**: Each position on the ballot is stored as a separate, anonymous `Vote` document.

#### Data Structure

A single vote for a position is stored as:

```json
{
  "electionId": "65f1a...",
  "position": "ASPC President",
  "ranking": [
    "65f1b...", // Candidate A (1st Choice)
    "65f1c...", // Candidate B (2nd Choice)
    "65f1d..."  // Candidate C (3rd Choice)
  ],
  "voterComment": "Optional anonymous feedback"
}
```

### Privacy Benefits

1. **No voter traceability**: Once the transaction completes, there is no technical way to link a specific student to their specific `Vote` documents.
2. **Decoupled data sets**: Voter registration data (who voted) and voting data (what was voted) are stored in separate collections with no foreign key relationship.
3. **Atomic integrity**: The use of database transactions ensures that a vote is either fully recorded and the voter marked as having voted, or the entire operation fails.

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

