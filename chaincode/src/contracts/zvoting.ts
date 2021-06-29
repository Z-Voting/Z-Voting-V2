import {Context, Info, Returns, Transaction} from 'fabric-contract-api';
import {EntityBasedContract} from "./entityBasedContract";
import {Election, ElectionStatus} from "../types/election";
import {extractSubmittingUserOrg, extractSubmittingUserUID} from "../helper/contractHelper";
import {Candidate} from "../types/candidate";
import {JudgeProposal} from "../types/judgeProposal";
import {formatElectionId} from "../helper/ZVotingContractHelper";

@Info({title: 'Z-Voting V2', description: 'Smart contract for Z-Voting V2'})
export class ZVotingContract extends EntityBasedContract {

    // CreateElection creates a new election
    @Transaction()
    public async CreateElection(ctx: Context, electionId: string, name: string): Promise<void> {
        electionId = formatElectionId(electionId);
        await this.checkCreateElectionAccess(ctx, electionId);

        const ownerId = extractSubmittingUserUID(ctx);
        const ownerOrg = extractSubmittingUserOrg(ctx);

        const election = new Election(electionId, name, ElectionStatus.PENDING, ownerId, ownerOrg);

        await this.SaveEntity(ctx, election);
    }

    @Transaction(false)
    public async FindElection(ctx: Context, electionId: string) {
        electionId = formatElectionId(electionId);

        const electionJSON = await this.ReadEntity(ctx, electionId);
        const election: Election = JSON.parse(electionJSON);

        return election;
    }

    @Transaction(false)
    private async GetElections(ctx: Context) {
        let query: any = {};
        query.selector = {};

        query.selector.DocType = 'election';

        return await this.QueryLedger(ctx, JSON.stringify(query));
    }

    // AddCandidate adds a candidate to the election
    @Transaction()
    public async AddCandidate(ctx: Context, name: string, uniqueId: string, electionId: string): Promise<void> {
        electionId = formatElectionId(electionId);

        const election = await this.FindElection(ctx, electionId);
        await this.checkAddCandidateAccess(ctx, election, uniqueId);

        const candidateId = `candidate_${election.ID}_${uniqueId}`;
        const candidate = new Candidate(candidateId, name, uniqueId, election.ID);
        await this.SaveEntity(ctx, candidate);

        this.refreshElectionStatus(election);
        await this.UpdateEntity(ctx, election);
    }

    @Transaction(false)
    @Returns('boolean')
    private async DuplicateCandidateExists(ctx: Context, uniqueId: string, electionId: string) {
        electionId = formatElectionId(electionId);

        let query: any = {};
        query.selector = {};

        query.selector.DocType = 'candidate';
        query.selector.UniqueId = uniqueId;
        query.selector.ElectionId = electionId;

        return await this.QueryResultExists(ctx, JSON.stringify(query));
    }

    @Transaction(false)
    private async GetCandidates(ctx: Context, electionId: string) {
        electionId = formatElectionId(electionId);

        let query: any = {};
        query.selector = {};

        query.selector.DocType = 'candidate';
        query.selector.ElectionId = electionId;

        return await this.QueryLedger(ctx, JSON.stringify(query));
    }

    // AddJudgeProposal adds a judge proposal to the election
    @Transaction()
    public async AddJudgeProposal(ctx: Context, n: string, e: string, electionId: string): Promise<void> {
        electionId = formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        await this.checkAddJudgeProposalAccess(ctx, election);

        const judgeProposal = new JudgeProposal(extractSubmittingUserOrg(ctx), n, e, electionId);
        await this.SaveEntity(ctx, judgeProposal);

        if (ctx.clientIdentity.getMSPID() === ctx.stub.getMspID()) {
            let privateKey = ctx.stub.getTransient().get('privateKey')!.toString();
            let privateKeyId = `judgePrivateKey_${election.ID}_${extractSubmittingUserOrg(ctx)}`

            await this.saveImplicitPrivateData(ctx, privateKeyId, privateKey);
        }
    }

    // StartElection starts an election if it is ready
    @Transaction()
    public async StartElection(ctx: Context, electionId: string): Promise<void> {
        electionId = formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        ZVotingContract.checkStartElectionAccess(ctx, election);

        election.Status = ElectionStatus.RUNNING;
        await this.UpdateEntity(ctx, election);
    }

    private refreshElectionStatus(election: Election) {
        //TODO: If we have enough judges and enough Candidates, change status to ready
        election.Status = ElectionStatus.READY;
    }

    private async checkAddCandidateAccess(ctx: Context, election: Election, uniqueId: string) {
        if (!ctx.clientIdentity.assertAttributeValue("election.creator", "true")) {
            throw new Error(`You must have election creator role to add candidate to an election`);
        }

        const submittingUserUID = extractSubmittingUserUID(ctx);
        if (election.Owner != submittingUserUID) {
            throw new Error(`Only the election owner can add a candidate`);
        }

        if (election.Status == ElectionStatus.RUNNING || election.Status == ElectionStatus.OVER) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more candidates`);
        }

        const duplicateCandidateExists = await this.DuplicateCandidateExists(ctx, uniqueId, election.ID);
        if (duplicateCandidateExists) {
            throw new Error(`Another candidate with UniqueID: ${uniqueId} already exists for this election`);
        }
    }

    private async checkCreateElectionAccess(ctx: Context, electionId: string) {
        electionId = formatElectionId(electionId);

        if (!ctx.clientIdentity.assertAttributeValue("election.creator", "true")) {
            throw new Error(`You must have election creator role to create an election`);
        }

        if (await this.EntityExists(ctx, electionId)) {
            throw new Error(`Election with id: ${electionId} already exists`);
        }
    }

    private static checkStartElectionAccess(ctx: Context, election: Election) {
        if (!ctx.clientIdentity.assertAttributeValue("election.creator", "true")) {
            throw new Error(`You must have election creator role to start an election`);
        }

        const submittingUserUID = extractSubmittingUserUID(ctx);
        if (election.Owner != submittingUserUID) {
            throw new Error(`Only the election owner can start an election`);
        }

        if (election.Status != ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} must be in READY state to start, current state is ${election.Status}`);
        }
    }

    private async checkAddJudgeProposalAccess(ctx: Context, election: Election) {
        //TODO: Add additional checks (private key public key matching etc.)
        if (ctx.stub.getMspID() == ctx.clientIdentity.getMSPID()) {
            if (ctx.stub.getTransient().get('privateKey') == null) {
                throw new Error('You must have valid private key to become a judge');
            }
        }

        const judgeProposalId = `judgeProposal_${election.ID}_${extractSubmittingUserOrg(ctx)}`;
        if (await this.EntityExists(ctx, judgeProposalId)) {
            throw new Error(`Your organization has already sent a judge proposal in the election with id: ${election.ID}`);
        }

        const judgeId = `judge_${election.ID}_${extractSubmittingUserOrg(ctx)}`;
        if (await this.EntityExists(ctx, judgeId)) {
            throw new Error(`Your organization is already a judge in the election with id: ${election.ID}`);
        }

        if (!ctx.clientIdentity.assertAttributeValue("election.judge", "true")) {
            throw new Error(`You must have election judge role to make your organization a judge of this election`);
        }

        if (election.Status != ElectionStatus.PENDING && election.Status != ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more judge proposals`);
        }
    }
}
