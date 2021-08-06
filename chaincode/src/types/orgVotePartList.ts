import {Object, Property} from 'fabric-contract-api';

@Object()
export class OrgVotePartList {
    @Property()
    public Org: string;

    @Property('VoteParts', 'number[]')
    public VoteParts: number[];

    constructor(Org: string, VoteParts: number[]) {
        this.Org = Org;
        this.VoteParts = VoteParts;
    }
}
