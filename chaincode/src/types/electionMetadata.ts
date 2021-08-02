import {Object, Property} from 'fabric-contract-api';
import {JudgeProposal} from './judgeProposal';

@Object()
export class OrgVoteParts {
    @Property()
    public Org: string;

    @Property('VoteParts', 'number[]')
    public VoteParts: number[];

    constructor(Org: string, VoteParts: number[]) {
        this.Org = Org;
        this.VoteParts = VoteParts;
    }
}

@Object()
export class ElectionMetadata {
    @Property('Judges', 'JudgeProposal[]')
    public Judges?: JudgeProposal[];

    @Property('JudgesPerVotePart', 'string[][]')
    public JudgesPerVotePart?: string[][];

    @Property('VotePartsPerJudge', 'OrgVoteParts[]')
    public VotePartsPerJudge?: OrgVoteParts[];

    @Property()
    public JudgeCount?: number;

    @Property()
    public TrustThreshold?: number;

    @Property()
    public VotePartCount?: number;

    @Property()
    public VotePartCopies?: number;
}
