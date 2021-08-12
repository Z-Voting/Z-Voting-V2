import {Object, Property} from 'fabric-contract-api';
import {BigInteger} from 'jsbn';
import NodeRSA from 'node-rsa';

@Object()
export class OrgIdentity {
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
        this.DocType = 'orgIdentity';
        this.ID = `orgIdentity_${Org}`;

        this.Org = Org;
        this.N = N;
        this.E = E;
    }

    public getPublicKey() {
        const nHex = new BigInteger(this.N).toString(16);

        const publicKey = new NodeRSA();
        publicKey.importKey({
            n: Buffer.from(nHex, 'hex'),
            e: Number(this.E),
        }, 'components-public');

        return publicKey;
    }
}
