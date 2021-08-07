import {OrgSignature} from './orgSignature';

export class VoteAuthorizationSection {
    public UUID: string;
    public Signatures: OrgSignature[];

    constructor(UUID: string) {
        this.UUID = UUID;
        this.Signatures = [];
    }
}
