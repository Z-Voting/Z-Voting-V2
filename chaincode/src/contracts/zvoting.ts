import {Context, Info, Returns, Transaction} from 'fabric-contract-api';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import {getSubmittingUserOrg, getSubmittingUserUID} from '../helper/contractHelper';
import {formatElectionId} from '../helper/zVotingContractHelper';
import {Candidate} from '../types/candidate';
import {Election, ElectionStatus} from '../types/election';
import {Identity} from '../types/identity';
import {JudgeProposal} from '../types/judgeProposal';
import {EntityBasedContract} from './entityBasedContract';

@Info({title: 'Z-Voting V2', description: 'Smart contract for Z-Voting V2'})
export class ZVotingContract extends EntityBasedContract {

    private static refreshElectionStatus(election: Election) {
        // TODO: If we have enough judges and enough Candidates, change status to ready
        election.Status = ElectionStatus.READY;
    }

    @Transaction()
    public async PublishIdentity(ctx: Context, n: string, e: string, privateKeyHash: string) {
        await this.checkPublishIdentityAccess(ctx, n, e, privateKeyHash);

        const identity = new Identity(getSubmittingUserOrg(ctx), n, e);
        await this.SaveEntity(ctx, identity);
    }

    @Transaction(false)
    public async FetchIdentity(ctx: Context, org: string) {
        return (await ctx.stub.getState(`identity_${org}`)).toString();
    }

    // CreateElection creates a new election
    @Transaction()
    public async CreateElection(ctx: Context, electionId: string, name: string): Promise<void> {
        electionId = formatElectionId(electionId);
        await this.checkCreateElectionAccess(ctx, electionId);

        const ownerId = getSubmittingUserUID(ctx);
        const ownerOrg = getSubmittingUserOrg(ctx);

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

    // AddCandidate adds a candidate to the election
    @Transaction()
    public async AddCandidate(ctx: Context, name: string, uniqueId: string, electionId: string): Promise<void> {
        electionId = formatElectionId(electionId);

        const election = await this.FindElection(ctx, electionId);
        await this.checkAddCandidateAccess(ctx, election, uniqueId);

        const candidateId = `candidate_${election.ID}_${uniqueId}`;
        const candidate = new Candidate(candidateId, name, uniqueId, election.ID);
        await this.SaveEntity(ctx, candidate);

        ZVotingContract.refreshElectionStatus(election);
        await this.UpdateEntity(ctx, election);
    }

    // AddJudgeProposal adds a judge proposal to the election
    @Transaction()
    public async AddJudgeProposal(ctx: Context, electionId: string): Promise<void> {
        electionId = formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        await this.checkAddJudgeProposalAccess(ctx, election);

        const judgeProposal = new JudgeProposal(getSubmittingUserOrg(ctx), electionId);
        await this.SaveEntity(ctx, judgeProposal);
    }

    // StartElection starts an election if it is ready
    @Transaction()
    public async StartElection(ctx: Context, electionId: string): Promise<void> {
        electionId = formatElectionId(electionId);
        const election = await this.FindElection(ctx, electionId);

        this.checkStartElectionAccess(ctx, election);

        election.Status = ElectionStatus.RUNNING;
        await this.UpdateEntity(ctx, election);
    }

    @Transaction(false)
    private async GetElections(ctx: Context) {
        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'election';

        return await this.QueryLedger(ctx, JSON.stringify(query));
    }

    @Transaction(false)
    @Returns('boolean')
    private async DuplicateCandidateExists(ctx: Context, uniqueId: string, electionId: string) {
        electionId = formatElectionId(electionId);

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'candidate';
        query.selector.UniqueId = uniqueId;
        query.selector.ElectionId = electionId;

        return await this.QueryResultExists(ctx, JSON.stringify(query));
    }

    @Transaction(false)
    private async GetCandidates(ctx: Context, electionId: string) {
        electionId = formatElectionId(electionId);

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'candidate';
        query.selector.ElectionId = electionId;

        return await this.QueryLedger(ctx, JSON.stringify(query));
    }

    private async checkCreateElectionAccess(ctx: Context, electionId: string) {
        electionId = formatElectionId(electionId);

        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to create an election`);
        }

        if (await this.EntityExists(ctx, electionId)) {
            throw new Error(`Election with id: ${electionId} already exists`);
        }
    }

    private async checkAddCandidateAccess(ctx: Context, election: Election, uniqueId: string) {
        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to add candidate to an election`);
        }

