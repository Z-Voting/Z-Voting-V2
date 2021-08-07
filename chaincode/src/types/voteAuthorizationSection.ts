import {Object, Property} from 'fabric-contract-api';
import {OrgSignature} from './orgSignature';

@Object()
export class VoteAuthorizationSection {

    @Property()
    public UUID: string;

    @Property('Signatures', 'OrgSignature[]')
    public Signatures: OrgSignature[];

    constructor(UUID: string) {
        this.UUID = UUID;
        this.Signatures = [];
    }
}
