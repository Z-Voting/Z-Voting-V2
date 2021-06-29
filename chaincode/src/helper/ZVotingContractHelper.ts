export function formatElectionId(electionId: string) {
    if (!electionId.startsWith('election')) {
        electionId = `election${electionId}`;
    }

    return electionId;
}
