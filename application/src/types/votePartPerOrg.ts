import {EncryptedVotePart} from './encryptedVotePart';

export class VotePartPerOrg {
    public Org: string;
    public EncryptedVoteParts: EncryptedVotePart[];

    constructor(Org: string) {
        this.Org = Org;
        this.EncryptedVoteParts = [];
    }
}
