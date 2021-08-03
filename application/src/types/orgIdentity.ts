export class OrgIdentity {

    public DocType: string;

    public ID: string;

    public Org: string;

    public N: string;

    public E: string;

    constructor(Org: string, N: string, E: string) {
        this.DocType = 'identity';
        this.ID = `identity_${Org}`;

        this.Org = Org;
        this.N = N;
        this.E = E;
    }
}
