import {Object, Property} from 'fabric-contract-api';
import {JudgeProposal} from './judgeProposal';

@Object()
export class ElectionMetadata {
    @Property('Judges', 'JudgeProposal[]')
    public Judges?: JudgeProposal[];

    @Property()
    public JudgeCount?: number;

    @Property()
    public TrustThreshold?: number;

    @Property()
    public VotePartCount?: number;

    @Property()
    public VotePartCopies?: number;

    constructor() {
        this.Judges = [];
    }
}
