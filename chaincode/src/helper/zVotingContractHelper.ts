import {Election, ElectionStatus} from '../types/election';

export function formatElectionId(electionId: string) {
    if (!electionId.startsWith('election')) {
        electionId = `election${electionId}`;
    }

    return electionId;
}

export function refreshElectionStatus(election: Election) {
    // TODO: If we have enough judges and enough Candidates, change status to ready
    election.Status = ElectionStatus.READY;
}
