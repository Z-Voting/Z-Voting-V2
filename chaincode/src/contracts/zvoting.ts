import {Context, Info, Returns, Transaction} from 'fabric-contract-api';
import {EntityBasedContract} from "./entityBasedContract";
import {Election, ElectionStatus} from "../types/election";
import {extractSubmittingUserOrg, extractSubmittingUserUID} from "../helper/contractHelper";
import {Candidate} from "../types/candidate";

@Info({title: 'Z-Voting V2', description: 'Smart contract for Z-Voting V2'})
export class ZVotingContract extends EntityBasedContract {

    // CreateElection creates a new election
    @Transaction()
    public async CreateElection(ctx: Context, electionId: string, name: string): Promise<void> {
        this.checkCreateElectionAccess(ctx);

        const ownerId = extractSubmittingUserUID(ctx);
        const ownerOrg = extractSubmittingUserOrg(ctx);
        const election = new Election(electionId, name, ElectionStatus.PENDING, ownerId, ownerOrg);

        await this.SaveEntity(ctx, election);
    }

    // AddCandidate adds a candidate to the election
    @Transaction()
    public async AddCandidate(ctx: Context, candidateId: string, name: string, uniqueId: string, electionId: string): Promise<void> {
        const electionJSON = await this.ReadEntity(ctx, electionId);
        const election: Election = JSON.parse(electionJSON);

        await this.checkAddCandidateAccess(ctx, election, uniqueId);

        const candidate = new Candidate(candidateId, name, uniqueId, electionId);
        await this.SaveEntity(ctx, candidate);

        //TODO: If we have enough judges and enough Candidates, change status to ready
        election.Status = ElectionStatus.READY;
        await this.UpdateEntity(ctx, election);
    }

    @Transaction(false)
    @Returns('boolean')
    private async duplicateCandidateExists(ctx: Context, uniqueId: string, electionId: string) {
        let query: any = {};
        query.selector = {};
        query.selector.DocType = 'candidate';
        query.selector.UniqueId = uniqueId;
        query.selector.ElectionId = electionId;

        return await this.QueryResultExists(ctx, JSON.stringify(query));
    }

    // StartElection starts an election if it is ready
    @Transaction()
    public async StartElection(ctx: Context, electionId: string): Promise<void> {
        const electionJSON = await this.ReadEntity(ctx, electionId);
        const election: Election = JSON.parse(electionJSON);

        this.checkStartElectionAccess(ctx, election);

        election.Status = ElectionStatus.RUNNING;
        await this.UpdateEntity(ctx, election);
    }

    private async checkAddCandidateAccess(ctx: Context, election: Election, uniqueId: string) {
        const submittingUserUID = extractSubmittingUserUID(ctx);
        if (election.Owner != submittingUserUID) {
            throw new Error(`Only the election owner can add a candidate`);
        }

        if (election.Status == ElectionStatus.RUNNING || election.Status == ElectionStatus.OVER) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more candidates`);
        }

        const duplicateCandidateExists = await this.duplicateCandidateExists(ctx, uniqueId, election.ID);
        if (duplicateCandidateExists) {
            throw new Error(`Another candidate with UniqueID: ${uniqueId} already exists for this election`);
        }
    }

    private checkCreateElectionAccess(ctx: Context) {

    }

    private checkStartElectionAccess(ctx: Context, election: Election) {
        const submittingUserUID = extractSubmittingUserUID(ctx);
        if (election.Owner != submittingUserUID) {
            throw new Error(`Only the election owner can start an election`);
        }

        if (election.Status != ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} must be in READY state to start, current state is ${election.Status}`);
        }
    }
}
