import {Object, Property} from 'fabric-contract-api';

@Object()
export class JudgeProposal {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Org: string;

    @Property()
    public ElectionId: string;

    constructor(Org: string, ElectionId: string) {
        this.DocType = 'judgeProposal';
        this.ID = `judgeProposal_${ElectionId}_${Org}`;
        this.Org = Org;
        this.ElectionId = ElectionId;
    }

}
