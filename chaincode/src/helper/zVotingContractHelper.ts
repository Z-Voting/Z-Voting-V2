import {Context} from 'fabric-contract-api';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';
import {Election, ElectionStatus} from '../types/election';
import {JudgeProposal} from '../types/judgeProposal';
import {OrgVotePartList} from '../types/orgVotePartList';
import {Voter} from '../types/voter';
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

    public async checkManageCandidateAccess(ctx: Context, election: Election) {
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
        const identityId = `orgIdentity_${getSubmittingUserOrg(ctx)}`;
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
        const adminRole = `${getSubmittingUserOrg(ctx)}.admin`;
        if (!ctx.clientIdentity.assertAttributeValue(adminRole, 'true')) {
            throw new Error(`You must be an admin to publish identity`);
        }

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
    }

    public async checkDeleteIdentityAccess(ctx: Context) {
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

            const judgesPerPart: string[][] = [];
            const judgeCombination: string[] = [];

            const rec = (idx: number, cnt: number) => {
                if (idx === judgeOrgs.length) {
                    if (cnt === copies) {
                        judgesPerPart.push([...judgeCombination]);
                    }
                    return;
                }

                rec(idx + 1, cnt);

                judgeCombination.push(judgeOrgs[idx]);
                rec(idx + 1, cnt + 1);
                judgeCombination.pop();
            };

            rec(0, 0);
            return judgesPerPart;
        }

        function getVotePartsPerJudge(judgesPerVotePart: string[][]) {
            const votePartsPerJudge = new Map<string, number[]>();

            judgesPerVotePart.forEach((orgs, index) => {
                orgs.forEach((org) => {
                    if (!votePartsPerJudge.has(org)) {
                        votePartsPerJudge.set(org, []);
                    }

                    votePartsPerJudge.get(org)!.push(index);
                    console.log(org, index);
                });
            });

            return Array.from(votePartsPerJudge.keys())
                .map((org) => new OrgVotePartList(org, votePartsPerJudge.get(org)!));
        }

        const votePartCopies = judgeCount - trustThreshold + 1;
        election.Metadata.VotePartCopies = votePartCopies;

        election.Metadata.VotePartCount = Number(combination(judgeCount, votePartCopies));
        election.Metadata.JudgesPerVotePart = getJudgesPerVotePart(election.Metadata.Judges!, votePartCopies);
        election.Metadata.VotePartsPerJudge = getVotePartsPerJudge(election.Metadata.JudgesPerVotePart);
    }

    public async checkAddVoterAccess(ctx: Context, election: Election) {

        if (![ElectionStatus.PENDING, ElectionStatus.READY].includes(election.Status)) {
            throw new Error(`You cannot add voter when election status is ${election.Status}`);
        }

        const adminRole = `${getSubmittingUserOrg(ctx)}.admin`;
        if (!ctx.clientIdentity.assertAttributeValue(adminRole, 'true')) {
            throw new Error(`You must be an admin to add voter`);
        }
    }

    public async checkAuthRequestAccess(ctx: Context, election: Election) {
        if (ctx.clientIdentity.getAttributeValue('email') === null) {
            throw new Error(`User email is not set`);
        }

        if (!ctx.clientIdentity.assertAttributeValue('election.voter', 'true')) {
            throw new Error(`Voter role is not set for user`);
        }

        const email = ctx.clientIdentity.getAttributeValue('email')!;

        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'voter';
        query.selector.Email = email;
        query.selector.ElectionId = election.ID;

        const voterExists = await this.queryResultExists(ctx, JSON.stringify(query));
        if (!voterExists) {
            throw new Error('Voter does not exist');
        }
    }

    public async getPrivateKey(ctx: Context) {
        const collectionKey = `privateKey_${ctx.stub.getMspID()}`;
        const privateKeyPem = await this.getImplicitPrivateData(ctx, collectionKey);

        return new NodeRSA(privateKeyPem);
    }

    public async getVoters(ctx: Context, election: Election) {
        const query: any = {};
        query.selector = {};

        query.selector.DocType = 'voter';
        query.selector.ElectionId = election.ID;

        const votersData = await this.queryLedger(ctx, JSON.stringify(query));

        console.log('------------------');
        console.log(votersData);
        console.log('------------------');

        return JSON.parse(votersData) as Voter[];
    }
}
