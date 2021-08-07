import {Object, Property} from 'fabric-contract-api';

@Object()
export class OrgSignature {

    @Property()
    public Org: string;

    @Property()
    public Signature: string;

    constructor(Org: string, Signature: string) {
        this.Org = Org;
        this.Signature = Signature;
    }
}
