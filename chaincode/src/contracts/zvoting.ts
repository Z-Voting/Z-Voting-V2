import assert from 'assert';
import {Context, Info, Returns, Transaction} from 'fabric-contract-api';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import {getSubmittingUserOrg, getSubmittingUserUID} from '../helper/contractHelper';
import {ZVotingContractHelper} from '../helper/zVotingContractHelper';
import {Candidate} from '../types/candidate';
import {Election, ElectionStatus} from '../types/election';
import {JudgeProposal, JudgeProposalStatus} from '../types/judgeProposal';
import {OrgIdentity} from '../types/orgIdentity';
import {Vote} from '../types/vote';
import {Voter} from '../types/voter';
import {VoterAuthorization} from '../types/voterAuthorization';
import {VoterAuthRequest} from '../types/voterAuthRequest';
import {EntityBasedContract} from './entityBasedContract';

// tslint:disable-next-line:no-var-requires
const BlindSignature = require('blind-signatures');

@Info({title: 'Z-Voting V2', description: 'Smart contract for Z-Voting V2'})
export class ZVotingContract extends EntityBasedContract {

    protected zVotingHelper: ZVotingContractHelper;
    private ownPrivateKey?: NodeRSA;

    constructor(name: string) {
        super(name);
        this.zVotingHelper = new ZVotingContractHelper();
    }

    @Transaction()
    public async SaveOrgPrivateKey(ctx: Context) {
        const key = `privateKey_${ctx.clientIdentity.getMSPID()}`;

        await this.zVotingHelper.checkSaveOrgPrivateKeyAccess(ctx);

        const data = ctx.stub.getTransient().get('data')!.toString();
        this.ownPrivateKey = new NodeRSA(data);

        await this.SaveImplicitPrivateData(ctx, key);
    }

    @Transaction(false)
    public async GetOrgPrivateKey(ctx: Context) {
        const key = `privateKey_${ctx.clientIdentity.getMSPID()}`;
        return this.GetImplicitPrivateData(ctx, key);
    }

    @Transaction()
    public async PublishIdentity(ctx: Context, n: string, e: string, privateKeyHash: string) {
        await this.zVotingHelper.checkPublishIdentityAccess(ctx, n, e, privateKeyHash);

        const identity = new OrgIdentity(getSubmittingUserOrg(ctx), n, e);
        await this.zVotingHelper.saveEntity(ctx, identity);
    }

    @Transaction()
    public async DeleteIdentity(ctx: Context) {
        await this.zVotingHelper.checkDeleteIdentityAccess(ctx);

        const org = ctx.clientIdentity.getMSPID();
        const identity = JSON.parse(await this.zVotingHelper.readEntityData(ctx, `orgIdentity_${org}`));
        await this.zVotingHelper.deleteEntity(ctx, identity);
    }

    @Transaction(false)
    public async FetchOrgIdentity(ctx: Context, org: string) {
        return JSON.parse((await ctx.stub.getState(`orgIdentity_${org}`)).toString());
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
        await this.zVotingHelper.checkManageCandidateAccess(ctx, election);

        const duplicateCandidateExists = await this.zVotingHelper.duplicateCandidateExists(ctx, uniqueId, election.ID);
        if (duplicateCandidateExists) {
            throw new Error(`Another candidate with UniqueID: ${uniqueId} already exists for this election`);
        }

        const candidateId = `candidate_${election.ID}_${uniqueId}`;
        const candidate = new Candidate(candidateId, name, uniqueId, election.ID);
        await this.zVotingHelper.saveEntity(ctx, candidate);
    }

    // RemoveCandidate removes a candidate from the election
    @Transaction()
    public async RemoveCandidate(ctx: Context, candidateId: string, electionId: string): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const election = await this.FindElection(ctx, electionId);
        const candidate = JSON.parse(await this.zVotingHelper.readEntityData(ctx, candidateId)) as Candidate;

