import {Context} from 'fabric-contract-api';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import {Election, ElectionStatus} from '../types/election';
import {JudgeProposal} from '../types/judgeProposal';
import {getImplicitPrivateCollection, getSubmittingUserOrg, getSubmittingUserUID} from './contractHelper';
import {EntityBasedContractHelper} from './entityBasedContractHelper';

export class ZVotingContractHelper extends EntityBasedContractHelper {

    public formatElectionId(electionId: string) {
        if (!electionId.startsWith('election')) {
            electionId = `election${electionId}`;
        }

        return electionId;
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

    public async checkManageCandidateAccess(ctx: Context, election: Election, uniqueId: string) {
        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to add candidate to an election`);
        }

        const submittingUserUID = getSubmittingUserUID(ctx);
        if (election.Owner !== submittingUserUID) {
            throw new Error(`Only the election owner can add a candidate`);
        }

        if (election.Status !== ElectionStatus.PENDING) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more candidates`);
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

        if (election.Status !== ElectionStatus.PENDING) {
            throw new Error(`The election with id: ${election.ID} is not accepting any more judge proposals`);
        }
    }

    public async checkJudgeProposalManagementAccess(ctx: Context, judgeProposal: JudgeProposal, election: Election) {
        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to start an election`);
        }

        const submittingUserUID = getSubmittingUserUID(ctx);
        if (election.Owner !== submittingUserUID) {
            throw new Error(`Only the election owner can start an election`);
        }

        if (election.Status !== ElectionStatus.PENDING) {
            throw new Error(`The election with id: ${election.ID} cannot be modified when state is ${election.Status}`);
        }

        if (!(await this.entityExists(ctx, judgeProposal.ID))) {
            throw new Error(`Judge Proposal with id ${judgeProposal.ID} does not exit`);
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

    public checkMarkElectionAsReadyAccess(ctx: Context, election: Election) {
        if (!ctx.clientIdentity.assertAttributeValue('election.creator', 'true')) {
            throw new Error(`You must have election creator role to mark an election as READY`);
        }

        const submittingUserUID = getSubmittingUserUID(ctx);
        if (election.Owner !== submittingUserUID) {
            throw new Error(`Only the election owner can mark an election as READY`);
        }

        if (election.Status !== ElectionStatus.PENDING) {
            throw new Error(`The election with id: ${election.ID} must be in PENDING state to mark as ready, current state is ${election.Status}`);
        }
    }

    public calculateDistributionScheme(election: Election) {
        const judgeCount = election.Metadata.JudgeCount!;
        const trustThreshold = election.Metadata.TrustThreshold!;

        function combination(n: number, r: number) {
            r = (n - r) < r ? (n - r) : r;

            let result = new BigInteger('1');

            for (let i = 0; i < r; i++) {
                const up = n - i;
                const down = i + 1;

                result = result.multiply(new BigInteger(up.toString()));
                result = result.divide(new BigInteger(down.toString()));
            }

            return result;
        }

        function getJudgesPerVotePart(judges: JudgeProposal[], copies: number) {
            const judgeOrgs = election.Metadata.Judges!.map((judge) => judge.Org);

            const judgesPerVotePart: string[][] = [];
            const judgeCombination: string[] = [];

            const rec = (idx: number, cnt: number) => {
                if (idx === judgeOrgs.length) {
                    if (cnt === copies) {
                        judgesPerVotePart.push([...judgeCombination]);
                    }
                    return;
                }

                rec(idx + 1, cnt);

                judgeCombination.push(judgeOrgs[idx]);
                rec(idx + 1, cnt + 1);
                judgeCombination.pop();
            };

            rec(0, 0);
            return judgesPerVotePart;
        }

        const votePartCopies = judgeCount - trustThreshold + 1;
        election.Metadata.VotePartCopies = votePartCopies;

        const votePartCount = combination(judgeCount, votePartCopies);
        election.Metadata.VotePartCount = Number(votePartCount);

        election.Metadata.JudgesPerVotePart = getJudgesPerVotePart(election.Metadata.Judges, votePartCopies);
    }

    public async checkAddVoterAccess(ctx: Context, election: Election) {

        if(![ElectionStatus.PENDING, ElectionStatus.READY].includes(election.Status)) {
            throw new Error(`You cannot add voter when election status is ${election.Status}`);
        }

        const adminRole = `${getSubmittingUserOrg(ctx)}.admin`;
        if (!ctx.clientIdentity.assertAttributeValue(adminRole, 'true')) {
            throw new Error(`You must be an admin to add voter`);
        }
    }
}
