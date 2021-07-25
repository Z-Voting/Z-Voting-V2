import {Context} from 'fabric-contract-api';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import {Election, ElectionStatus} from '../types/election';
import {getImplicitPrivateCollection, getSubmittingUserOrg, getSubmittingUserUID} from './contractHelper';
import {EntityBasedContractHelper} from './entityBasedContractHelper';

export class ZVotingContractHelper extends EntityBasedContractHelper {

    public formatElectionId(electionId: string) {
        if (!electionId.startsWith('election')) {
            electionId = `election${electionId}`;
        }

        return electionId;
    }

    public refreshElectionStatus(election: Election) {
        // TODO: If we have enough judges and enough Candidates, change status to ready
        election.Status = ElectionStatus.READY;
    }

    public async checkCreateElectionAccess(ctx: Context, electionId: string) {
        electionId = this.formatElectionId(electionId);

        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to create an election`);
        }

        if (await this.entityExists(ctx, electionId)) {
            throw new Error(`Election with id: ${electionId} already exists`);
        }
    }

    public async duplicateCandidateExists(ctx: Context, uniqueId: string, electionId: string) {
        electionId = this.formatElectionId(electionId);

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'candidate';
        query.selector.UniqueId = uniqueId;
        query.selector.ElectionId = electionId;

        return await this.queryResultExists(ctx, JSON.stringify(query));
    }

    public async checkAddCandidateAccess(ctx: Context, election: Election, uniqueId: string) {
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

        const duplicateCandidateExists = await this.duplicateCandidateExists(ctx, uniqueId, election.ID);
        if (duplicateCandidateExists) {
            throw new Error(`Another candidate with UniqueID: ${uniqueId} already exists for this election`);
        }
    }

    public async checkAddJudgeProposalAccess(ctx: Context, election: Election) {
        const identityId = `identity_${getSubmittingUserOrg(ctx)}`;
        if (!(await this.entityExists(ctx, identityId))) {
            throw new Error(`Your organization hasn't published its public key yet.`);
        }

        const judgeProposalId = `judgeProposal_${election.ID}_${getSubmittingUserOrg(ctx)}`;
        if (await this.entityExists(ctx, judgeProposalId)) {
            throw new Error(`Your organization has already sent a judge proposal in the election with id: ${election.ID}`);
        }

        const judgeId = `judge_${election.ID}_${getSubmittingUserOrg(ctx)}`;
        if (await this.entityExists(ctx, judgeId)) {
            throw new Error(`Your organization is already a judge in the election with id: ${election.ID}`);
        }

        if (!ctx.clientIdentity.assertAttributeValue('election.judge', 'true')) {
            throw new Error(`You must have election judge role to make your organization a judge of this election`);
        }

        if (election.Status !== ElectionStatus.PENDING && election.Status !== ElectionStatus.READY) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more judge proposals`);
        }
    }

    public checkStartElectionAccess(ctx: Context, election: Election) {
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

    public async checkPublishIdentityAccess(ctx: Context, n: string, e: string, privateKeyHash: string) {
        if (ctx.stub.getMspID() === ctx.clientIdentity.getMSPID()) {
            const privateKey = await this.getImplicitPrivateData(ctx, `privateKey_${getSubmittingUserOrg(ctx)}`);

            const key = new NodeRSA(privateKey);
            const components = key.exportKey('components-public');

            const nFromKey = (new BigInteger(components.n.toString('hex'), 16)).toString();
            const eFromKey = components.e.toString();

            if (nFromKey !== n || eFromKey !== e) {
                throw new Error('Private and Public keys don\'t match');
            }

        } else {
            const collection = getImplicitPrivateCollection(ctx, getSubmittingUserOrg(ctx));

            const hash = (await ctx.stub.getPrivateDataHash(collection, `privateKey_${getSubmittingUserOrg(ctx)}`));
            const base64Hash = Buffer.from(hash).toString('base64');

            if (base64Hash !== privateKeyHash) {
                throw new Error(`Hash Mismatch: ${base64Hash} \n ${privateKeyHash}`);
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
