import {Object, Property} from 'fabric-contract-api';

@Object()
export class Identity {
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

    constructor(Org: string, N: string, E: string) {
        this.DocType = 'identity';
        this.ID = `identity_${Org}`;

        this.Org = Org;
        this.N = N;
        this.E = E;
    }
}
