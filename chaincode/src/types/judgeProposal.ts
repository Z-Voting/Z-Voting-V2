import {Object, Property} from "fabric-contract-api";

@Object()
export class JudgeProposal {
    @Property()
    public DocType: string;

    @Property()
    public ID: string;

    @Property()
    public Org: string;

    @Property()
    public N: string;

    @Property()
    public E: string;

    @Property()
    public ElectionId: string;

    constructor(Org: string, N: string, E: string, ElectionId: string) {
        this.DocType = 'judgeProposal';
        this.ID = `judgeProposal_${ElectionId}_${Org}`;

        this.Org = Org;
        this.N = N;
        this.E = E;
        this.ElectionId = ElectionId;
    }

}
