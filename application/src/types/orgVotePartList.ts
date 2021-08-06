export class OrgVotePartList {

    public Org: string;

    public VoteParts: number[];

    constructor(Org: string, VoteParts: number[]) {
        this.Org = Org;
        this.VoteParts = VoteParts;
    }
}
