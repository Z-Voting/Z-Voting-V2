import {Context, Info, Returns, Transaction} from 'fabric-contract-api';
import {getSubmittingUserOrg, getSubmittingUserUID} from '../helper/contractHelper';
import {ZVotingContractHelper} from '../helper/zVotingContractHelper';
import {Candidate} from '../types/candidate';
import {Election, ElectionStatus} from '../types/election';
import {Identity} from '../types/identity';
import {JudgeProposal, JudgeProposalStatus} from '../types/judgeProposal';
import {EntityBasedContract} from './entityBasedContract';

@Info({title: 'Z-Voting V2', description: 'Smart contract for Z-Voting V2'})
export class ZVotingContract extends EntityBasedContract {

    protected zVotingHelper: ZVotingContractHelper;

    constructor(name: string) {
        super(name);
        this.zVotingHelper = new ZVotingContractHelper();
    }

    @Transaction()
    public async PublishIdentity(ctx: Context, n: string, e: string, privateKeyHash: string) {
        await this.zVotingHelper.checkPublishIdentityAccess(ctx, n, e, privateKeyHash);

        const identity = new Identity(getSubmittingUserOrg(ctx), n, e);
        await this.zVotingHelper.saveEntity(ctx, identity);
    }

    @Transaction(false)
    public async FetchIdentity(ctx: Context, org: string) {
        return (await ctx.stub.getState(`identity_${org}`)).toString();
    }

    // CreateElection creates a new election
    @Transaction()
    public async CreateElection(ctx: Context, electionId: string, name: string): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        await this.zVotingHelper.checkCreateElectionAccess(ctx, electionId);

        const ownerId = getSubmittingUserUID(ctx);
        const ownerOrg = getSubmittingUserOrg(ctx);

        const election = new Election(electionId, name, ElectionStatus.PENDING, ownerId, ownerOrg);

        await this.zVotingHelper.saveEntity(ctx, election);
    }

    @Transaction(false)
    public async FindElection(ctx: Context, electionId: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const electionJSON = await this.ReadEntity(ctx, electionId);
        const election: Election = JSON.parse(electionJSON);

        return election;
    }

    // AddCandidate adds a candidate to the election
    @Transaction()
    public async AddCandidate(ctx: Context, name: string, uniqueId: string, electionId: string): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const election = await this.FindElection(ctx, electionId);
        await this.zVotingHelper.checkAddCandidateAccess(ctx, election, uniqueId);

        const candidateId = `candidate_${election.ID}_${uniqueId}`;
        const candidate = new Candidate(candidateId, name, uniqueId, election.ID);
        await this.zVotingHelper.saveEntity(ctx, candidate);
    }

    // AddJudgeProposal adds a judge proposal to the election
    @Transaction()
    public async AddJudgeProposal(ctx: Context, electionId: string): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        await this.zVotingHelper.checkAddJudgeProposalAccess(ctx, election);

        const judgeProposal = new JudgeProposal(getSubmittingUserOrg(ctx), electionId);
        await this.zVotingHelper.saveEntity(ctx, judgeProposal);
    }

    // DeclineJudgeProposal declines a judge proposal to the election
    @Transaction()
    public async DeclineJudgeProposal(ctx: Context, judgeProposalId: string): Promise<void> {
        const judgeProposal = JSON.parse(await this.zVotingHelper.readEntity(ctx, judgeProposalId)) as JudgeProposal;
        const election = await this.FindElection(ctx, judgeProposal.ElectionId);

        await this.zVotingHelper.checkJudgeProposalManagementAccess(ctx, judgeProposal, election);

        judgeProposal.Status = JudgeProposalStatus.DECLINED;
        await this.zVotingHelper.updateEntity(ctx, judgeProposal);
    }

    // ApproveJudgeProposal declines a judge proposal to the election
    @Transaction()
    public async ApproveJudgeProposal(ctx: Context, judgeProposalId: string): Promise<void> {
        const judgeProposal = JSON.parse(await this.zVotingHelper.readEntity(ctx, judgeProposalId)) as JudgeProposal;
        const election = await this.FindElection(ctx, judgeProposal.ElectionId);

        await this.zVotingHelper.checkJudgeProposalManagementAccess(ctx, judgeProposal, election);

        judgeProposal.Status = JudgeProposalStatus.APPROVED;
        await this.zVotingHelper.updateEntity(ctx, judgeProposal);
    }

    @Transaction(false)
    public async GetJudgeProposals(ctx: Context, electionId: string): Promise<string> {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'judgeProposal';
        query.selector.ElectionId = electionId;

        return await this.zVotingHelper.queryLedger(ctx, JSON.stringify(query));
    }

    @Transaction(false)
    public async GetJudges(ctx: Context, electionId: string): Promise<string> {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'judgeProposal';
        query.selector.ElectionId = electionId;
        query.selector.Status = JudgeProposalStatus.APPROVED;

        return await this.zVotingHelper.queryLedger(ctx, JSON.stringify(query));
    }

    // MarkElectionAsReady changes the election status to ready
    @Transaction()
    public async MarkElectionAsReady(ctx: Context, electionId: string, trustThreshold: number): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        this.zVotingHelper.checkMarkElectionAsReadyAccess(ctx, election);

        const judgeProposals = JSON.parse(await this.GetJudgeProposals(ctx, electionId)) as JudgeProposal[];

        const pendingJudgeProposals = judgeProposals.filter((proposal) => proposal.Status === JudgeProposalStatus.PENDING);
        const judges = judgeProposals.filter((proposal) => proposal.Status === JudgeProposalStatus.APPROVED);

        for (const proposal of pendingJudgeProposals) {
            proposal.Status = JudgeProposalStatus.DECLINED;
            await this.zVotingHelper.updateEntity(ctx, proposal);
        }

        if (judges.length < trustThreshold) {
            throw new Error(`Currently we have ${judges.length} judges, which cannot be less than trust threshold ${trustThreshold}`);
        }

        election.Metadata.Judges = judges;
        election.Metadata.TrustThreshold = trustThreshold;
        election.Metadata.JudgeCount = judges.length;

        this.zVotingHelper.calculateDistributionScheme(election);

        election.Status = ElectionStatus.READY;
        await this.zVotingHelper.updateEntity(ctx, election);
    }

    // StartElection starts an election if it is ready
    @Transaction()
    public async StartElection(ctx: Context, electionId: string): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        this.zVotingHelper.checkStartElectionAccess(ctx, election);

        election.Status = ElectionStatus.RUNNING;
        await this.zVotingHelper.updateEntity(ctx, election);
    }

    @Transaction(false)
    public async GetElections(ctx: Context) {
        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'election';

        return await this.zVotingHelper.queryLedger(ctx, JSON.stringify(query));
    }

    @Transaction(false)
    @Returns('boolean')
    public async DuplicateCandidateExists(ctx: Context, uniqueId: string, electionId: string) {
        return await this.zVotingHelper.duplicateCandidateExists(ctx, uniqueId, electionId);
    }

    @Transaction(false)
    public async GetCandidates(ctx: Context, electionId: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'candidate';
        query.selector.ElectionId = electionId;

        return await this.zVotingHelper.queryLedger(ctx, JSON.stringify(query));
    }
}
