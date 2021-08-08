import {Object, Property} from 'fabric-contract-api';
import {JudgeProposal} from './judgeProposal';
import {OrgVotePartList} from './orgVotePartList';

@Object()
export class ElectionMetadata {

    @Property()
    public VoteGeneratorPublicKey?: string;

    @Property('Judges', 'JudgeProposal[]')
    public Judges?: JudgeProposal[];

    @Property('JudgesPerVotePart', 'string[][]')
    public JudgesPerVotePart?: string[][];

    @Property('VotePartsPerJudge', 'OrgVotePartList[]')
    public VotePartsPerJudge?: OrgVotePartList[];

    @Property()
    public JudgeCount?: number;

    @Property()
    public TrustThreshold?: number;

    @Property()
    public VotePartCount?: number;

    @Property()
    public VotePartCopies?: number;

    @Property()
    public MPCModulus?: number;
}