        await this.zVotingHelper.checkManageCandidateAccess(ctx, election);
        await this.zVotingHelper.deleteEntity(ctx, candidate);
    }

    // AddCandidate adds a candidate to the election
    @Transaction()
    public async AddVoter(ctx: Context, name: string, email: string, org: string, electionId: string): Promise<void> {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        const election = await this.FindElection(ctx, electionId);
        await this.zVotingHelper.checkAddVoterAccess(ctx, election);

        const voterId = `voter_${electionId}_${email}`;
        if (await this.zVotingHelper.entityExists(ctx, voterId)) {
            throw new Error(`Voter with email ${email} already exists`);
        }

        const voter = new Voter(name, email, org, electionId);
        await this.zVotingHelper.saveEntity(ctx, voter);
    }

    @Transaction(false)
    public async GetVoters(ctx: Context, electionId: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        return await this.zVotingHelper.getVoters(ctx, election);
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
        const judgeProposal = JSON.parse(await this.zVotingHelper.readEntityData(ctx, judgeProposalId)) as JudgeProposal;
        const election = await this.FindElection(ctx, judgeProposal.ElectionId);

        await this.zVotingHelper.checkJudgeProposalManagementAccess(ctx, judgeProposal, election);

        judgeProposal.Status = JudgeProposalStatus.DECLINED;
        await this.zVotingHelper.updateEntity(ctx, judgeProposal);
    }

    // ApproveJudgeProposal declines a judge proposal to the election
    @Transaction()
    public async ApproveJudgeProposal(ctx: Context, judgeProposalId: string): Promise<void> {
        const judgeProposal = JSON.parse(await this.zVotingHelper.readEntityData(ctx, judgeProposalId)) as JudgeProposal;
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

    // Publish Vote Generator Public Key
    @Transaction()
    public async PublishVoteGeneratorPublicKey(ctx: Context, voteGeneratorPublicKey: string, electionId: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        this.zVotingHelper.checkPublishVoteGeneratorPublicKeyAccess(ctx, election);

        const publicKey = new NodeRSA(voteGeneratorPublicKey);
        assert(publicKey.isPublic(), new Error('Not a valid public key'));

        election.Metadata.VoteGeneratorPublicKey = voteGeneratorPublicKey;
        await this.zVotingHelper.updateEntity(ctx, election);
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
        election.Metadata.N = 1000000007;

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

    @Transaction()
    public async SubmitVoterAuthorizationRequest(ctx: Context, electionId: string, authRequestData: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        await this.zVotingHelper.checkAuthRequestAccess(ctx, election);

        const email = ctx.clientIdentity.getAttributeValue('email')!;

        const authRequest = new VoterAuthRequest(email, electionId, authRequestData);
        await this.zVotingHelper.saveEntity(ctx, authRequest);
    }

    @Transaction(false)
    public async GetVoterAuthorization(ctx: Context, electionId: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        await this.zVotingHelper.checkAuthRequestAccess(ctx, election);

        const email = ctx.clientIdentity.getAttributeValue('email')!;
        const authRequestId = `voterAuthRequest_${electionId}_${email}`;
        const authRequest = await this.zVotingHelper.findEntity<VoterAuthRequest>(ctx, authRequestId);

        const authRequestData = new BigInteger(authRequest.AuthRequestData);

        const orgPrivateKey = await this.zVotingHelper.getPrivateKey(ctx);

        const signedVoterAuthorization = BlindSignature.sign({
            blinded: authRequestData,
            key: orgPrivateKey,
        }) as BigInteger;

        return new VoterAuthorization(ctx.stub.getMspID(), signedVoterAuthorization.toString());
    }

    @Transaction(false)
    public async GetElection(ctx: Context, electionId: string) {
        electionId = this.zVotingHelper.formatElectionId(electionId);

        return await this.zVotingHelper.readEntityData(ctx, electionId);
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

    @Transaction()
    public async SubmitVote(ctx: Context, voteJSON: string) {
        const vote = JSON.parse(voteJSON) as Vote; // Vote.fromJSON(voteJSON);
        vote.DocType = 'vote';
        vote.ID = `vote_${vote.ElectionId}_${vote.Authorization.UUID}`;
        vote.ElectionId = this.zVotingHelper.formatElectionId(vote.ElectionId);

        const election = await this.FindElection(ctx, vote.ElectionId);

        await this.zVotingHelper.checkSubmitVoteAccess(ctx, vote, election);
        await this.zVotingHelper.validateVote(ctx, vote, election, this.ownPrivateKey!);

        await this.zVotingHelper.saveEntity(ctx, vote);
    }
}