        const submittingUserUID = getSubmittingUserUID(ctx);
        if (election.Owner !== submittingUserUID) {
            throw new Error(`Only the election owner can add a candidate`);
        }

        if (election.Status === ElectionStatus.RUNNING || election.Status === ElectionStatus.OVER) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more candidates`);
        }

        const duplicateCandidateExists = await this.DuplicateCandidateExists(ctx, uniqueId, election.ID);
        if (duplicateCandidateExists) {
            throw new Error(`Another candidate with UniqueID: ${uniqueId} already exists for this election`);
        }
    }

    private async checkAddJudgeProposalAccess(ctx: Context, election: Election) {
        const identityId = `identity_${getSubmittingUserOrg(ctx)}`;
        if (!(await this.EntityExists(ctx, identityId))) {
            throw new Error(`Your organization hasn't published its public key yet.`);
        }

        const judgeProposalId = `judgeProposal_${election.ID}_${getSubmittingUserOrg(ctx)}`;
        if (await this.EntityExists(ctx, judgeProposalId)) {
            throw new Error(`Your organization has already sent a judge proposal in the election with id: ${election.ID}`);
        }

        const judgeId = `judge_${election.ID}_${getSubmittingUserOrg(ctx)}`;
        if (await this.EntityExists(ctx, judgeId)) {
            throw new Error(`Your organization is already a judge in the election with id: ${election.ID}`);
        }

        if (!ctx.clientIdentity.assertAttributeValue('election.judge', 'true')) {
            throw new Error(`You must have election judge role to make your organization a judge of this election`);
        }

        if (election.Status !== ElectionStatus.PENDING && election.Status !== ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more judge proposals`);
        }
    }

    private checkStartElectionAccess(ctx: Context, election: Election) {
        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to start an election`);
        }

        const submittingUserUID = getSubmittingUserUID(ctx);
        if (election.Owner !== submittingUserUID) {
            throw new Error(`Only the election owner can start an election`);
        }

        if (election.Status !== ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} must be in READY state to start, current state is ${election.Status}`);
        }
    }

    private async checkPublishIdentityAccess(ctx: Context, n: string, e: string, privateKeyHash: string) {
        if (ctx.stub.getMspID() === ctx.clientIdentity.getMSPID()) {
            const privateKey = await this.GetImplicitPrivateData(ctx, `privateKey_${getSubmittingUserOrg(ctx)}`);

            const key = new NodeRSA(privateKey);
            const components = key.exportKey('components-public');

            const nFromKey = (new BigInteger(components.n.toString('hex'), 16)).toString();
            const eFromKey = components.e.toString();

            if (nFromKey !== n || eFromKey !== e) {
                throw new Error('Private and Public keys don\'t match');
            }

        } else {
            const collection = this.getImplicitPrivateCollection(ctx, getSubmittingUserOrg(ctx));
            const hash = (await ctx.stub.getPrivateDataHash(collection, `privateKey_${getSubmittingUserOrg(ctx)}`)).toString();

            if (hash !== privateKeyHash) {
                throw new Error(`Hash Mismatch: ${hash} \n ${privateKeyHash}`);
            }
        }

        // if (await this.EntityExists(ctx, `identity_${getSubmittingUserOrg(ctx)}`)) {
        //     throw new Error(`Your organization has already published identity`);
        // }

        const adminRole = `${getSubmittingUserOrg(ctx)}.admin`;
        if (!ctx.clientIdentity.assertAttributeValue(adminRole, 'true')) {
            throw new Error(`You must be an admin to publish identity`);
        }
    }
}
